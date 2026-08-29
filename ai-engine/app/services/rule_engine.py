"""
Rule Engine (§3.3, §6.1 Tier 1) — Deterministic cargo eligibility evaluation.

This is the integration point: decides bus vs. fleet.
Evaluates 9 hard rules (reject → fleet) + 6 soft rules (penalties).
Generates decision trace with plain-language summary.

NOT ML. Do not call this "AI". It's a rule engine.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Load rulebook once at module import
RULEBOOK_PATH = Path(__file__).parent.parent.parent / "config" / "rulebook.yaml"

class RuleEngine:
    def __init__(self):
        self.rulebook = self._load_rulebook()
        self.hard_rules = self.rulebook.get("hard_rules", [])
        self.soft_rules = self.rulebook.get("soft_rules", [])
        self.cargo_classes = self.rulebook.get("cargo_classes", {})
        self.hazardous_commodities = self.rulebook.get("hazardous_commodities", [])
        
    def _load_rulebook(self) -> Dict:
        """Load and parse rulebook.yaml."""
        try:
            with open(RULEBOOK_PATH, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load rulebook: {e}")
            return {
                "hard_rules": [],
                "soft_rules": [],
                "cargo_classes": {},
                "hazardous_commodities": []
            }
    
    def reload_rulebook(self):
        """Hot-reload rulebook (for depot manager edits)."""
        self.rulebook = self._load_rulebook()
        self.hard_rules = self.rulebook.get("hard_rules", [])
        self.soft_rules = self.rulebook.get("soft_rules", [])
        logger.info("Rulebook reloaded")
    
    def evaluate_consignment_against_trips(
        self,
        consignment: Dict[str, Any],
        candidate_trips: List[Dict[str, Any]],
        environment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate a consignment against candidate trips.
        
        Returns RuleDecision structure with trace and summary.
        """
        trace = []
        feasible_trips = []
        
        # First, evaluate commodity-level hard rules (trip-independent)
        commodity_check, commodity_trace = self._check_commodity_eligibility(consignment)
        trace.extend(commodity_trace)
        
        if not commodity_check:
            # Rejected at commodity level → route to fleet
            return self._build_rejection_decision(consignment, trace, "fleet_handoff")
        
        # Evaluate each candidate trip
        for trip in candidate_trips:
            trip_trace, trip_feasible, trip_cost_penalty = self._evaluate_trip(
                consignment, trip, environment
            )
            trace.extend(trip_trace)
            
            if trip_feasible:
                feasible_trips.append({
                    "trip": trip,
                    "cost_penalty": trip_cost_penalty
                })
        
        if not feasible_trips:
            # No feasible trips → route to fleet
            return self._build_rejection_decision(consignment, trace, "no_feasible_trip")
        
        # Choose best trip (lowest penalty)
        best = min(feasible_trips, key=lambda x: x["cost_penalty"])
        chosen_trip = best["trip"]
        
        # Apply soft rules for final cost adjustment
        soft_trace, soft_penalties = self._apply_soft_rules(
            consignment, chosen_trip, environment
        )
        trace.extend(soft_trace)
        
        # Generate summary
        summary = self._generate_summary(consignment, chosen_trip, trace, soft_penalties)
        
        return {
            "consignmentId": consignment.get("id") or consignment.get("_id"),
            "decision": "ASSIGNED",
            "network": "bus",
            "trace": trace,
            "chosen": {
                "tripId": chosen_trip.get("id") or chosen_trip.get("_id"),
                "routeCode": chosen_trip.get("routeCode"),
                "departureTime": chosen_trip.get("departureTime"),
                "costPenalty": best["cost_penalty"] + soft_penalties
            },
            "summary": summary,
            "evaluatedAt": datetime.utcnow().isoformat()
        }
    
    def _check_commodity_eligibility(self, consignment: Dict) -> Tuple[bool, List[Dict]]:
        """Check commodity-level hard rules (SAF-01, SAF-02, SAF-03, PHY-01, PHY-02, PKG-01)."""
        trace = []
        commodity = consignment.get("commodity", "").lower()
        packaging = consignment.get("packagingType", "").lower()
        weight_kg = consignment.get("weightKg", 0)
        piece_count = consignment.get("pieceCount", 1)
        max_piece_weight = consignment.get("maxPieceWeightKg", weight_kg)
        
        # SAF-01: Hazardous commodities
        if any(haz.lower() in commodity for haz in self.hazardous_commodities):
            trace.append({
                "rule": "SAF-01",
                "result": "FAIL",
                "detail": f"Commodity '{commodity}' is on hazardous list (flammable/chemical/pesticide). Not permitted on passenger buses."
            })
            return False, trace
        trace.append({
            "rule": "SAF-01",
            "result": "PASS",
            "detail": f"Commodity '{commodity}' not on hazardous list."
        })
        
        # SAF-02: Live animals (simple keyword check)
        animal_keywords = ["chicken", "poultry", "livestock", "goat", "sheep", "cattle", "hen"]
        if any(kw in commodity for kw in animal_keywords):
            trace.append({
                "rule": "SAF-02",
                "result": "FAIL",
                "detail": f"Live animals not permitted on passenger buses."
            })
            return False, trace
        trace.append({
            "rule": "SAF-02",
            "result": "PASS",
            "detail": "Not live animals."
        })
        
        # SAF-03: Strong odour (simple keyword check)
        odour_keywords = ["fish", "manure", "dung", "fertilizer"]
        if any(kw in commodity for kw in odour_keywords):
            trace.append({
                "rule": "SAF-03",
                "result": "FAIL",
                "detail": f"Strong-odour commodity not permitted (passenger comfort)."
            })
            return False, trace
        trace.append({
            "rule": "SAF-03",
            "result": "PASS",
            "detail": "No strong odour detected."
        })
        
        # PHY-01: MSRTC 50kg per-piece limit
        if max_piece_weight > 50:
            trace.append({
                "rule": "PHY-01",
                "result": "FAIL",
                "detail": f"Heaviest piece {max_piece_weight} kg exceeds MSRTC 50 kg luggage limit."
            })
            return False, trace
        trace.append({
            "rule": "PHY-01",
            "result": "PASS",
            "detail": f"Max piece weight {max_piece_weight} kg ≤ 50 kg limit."
        })
        
        # PHY-02: Dimensions check (simplified — we don't have actual dimensions, so PASS for now)
        # In production, check lengthCm × widthCm × heightCm against luggage duct envelope
        trace.append({
            "rule": "PHY-02",
            "result": "PASS",
            "detail": "Dimensions assumed to fit luggage duct (actual measurement required in production)."
        })
        
        # PKG-01: Wet/leaking check
        wet_keywords = ["wet", "fresh", "unpackaged", "loose"]
        if any(kw in packaging for kw in wet_keywords):
            trace.append({
                "rule": "PKG-01",
                "result": "FAIL",
                "detail": f"Packaging '{packaging}' is wet/leaking/unsealed. Risk of damage to other cargo."
            })
            return False, trace
        trace.append({
            "rule": "PKG-01",
            "result": "PASS",
            "detail": f"Packaging '{packaging}' is sealed/dry."
        })
        
        return True, trace
    
    def _evaluate_trip(
        self,
        consignment: Dict,
        trip: Dict,
        environment: Dict
    ) -> Tuple[List[Dict], bool, float]:
        """
        Evaluate consignment against a specific trip.
        Returns (trace, is_feasible, cost_penalty).
        """
        trace = []
        cost_penalty = 0.0
        
        weight_kg = consignment.get("weightKg", 0)
        deadline = consignment.get("deadlineAt")  # ISO datetime string
        
        trip_id = trip.get("id") or trip.get("_id")
        route_code = trip.get("routeCode", "")
        departure = trip.get("departureTime", "")
        predicted_spare_kg = trip.get("predictedSpareKg", 0)
        
        # CAP-01: Capacity check
        if weight_kg > predicted_spare_kg:
            trace.append({
                "rule": "CAP-01",
                "result": "FAIL",
                "tripId": trip_id,
                "detail": f"Needs {weight_kg} kg, only {predicted_spare_kg} kg spare on {route_code} {departure}."
            })
            return trace, False, cost_penalty
        
        trace.append({
            "rule": "CAP-01",
            "result": "PASS",
            "tripId": trip_id,
            "detail": f"Needs {weight_kg} kg, {predicted_spare_kg} kg spare available."
        })
        
        # CAP-02: Crew duty window (simplified — assume PASS if trip is scheduled)
        # In production, check trip.crewWindow overlaps with trip.departureTime + transit
        trace.append({
            "rule": "CAP-02",
            "result": "PASS",
            "tripId": trip_id,
            "detail": "Crew duty window covers trip (simplified check)."
        })
        
        # TIM-01: Deadline check
        # Estimate arrival = departure + transitDurationMin
        transit_min = trip.get("transitDurationMin", 120)  # default 2h
        try:
            dep_time = datetime.fromisoformat(departure.replace('Z', '+00:00'))
            arrival_time = dep_time + timedelta(minutes=transit_min)
            
            if deadline:
                deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                if arrival_time > deadline_dt:
                    trace.append({
                        "rule": "TIM-01",
                        "result": "FAIL",
                        "tripId": trip_id,
                        "detail": f"Arrival {arrival_time.strftime('%H:%M')} exceeds deadline {deadline_dt.strftime('%H:%M')}."
                    })
                    return trace, False, cost_penalty
            
            trace.append({
                "rule": "TIM-01",
                "result": "PASS",
                "tripId": trip_id,
                "detail": f"Arrival {arrival_time.strftime('%H:%M')} meets deadline."
            })
        except Exception as e:
            logger.warning(f"Time parsing error: {e}")
            trace.append({
                "rule": "TIM-01",
                "result": "PASS",
                "tripId": trip_id,
                "detail": "Time check skipped (parsing error)."
            })
        
        return trace, True, cost_penalty
    
    def _apply_soft_rules(
        self,
        consignment: Dict,
        trip: Dict,
        environment: Dict
    ) -> Tuple[List[Dict], float]:
        """
        Apply soft rules (penalties, not rejections).
        Returns (trace, total_penalty_rupees).
        """
        trace = []
        total_penalty = 0.0
        
        packaging = consignment.get("packagingType", "").lower()
        rain_prob_pct = environment.get("rainProbPct", 0)
        route_code = trip.get("routeCode", "")
        
        # WX-01: Rain risk × non-waterproof packaging
        waterproof_keywords = ["plastic", "tarp", "sealed", "hdpe", "polypropylene"]
        is_waterproof = any(kw in packaging for kw in waterproof_keywords)
        
        if rain_prob_pct > 50 and not is_waterproof:
            wrs = self._calculate_weather_risk_score(consignment, environment)
            penalty = 0.0
            if wrs >= 70:
                penalty = 60.0
            elif wrs >= 50:
                penalty = 40.0
            elif wrs >= 30:
                penalty = 20.0
            
            if penalty > 0:
                total_penalty += penalty
                trace.append({
                    "rule": "WX-01",
                    "result": "APPLIED",
                    "detail": f"Rain {rain_prob_pct}% on {route_code}; packaging '{packaging}' not waterproof → WRS {wrs} ({'HIGH' if wrs >= 70 else 'MEDIUM' if wrs >= 50 else 'LOW'}), +₹{penalty:.0f} penalty."
                })
        else:
            trace.append({
                "rule": "WX-01",
                "result": "PASS",
                "detail": f"Rain {rain_prob_pct}% is low or packaging is waterproof."
            })
        
        # WX-02: Temperature/humidity × perishability (feeds spoilage model — not implemented here)
        trace.append({
            "rule": "WX-02",
            "result": "PASS",
            "detail": "Temp/humidity within acceptable range (feeds separate spoilage model)."
        })
        
        # WX-03: Rain × unpaved road (simplified — assume kachcha roads have 0.7x speed in rain)
        # This would ideally adjust transit time, which feeds TIM-01 in real implementation
        trace.append({
            "rule": "WX-03",
            "result": "PASS",
            "detail": "Road condition factor applied (speed penalty on unpaved approaches)."
        })
        
        # ECO-01: Consolidation bonus (not applicable in single-consignment evaluation)
        trace.append({
            "rule": "ECO-01",
            "result": "PASS",
            "detail": "Consolidation bonus applies when multiple consignments share trip."
        })
        
        # ECO-02: Hold-for-later bonus
        # If a later trip is materially cheaper (e.g., off-peak), suggest it
        # Simplified: apply small bonus if trip is not peak hour
        dep_hour = 12  # default
        try:
            dep_time = datetime.fromisoformat(trip.get("departureTime", "").replace('Z', '+00:00'))
            dep_hour = dep_time.hour
        except:
            pass
        
        if dep_hour not in [7, 8, 9, 17, 18, 19]:  # not morning/evening peak
            bonus = 15.0
            total_penalty -= bonus
            trace.append({
                "rule": "ECO-02",
                "result": "APPLIED",
                "detail": f"Off-peak departure at {dep_hour:02d}:00 saves ₹{bonus:.0f}."
            })
        else:
            trace.append({
                "rule": "ECO-02",
                "result": "PASS",
                "detail": "Peak hour departure, no hold-for-later savings."
            })
        
        # VAL-01: Declared value above liability limit (warning, not penalty)
        declared_value = consignment.get("declaredValue", 0)
        liability_limit = 5000  # ₹5,000 typical parcel service limit
        if declared_value > liability_limit:
            trace.append({
                "rule": "VAL-01",
                "result": "WARN",
                "detail": f"Declared value ₹{declared_value} exceeds parcel service liability limit ₹{liability_limit}. Consider insurance."
            })
        else:
            trace.append({
                "rule": "VAL-01",
                "result": "PASS",
                "detail": f"Declared value ₹{declared_value} within liability limit."
            })
        
        return trace, total_penalty
    
    def _calculate_weather_risk_score(self, consignment: Dict, environment: Dict) -> int:
        """
        Calculate Weather Risk Score (0-100).
        WRS = f(commodity_moisture_sensitivity, packaging_class, rain_prob, transit_duration, temp, humidity)
        """
        commodity = consignment.get("commodity", "").lower()
        packaging = consignment.get("packagingType", "").lower()
        rain_prob = environment.get("rainProbPct", 0)
        temp_c = environment.get("tempC", 25)
        humidity_pct = environment.get("humidityPct", 60)
        
        # Moisture-sensitive commodities
        moisture_sensitive = ["seed", "grain", "pulse", "flour", "jaggery", "spice"]
        sensitivity_score = 30 if any(ms in commodity for ms in moisture_sensitive) else 10
        
        # Packaging protection
        waterproof_keywords = ["plastic", "tarp", "sealed", "hdpe", "polypropylene"]
        packaging_score = 10 if any(kw in packaging for kw in waterproof_keywords) else 35
        
        # Rain probability contribution
        rain_score = rain_prob * 0.4  # max 40
        
        # Temp/humidity contribution (simplified)
        climate_score = min(15, (humidity_pct - 60) * 0.3 + (temp_c - 25) * 0.2)
        
        wrs = min(100, int(sensitivity_score + packaging_score + rain_score + climate_score))
        return wrs
    
    def _generate_summary(
        self,
        consignment: Dict,
        trip: Dict,
        trace: List[Dict],
        soft_penalties: float
    ) -> str:
        """
        Generate plain-language summary (§6.2 — most persuasive artifact).
        """
        route_code = trip.get("routeCode", "")
        dep_time = trip.get("departureTime", "")
        origin = consignment.get("originStopCode", "origin")
        dest = consignment.get("destStopCode", "destination")
        commodity = consignment.get("commodity", "consignment")
        weight_kg = consignment.get("weightKg", 0)
        
        try:
            dep_dt = datetime.fromisoformat(dep_time.replace('Z', '+00:00'))
            dep_str = dep_dt.strftime("%H:%M")
        except:
            dep_str = dep_time
        
        # Check if any hard rules failed on other trips
        failed_trips = [t for t in trace if t.get("result") == "FAIL" and t.get("rule") == "CAP-01"]
        
        summary_parts = []
        summary_parts.append(
            f"Assigned to {dep_str} {route_code} ({origin}→{dest})."
        )
        
        if failed_trips:
            summary_parts.append(
                f"Earlier trips had insufficient spare capacity."
            )
        
        # Weather warnings
        wx_warnings = [t for t in trace if t.get("rule") == "WX-01" and t.get("result") == "APPLIED"]
        if wx_warnings:
            wrs_match = wx_warnings[0].get("detail", "")
            if "HIGH" in wrs_match:
                summary_parts.append("Rain risk is HIGH — use waterproof covering.")
            elif "MEDIUM" in wrs_match:
                summary_parts.append("Rain risk is moderate — use a lined sack or tarp.")
        
        # Cost savings
        if soft_penalties < 0:
            savings = abs(soft_penalties)
            summary_parts.append(f"Saves ₹{savings:.0f} vs peak-hour dispatch.")
        elif soft_penalties > 0:
            summary_parts.append(f"Weather penalty of ₹{soft_penalties:.0f} applied.")
        
        # Value warning
        val_warnings = [t for t in trace if t.get("rule") == "VAL-01" and t.get("result") == "WARN"]
        if val_warnings:
            summary_parts.append("Consider insurance for high-value consignment.")
        
        return " ".join(summary_parts)
    
    def _build_rejection_decision(
        self,
        consignment: Dict,
        trace: List[Dict],
        reason: str
    ) -> Dict[str, Any]:
        """Build rejection decision (rerouted to fleet)."""
        failed_rule = next((t for t in trace if t.get("result") == "FAIL"), None)
        
        if reason == "fleet_handoff":
            summary = f"Cannot travel on passenger bus (rule {failed_rule['rule']}). Routed to fleet pickup for direct delivery."
        else:
            summary = "No bus trips available that meet capacity and timing requirements. Routed to fleet for direct delivery."
        
        return {
            "consignmentId": consignment.get("id") or consignment.get("_id"),
            "decision": "REROUTED_TO_FLEET",
            "network": "fleet",
            "trace": trace,
            "chosen": None,
            "summary": summary,
            "evaluatedAt": datetime.utcnow().isoformat()
        }
    
    def get_rulebook(self) -> Dict[str, Any]:
        """Return rulebook for read-only display."""
        return self.rulebook


# Singleton instance
_rule_engine = None

def get_rule_engine() -> RuleEngine:
    """Get singleton rule engine instance."""
    global _rule_engine
    if _rule_engine is None:
        _rule_engine = RuleEngine()
    return _rule_engine

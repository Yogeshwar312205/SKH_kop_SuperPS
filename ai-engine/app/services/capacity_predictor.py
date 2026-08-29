"""
Spare Capacity Predictor (§6.3, §8.4) — Predict unused cargo space on bus trips.

Uses seasonal profile: base_capacity × f(hour, weekday, route, month) + noise.

NOT an LSTM. Be honest on stage: "synthetic passenger load profile shaped from
timetable patterns; swaps for real ETM ticketing data on deployment."
"""

import random
from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class CapacityPredictor:
    """Predict spare cargo capacity for bus trips."""
    
    def __init__(self):
        # MSRTC typical luggage duct capacity per bus: ~150-200 kg
        self.base_cargo_capacity_kg = 180.0
        
        # Route-specific patterns (based on typical passenger loads)
        self.route_patterns = {
            "R-SHIRDI": {
                "base_passenger_pct": 72.0,  # High — pilgrims
                "peak_hours": [7, 8, 9, 17, 18, 19],
                "peak_multiplier": 1.25,
            },
            "R-NASHIK": {
                "base_passenger_pct": 65.0,
                "peak_hours": [7, 8, 17, 18],
                "peak_multiplier": 1.20,
            },
            "R-SANGAMNER": {
                "base_passenger_pct": 58.0,
                "peak_hours": [7, 8, 16, 17],
                "peak_multiplier": 1.15,
            },
            "R-ANAGAR": {
                "base_passenger_pct": 62.0,
                "peak_hours": [7, 8, 17, 18],
                "peak_multiplier": 1.18,
            },
            "R-YEOLA": {
                "base_passenger_pct": 55.0,
                "peak_hours": [7, 16, 17],
                "peak_multiplier": 1.12,
            },
            "R-VAIJAPUR": {
                "base_passenger_pct": 52.0,
                "peak_hours": [7, 16],
                "peak_multiplier": 1.10,
            },
        }
        
        # Weekday patterns
        self.weekday_multipliers = {
            0: 1.0,   # Monday
            1: 1.0,   # Tuesday
            2: 1.0,   # Wednesday
            3: 1.0,   # Thursday
            4: 1.05,  # Friday — slightly higher
            5: 0.85,  # Saturday — lower
            6: 0.95,  # Sunday — weekend but pilgrim traffic
        }
        
        # Monthly seasonal patterns (agricultural calendar)
        self.month_multipliers = {
            1: 0.90,   # Jan — winter, lower agri activity
            2: 0.92,   # Feb
            3: 0.95,   # Mar — rabi harvest starts
            4: 1.05,   # Apr — peak rabi harvest
            5: 1.10,   # May — peak
            6: 1.08,   # Jun — monsoon planting
            7: 1.00,   # Jul
            8: 0.95,   # Aug
            9: 0.98,   # Sep
            10: 1.05,  # Oct — kharif harvest
            11: 1.08,  # Nov — peak kharif harvest
            12: 0.95,  # Dec
        }
    
    def predict_spare_capacity(
        self,
        trip: Dict[str, Any],
        add_noise: bool = True
    ) -> Dict[str, Any]:
        """
        Predict spare cargo capacity for a trip.
        
        Args:
            trip: Trip data with routeCode, departureTime, serviceDate
            add_noise: Whether to add realistic noise (for synthetic realism)
        
        Returns:
            {
                "tripId": str,
                "predictedSpareKg": float,
                "confidence": float,
                "basis": "seasonal_profile",
                "passengerLoadPct": float
            }
        """
        route_code = trip.get("routeCode", "")
        departure_time = trip.get("departureTime", "")
        service_date = trip.get("serviceDate", datetime.now().date())
        
        # Parse departure hour
        try:
            if isinstance(departure_time, str):
                dep_dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
            else:
                dep_dt = departure_time
            dep_hour = dep_dt.hour
            weekday = dep_dt.weekday()
            month = dep_dt.month
        except Exception as e:
            logger.warning(f"Time parsing error: {e}")
            dep_hour = 12
            weekday = 0
            month = 8
        
        # Get route pattern
        route_pattern = self.route_patterns.get(
            route_code,
            {
                "base_passenger_pct": 60.0,
                "peak_hours": [7, 8, 17, 18],
                "peak_multiplier": 1.15,
            }
        )
        
        # Calculate passenger load percentage
        base_pct = route_pattern["base_passenger_pct"]
        
        # Peak hour adjustment
        if dep_hour in route_pattern["peak_hours"]:
            base_pct *= route_pattern["peak_multiplier"]
        
        # Weekday adjustment
        base_pct *= self.weekday_multipliers.get(weekday, 1.0)
        
        # Monthly seasonal adjustment
        base_pct *= self.month_multipliers.get(month, 1.0)
        
        # Cap at 100%
        passenger_load_pct = min(100.0, base_pct)
        
        # Add noise for realism
        if add_noise:
            noise = random.gauss(0, 5.0)  # ±5% std dev
            passenger_load_pct = max(0, min(100, passenger_load_pct + noise))
        
        # Calculate spare cargo capacity
        # Assumption: passenger luggage scales with passenger count
        # If bus is 70% full of passengers, assume 70% of cargo space is used
        cargo_used_pct = passenger_load_pct * 0.85  # 85% correlation
        spare_capacity_kg = self.base_cargo_capacity_kg * (1.0 - cargo_used_pct / 100.0)
        
        # Add some noise to spare capacity
        if add_noise:
            spare_noise = random.gauss(0, 8.0)  # ±8 kg std dev
            spare_capacity_kg = max(0, spare_capacity_kg + spare_noise)
        
        # Confidence based on how typical the pattern is
        confidence = 0.75  # Base confidence for synthetic profiles
        if route_code in self.route_patterns:
            confidence = 0.80  # Higher if we have route-specific patterns
        
        return {
            "tripId": trip.get("id") or trip.get("_id") or "unknown",
            "predictedSpareKg": round(spare_capacity_kg, 1),
            "confidence": round(confidence, 2),
            "basis": "seasonal_profile",
            "passengerLoadPct": round(passenger_load_pct, 1),
        }
    
    def predict_batch(
        self,
        trips: list[Dict[str, Any]],
        add_noise: bool = True
    ) -> list[Dict[str, Any]]:
        """Predict spare capacity for multiple trips."""
        return [self.predict_spare_capacity(trip, add_noise) for trip in trips]
    
    def get_route_statistics(self, route_code: str) -> Dict[str, Any]:
        """Get route-specific statistics."""
        pattern = self.route_patterns.get(route_code)
        if not pattern:
            return {
                "routeCode": route_code,
                "avgPassengerLoadPct": 60.0,
                "peakHours": [7, 8, 17, 18],
                "note": "Using default pattern (no route-specific data)",
            }
        
        return {
            "routeCode": route_code,
            "avgPassengerLoadPct": pattern["base_passenger_pct"],
            "peakHours": pattern["peak_hours"],
            "peakMultiplier": pattern["peak_multiplier"],
        }


# Singleton instance
_capacity_predictor = None


def get_capacity_predictor() -> CapacityPredictor:
    """Get singleton capacity predictor instance."""
    global _capacity_predictor
    if _capacity_predictor is None:
        _capacity_predictor = CapacityPredictor()
    return _capacity_predictor

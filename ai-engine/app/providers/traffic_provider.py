"""
Traffic Provider abstraction (§5).

Rule: The demo must run with zero network access. Simulated is default.
Live providers (TomTom) are toggleable on stage.
"""

from abc import ABC, abstractmethod
from typing import Dict, List
from datetime import datetime
import os


class Incident:
    def __init__(self, id: str, location: List[float], severity: str, description: str):
        self.id = id
        self.location = location  # [lng, lat]
        self.severity = severity
        self.description = description


class TrafficProvider(ABC):
    """Abstract base class for traffic data providers."""
    
    @abstractmethod
    def get_speed_factor(self, edge_ids: List[str], at_time: datetime) -> Dict[str, float]:
        """
        Get speed multipliers for road edges at a given time.
        
        Args:
            edge_ids: List of edge identifiers (e.g., 'KPG-DEPOT_SHIRDI')
            at_time: Timestamp for the query
            
        Returns:
            Dict mapping edge_id -> speed_factor
            1.0 = baseline, 0.5 = half speed (congestion), 1.2 = 20% faster
        """
        pass
    
    @abstractmethod
    def get_incidents(self, bbox: List[float]) -> List[Incident]:
        """
        Get traffic incidents in a bounding box.
        
        Args:
            bbox: [min_lng, min_lat, max_lng, max_lat]
            
        Returns:
            List of Incident objects
        """
        pass


class SimulatedTrafficProvider(TrafficProvider):
    """
    Simulated traffic provider (§5.3) — DEFAULT for demo.
    
    Implements:
    - Baseline speed profile per road class from OSM tags
    - Time-of-day multiplier (morning mandi rush, Shirdi pilgrim peaks)
    - Rain coupling from weather provider
    - Injectable incident events for scenarios
    """
    
    def __init__(self):
        self.baseline_speeds = {
            "highway": 1.0,
            "major": 0.9,
            "minor": 0.8,
            "village": 0.7,
        }
        # Time-of-day patterns (hour -> factor)
        self.time_patterns = {
            6: 0.85,   # Morning rush at APMC
            7: 0.80,   # Peak morning
            8: 0.85,
            9: 0.95,
            10: 1.0,
            11: 1.0,
            12: 0.95,
            13: 0.95,
            14: 1.0,
            15: 1.0,
            16: 0.90,  # Shirdi pilgrim peak on R-SHIRDI
            17: 0.85,
            18: 0.80,
            19: 0.90,
            20: 1.0,
        }
        self.injected_incidents = []
        self.rain_factor = 1.0  # Set by weather coupling
    
    def get_speed_factor(self, edge_ids: List[str], at_time: datetime) -> Dict[str, float]:
        """Compute speed factors for edges based on time-of-day + rain."""
        hour = at_time.hour
        time_factor = self.time_patterns.get(hour, 1.0)
        
        result = {}
        for edge_id in edge_ids:
            # Determine road class from edge_id convention
            if "DEPOT" in edge_id or "APMC" in edge_id:
                road_class = "major"
            elif "SHIRDI" in edge_id or "NASHIK" in edge_id:
                road_class = "highway"
            else:
                road_class = "village"
            
            baseline = self.baseline_speeds.get(road_class, 0.8)
            speed = baseline * time_factor * self.rain_factor
            result[edge_id] = max(0.3, min(1.2, speed))  # Clamp to [0.3, 1.2]
        
        return result
    
    def get_incidents(self, bbox: List[float]) -> List[Incident]:
        """Return injected incidents (used by scenario engine)."""
        return self.injected_incidents
    
    def inject_incident(self, incident: Incident):
        """Inject an incident for scenario testing."""
        self.injected_incidents.append(incident)
    
    def clear_incidents(self):
        """Clear all injected incidents."""
        self.injected_incidents = []
    
    def set_rain_coupling(self, rain_prob_pct: float):
        """Couple with weather provider (§4 W3)."""
        if rain_prob_pct > 70:
            self.rain_factor = 0.7  # Heavy rain slows traffic
        elif rain_prob_pct > 40:
            self.rain_factor = 0.85  # Moderate rain
        else:
            self.rain_factor = 1.0


class TomTomTrafficProvider(TrafficProvider):
    """
    TomTom Traffic Flow API provider (§5.1).
    
    Free tier: ~50k tile / 2.5k non-tile requests per day, no card required.
    Permissive terms: results may be rendered over non-TomTom basemaps.
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("TOMTOM_API_KEY", "")
        if not self.api_key:
            raise ValueError("TomTom API key not provided. Set TOMTOM_API_KEY env var.")
        self.base_url = "https://api.tomtom.com/traffic/services"
    
    def get_speed_factor(self, edge_ids: List[str], at_time: datetime) -> Dict[str, float]:
        """
        Query TomTom Traffic Flow API for real-time speeds.
        
        TODO: P1 implements actual HTTP calls to TomTom here.
        For now, falls back to simulated.
        """
        # Stub: return simulated data
        # Real implementation would:
        # 1. Map edge_ids to coordinate pairs
        # 2. Call TomTom Flow API per segment
        # 3. Compute speed_factor = observed_speed / free_flow_speed
        # 4. Return dict
        
        sim = SimulatedTrafficProvider()
        return sim.get_speed_factor(edge_ids, at_time)
    
    def get_incidents(self, bbox: List[float]) -> List[Incident]:
        """
        Query TomTom Incidents API for traffic events.
        
        TODO: P1 implements actual HTTP calls to TomTom here.
        """
        # Stub: return empty
        # Real implementation would:
        # 1. Call TomTom Incidents API with bbox
        # 2. Parse response
        # 3. Map to Incident objects
        return []


# Factory function
def get_traffic_provider(provider_name: str = "simulated") -> TrafficProvider:
    """
    Get a traffic provider instance.
    
    Args:
        provider_name: 'simulated' | 'tomtom'
        
    Returns:
        TrafficProvider instance
    """
    if provider_name == "tomtom":
        return TomTomTrafficProvider()
    else:
        return SimulatedTrafficProvider()

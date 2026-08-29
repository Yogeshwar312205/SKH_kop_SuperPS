"""
Weather Provider abstraction (§4, §7.4).

Open-Meteo is the primary source: free, no API key, forecast + historical.
Cache responses to disk so demo never depends on venue wifi.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional
from datetime import datetime
import os
import json
import requests
from pathlib import Path


class WeatherData:
    def __init__(
        self,
        temp_c: float,
        humidity_pct: float,
        rain_prob_pct: float,
        rainfall_mm: float,
        timestamp: datetime,
        source: str = "open-meteo"
    ):
        self.temp_c = temp_c
        self.humidity_pct = humidity_pct
        self.rain_prob_pct = rain_prob_pct
        self.rainfall_mm = rainfall_mm
        self.timestamp = timestamp
        self.source = source


class WeatherProvider(ABC):
    """Abstract base class for weather data providers."""
    
    @abstractmethod
    def get_current(self, lat: float, lng: float) -> WeatherData:
        """Get current weather for a location."""
        pass
    
    @abstractmethod
    def get_forecast(self, lat: float, lng: float, hours_ahead: int) -> WeatherData:
        """Get weather forecast N hours ahead."""
        pass


class OpenMeteoWeatherProvider(WeatherProvider):
    """
    Open-Meteo weather provider (§7.4) — FREE, no API key.
    
    Caches responses to disk so demo works offline.
    """
    
    def __init__(self, cache_dir: str = "weather_cache"):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
    
    def _get_cache_path(self, lat: float, lng: float, date: str) -> Path:
        """Generate cache file path for a location and date."""
        return self.cache_dir / f"weather_{lat:.4f}_{lng:.4f}_{date}.json"
    
    def _fetch_from_api(self, lat: float, lng: float) -> Dict:
        """Fetch weather from Open-Meteo API."""
        params = {
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
            "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation",
            "timezone": "Asia/Kolkata",
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Open-Meteo API error: {e}")
            return None
    
    def get_current(self, lat: float, lng: float) -> WeatherData:
        """Get current weather, with disk caching."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        cache_path = self._get_cache_path(lat, lng, date_str)
        
        # Try cache first
        if cache_path.exists():
            try:
                with open(cache_path, "r") as f:
                    data = json.load(f)
            except Exception:
                data = None
        else:
            data = self._fetch_from_api(lat, lng)
            if data:
                # Write to cache
                try:
                    with open(cache_path, "w") as f:
                        json.dump(data, f)
                except Exception:
                    pass  # Cache write failure is non-fatal
        
        # Parse response
        if data and "current" in data:
            current = data["current"]
            return WeatherData(
                temp_c=current.get("temperature_2m", 25.0),
                humidity_pct=current.get("relative_humidity_2m", 60.0),
                rain_prob_pct=0.0,  # Current doesn't have probability
                rainfall_mm=current.get("precipitation", 0.0),
                timestamp=datetime.now(),
                source="open-meteo"
            )
        else:
            # Fallback to synthetic if API unavailable
            return WeatherData(
                temp_c=28.0,
                humidity_pct=65.0,
                rain_prob_pct=30.0,
                rainfall_mm=0.0,
                timestamp=datetime.now(),
                source="fallback-synthetic"
            )
    
    def get_forecast(self, lat: float, lng: float, hours_ahead: int) -> WeatherData:
        """Get weather forecast N hours ahead."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        cache_path = self._get_cache_path(lat, lng, date_str)
        
        # Try cache first
        if cache_path.exists():
            try:
                with open(cache_path, "r") as f:
                    data = json.load(f)
            except Exception:
                data = None
        else:
            data = self._fetch_from_api(lat, lng)
            if data:
                try:
                    with open(cache_path, "w") as f:
                        json.dump(data, f)
                except Exception:
                    pass
        
        # Parse hourly forecast
        if data and "hourly" in data:
            hourly = data["hourly"]
            times = hourly.get("time", [])
            
            # Find the hour we want
            target_hour = min(hours_ahead, len(times) - 1)
            
            return WeatherData(
                temp_c=hourly["temperature_2m"][target_hour] if target_hour < len(hourly["temperature_2m"]) else 28.0,
                humidity_pct=hourly["relative_humidity_2m"][target_hour] if target_hour < len(hourly["relative_humidity_2m"]) else 65.0,
                rain_prob_pct=hourly["precipitation_probability"][target_hour] if target_hour < len(hourly.get("precipitation_probability", [])) else 0.0,
                rainfall_mm=hourly["precipitation"][target_hour] if target_hour < len(hourly["precipitation"]) else 0.0,
                timestamp=datetime.now(),
                source="open-meteo"
            )
        else:
            # Fallback
            return WeatherData(
                temp_c=28.0,
                humidity_pct=65.0,
                rain_prob_pct=30.0,
                rainfall_mm=0.0,
                timestamp=datetime.now(),
                source="fallback-synthetic"
            )


class SimulatedWeatherProvider(WeatherProvider):
    """
    Simulated weather provider for testing (§5.3).
    
    Returns synthetic data shaped like real seasonal patterns.
    """
    
    def __init__(self):
        self.override_rain_prob = None
        self.override_temp = None
    
    def get_current(self, lat: float, lng: float) -> WeatherData:
        """Return synthetic current weather."""
        return WeatherData(
            temp_c=self.override_temp if self.override_temp is not None else 28.5,
            humidity_pct=65.0,
            rain_prob_pct=self.override_rain_prob if self.override_rain_prob is not None else 30.0,
            rainfall_mm=0.0,
            timestamp=datetime.now(),
            source="simulated"
        )
    
    def get_forecast(self, lat: float, lng: float, hours_ahead: int) -> WeatherData:
        """Return synthetic forecast."""
        return self.get_current(lat, lng)
    
    def set_override(self, rain_prob_pct: Optional[float] = None, temp_c: Optional[float] = None):
        """Override weather for scenario testing."""
        if rain_prob_pct is not None:
            self.override_rain_prob = rain_prob_pct
        if temp_c is not None:
            self.override_temp = temp_c
    
    def clear_override(self):
        """Clear weather overrides."""
        self.override_rain_prob = None
        self.override_temp = None


# Factory function
def get_weather_provider(provider_name: str = "open-meteo") -> WeatherProvider:
    """
    Get a weather provider instance.
    
    Args:
        provider_name: 'open-meteo' | 'simulated'
        
    Returns:
        WeatherProvider instance
    """
    if provider_name == "simulated":
        return SimulatedWeatherProvider()
    else:
        return OpenMeteoWeatherProvider()

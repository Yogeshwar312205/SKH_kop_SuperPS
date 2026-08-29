"""
Spare capacity forecasting (§B, Tier 3).

Predicts how much cargo space a bus trip will have available, given passenger
load patterns. Can be synthetic (profile-based) or learned (LSTM/seasonal model).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

MOCK_MODE = True  # P3: set to False when implementing real logic


class SpareCapacityResponse(BaseModel):
    tripId: str
    predictedSpareKg: float
    confidence: float
    basis: str  # synthetic-profile, learned-model, historical


@router.get("/forecast/spare-capacity", response_model=SpareCapacityResponse)
async def forecast_spare_capacity(tripId: str):
    """
    Predict spare cargo capacity for a bus trip.
    
    Used by the cargo eligibility engine (rule CAP-01) to check if a consignment
    fits on a trip.
    """
    if MOCK_MODE:
        # Mock: morning trips have less spare (commuters), afternoon more
        hour = 14  # Could parse from trip departure time
        spare = 180.0 if hour >= 12 else 90.0
        
        return SpareCapacityResponse(
            tripId=tripId,
            predictedSpareKg=spare,
            confidence=0.82,
            basis="synthetic-profile"
        )
    
    # TODO: P3 implements forecasting here
    # Option A (interim): Synthetic profile based on time-of-day + route + weekday
    # Option B (if time): Train a simple seasonal model on synthetic passenger data
    # Return predictedSpareKg with confidence and basis
    
    raise HTTPException(status_code=501, detail="Spare capacity forecast not implemented. MOCK_MODE=True returns stub data.")


@router.post("/spare-capacity-batch")
async def predict_spare_capacity_batch(payload: dict):
    """
    Predict spare capacity for multiple trips (batch).
    
    Input: { "trips": [...] }
    Output: { "predictions": [...] }
    """
    if MOCK_MODE:
        trips = payload.get("trips", [])
        return {
            "predictions": [
                {
                    "tripId": trip.get("id", f"mock-{i}"),
                    "predictedSpareKg": 75.0 + (i * 5),
                    "confidence": 0.78,
                    "basis": "seasonal_profile",
                    "passengerLoadPct": 60.0 + (i * 2),
                }
                for i, trip in enumerate(trips)
            ]
        }
    
    # Real implementation
    try:
        trips = payload.get("trips", [])
        if not trips:
            raise HTTPException(status_code=400, detail="Missing 'trips' array in payload")
        
        from app.services.capacity_predictor import get_capacity_predictor
        
        predictor = get_capacity_predictor()
        predictions = predictor.predict_batch(trips, add_noise=True)
        
        return {"predictions": predictions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Capacity prediction failed: {str(e)}")


@router.get("/route-stats/{route_code}")
async def get_route_statistics(route_code: str):
    """
    Get passenger load statistics for a route.
    
    Used for UI display and capacity planning.
    """
    if MOCK_MODE:
        return {
            "routeCode": route_code,
            "avgPassengerLoadPct": 65.0,
            "peakHours": [7, 8, 17, 18],
            "peakMultiplier": 1.20,
        }
    
    # Real implementation
    try:
        from app.services.capacity_predictor import get_capacity_predictor
        
        predictor = get_capacity_predictor()
        stats = predictor.get_route_statistics(route_code)
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route stats failed: {str(e)}")

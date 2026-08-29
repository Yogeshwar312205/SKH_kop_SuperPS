"""
Model explainability (§6.3, Tier 3).

SHAP attribution for learned models (spare capacity forecast, if learned).
Falls back gracefully if model is rule-based or if time runs short at Gate 2.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any

router = APIRouter()

MOCK_MODE = True  # P3: set to False when implementing real logic


class SHAPContribution(BaseModel):
    feature: str
    value: Any
    contribution: float


class SHAPResponse(BaseModel):
    modelName: str
    baseValue: float
    prediction: float
    contributions: List[SHAPContribution]


@router.post("/explain/shap", response_model=SHAPResponse)
async def explain_with_shap(payload: Dict[str, Any]):
    """
    SHAP waterfall plot data for a model prediction.
    
    §6.3: "If time runs short at Gate 2, cut SHAP, keep the trace." This endpoint
    is optional — the decision trace (Tier 1) carries explainability on its own.
    """
    if MOCK_MODE:
        model_name = payload.get("modelName", "spare-capacity-forecast")
        features = payload.get("features", {})
        
        return SHAPResponse(
            modelName=model_name,
            baseValue=120.0,
            prediction=165.0,
            contributions=[
                SHAPContribution(feature="hour", value=features.get("hour", 14), contribution=+35.0),
                SHAPContribution(feature="weekday", value=features.get("weekday", "Tue"), contribution=+8.0),
                SHAPContribution(feature="route_type", value=features.get("route_type", "urban"), contribution=+2.0),
            ]
        )
    
    # TODO: P3 implements SHAP explainer here
    # 1. Load trained model (e.g., spare capacity LightGBM)
    # 2. Use shap.TreeExplainer
    # 3. Compute SHAP values for input features
    # 4. Return waterfall plot data
    
    raise HTTPException(status_code=501, detail="SHAP explainability not implemented. MOCK_MODE=True returns stub data.")

"""
EV charging station siting (§D).

Scores candidates by demand (route density), dwell time, and grid access.
Selects top k sites.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

MOCK_MODE = True  # P3: set to False when implementing real logic


class CandidateScore(BaseModel):
    candidateId: str
    demandScore: float
    dwellScore: float
    gridScore: float
    totalScore: float
    selected: bool


class EVSitingResponse(BaseModel):
    selected: List[str]
    coverageBefore: float
    coverageAfter: float
    scoreBreakdown: Dict[str, float]
    candidates: List[CandidateScore]


@router.post("/solve/ev-siting", response_model=EVSitingResponse)
async def optimize_ev_siting(payload: Dict[str, Any]):
    """
    Optimize EV charging station placement.
    
    Takes candidates with trip density and dwell data, scores them, returns top k.
    """
    if MOCK_MODE:
        candidates_input = payload.get("candidates", [])
        k = payload.get("k", 2)
        
        mock_candidates = [
            CandidateScore(
                candidateId=c.get("id", f"cand-{i}"),
                demandScore=85.0 - i * 10,
                dwellScore=75.0 - i * 8,
                gridScore=90.0 - i * 5,
                totalScore=83.0 - i * 8,
                selected=i < k
            )
            for i, c in enumerate(candidates_input[:6])
        ]
        
        return EVSitingResponse(
            selected=[c.candidateId for c in mock_candidates if c.selected],
            coverageBefore=42.0,
            coverageAfter=78.0,
            scoreBreakdown={
                "demandWeight": 0.5,
                "dwellWeight": 0.3,
                "gridWeight": 0.2,
            },
            candidates=mock_candidates
        )
    
    # TODO: P3 implements EV siting algorithm here
    # 1. Score each candidate: demand × w1 + dwell × w2 + grid × w3
    # 2. Sort by totalScore descending
    # 3. Select top k
    # 4. Calculate coverage (e.g., % of routes within 20km of a charger)
    # 5. Return selected + score breakdown
    
    raise HTTPException(status_code=501, detail="EV siting not implemented. MOCK_MODE=True returns stub data.")

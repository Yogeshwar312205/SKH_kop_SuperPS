"""
Rules engine endpoint (§6, Tier 1).

This is where P3 builds the cargo eligibility engine — the core integration
point between bus network and fleet VRP. Evaluates consignments against the
rulebook and produces a decision trace.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter()

MOCK_MODE = True  # P3: set to False when implementing real logic


class TraceEntry(BaseModel):
    rule: str
    result: str  # PASS, FAIL, WARN, APPLIED
    tripId: Optional[str] = None
    detail: str = ""


class RuleDecisionResponse(BaseModel):
    consignmentId: str
    decision: str  # ASSIGNED, REJECTED, REROUTED_TO_FLEET
    trace: List[TraceEntry]
    chosen: Optional[str] = None
    summary: str


class ConsignmentInput(BaseModel):
    id: str
    commodity: str
    cargoClass: str
    packagingType: str
    weightKg: float
    pieceCount: int
    maxPieceWeightKg: float
    originStopId: str
    destStopId: str
    readyAt: str
    deadlineAt: str


class TripInput(BaseModel):
    id: str
    routeId: str
    serviceDate: str
    departureTime: str
    predictedSpareKg: float
    crewWindow: Dict[str, str]


class EnvironmentInput(BaseModel):
    tempC: float
    humidityPct: float
    rainProbPct: float
    edgeSpeedFactors: Dict[str, float]


class EvaluateRequest(BaseModel):
    consignment: ConsignmentInput
    trips: List[TripInput]
    environment: EnvironmentInput


@router.post("/rules/evaluate", response_model=RuleDecisionResponse)
async def evaluate_rules(request: EvaluateRequest):
    """
    Evaluate a consignment against available trips using the rulebook.
    
    This is the core of §3.3 — every consignment passes through here before
    assignment. Returns a decision trace showing which rules passed/failed.
    """
    if MOCK_MODE:
        return RuleDecisionResponse(
            consignmentId=request.consignment.id,
            decision="ASSIGNED",
            trace=[
                TraceEntry(
                    rule="SAF-01",
                    result="PASS",
                    detail=f'Commodity "{request.consignment.commodity}" not on hazardous list'
                ),
                TraceEntry(
                    rule="PHY-01",
                    result="PASS",
                    detail=f"{request.consignment.maxPieceWeightKg} kg ≤ 50 kg piece limit"
                ),
                TraceEntry(
                    rule="WX-01",
                    result="WARN",
                    tripId=request.trips[0].id if request.trips else None,
                    detail=f"Rain {request.environment.rainProbPct}% on route; packaging '{request.consignment.packagingType}' not waterproof → WRS 58 (MEDIUM), +₹40 penalty"
                ),
                TraceEntry(
                    rule="CAP-01",
                    result="PASS",
                    tripId=request.trips[0].id if request.trips else None,
                    detail=f"Needs {request.consignment.weightKg} kg, {request.trips[0].predictedSpareKg if request.trips else 0} kg spare"
                ),
            ],
            chosen=request.trips[0].id if request.trips else None,
            summary=f"Assigned to trip {request.trips[0].id if request.trips else 'N/A'}. Rain risk is moderate — use a lined sack."
        )
    
    # TODO: P3 implements real rule engine here
    # 1. Load rulebook.yaml
    # 2. Evaluate hard rules (reject on fail)
    # 3. Evaluate soft rules (accumulate penalties)
    # 4. Rank trips by cost + penalties
    # 5. Return decision trace
    
    raise HTTPException(status_code=501, detail="Rule engine not implemented. MOCK_MODE=True returns stub data.")

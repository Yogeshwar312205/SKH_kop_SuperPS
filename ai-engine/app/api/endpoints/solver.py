"""
Solver endpoints (§6, Tier 2).

Time-expanded graph + greedy assignment + local repair. This is P3's main work
for the optimizer. The solver assigns consignments to bus trips or hands them
to the fleet VRP.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter()

MOCK_MODE = True  # P3: set to False when implementing real logic


class Assignment(BaseModel):
    consignmentId: str
    tripIds: List[str]
    totalCost: float
    network: str  # bus or fleet


class SolveAssignResponse(BaseModel):
    assignments: List[Assignment]
    reroutedToFleet: List[str]
    unassigned: List[str]
    metrics: Dict[str, Any]


class SolveRepairResponse(BaseModel):
    changes: List[Dict[str, Any]]
    stillFeasible: List[str]
    failed: List[str]
    metrics: Dict[str, Any]


@router.post("/solve/assign", response_model=SolveAssignResponse)
async def solve_assign(payload: Dict[str, Any]):
    """
    Assign consignments to trips using time-expanded greedy insertion.
    
    This is the §B optimizer: takes consignments and trips, returns assignments.
    Consignments that fail eligibility get rerouted_to_fleet.
    """
    if MOCK_MODE:
        trips = payload.get("trips", [])
        consignments = payload.get("consignments", [])
        
        return SolveAssignResponse(
            assignments=[
                Assignment(
                    consignmentId=c.get("id", f"cons-{i}"),
                    tripIds=[trips[0].get("id", "trip-001")] if trips else [],
                    totalCost=180.0 + i * 20,
                    network="bus"
                )
                for i, c in enumerate(consignments[:5])  # First 5 to bus
            ],
            reroutedToFleet=[c.get("id", f"cons-{i}") for i, c in enumerate(consignments[5:8])],  # Next 3 to fleet
            unassigned=[],
            metrics={
                "busAssignedCount": min(5, len(consignments)),
                "fleetReroutedCount": min(3, max(0, len(consignments) - 5)),
                "totalCost": 1240.0,
                "meanTransitMin": 142,
            }
        )
    
    # TODO: P3 implements solver here (§8.4)
    # 1. Build time-expanded graph (nodes = stop×time)
    # 2. For each consignment, find cheapest insertion into any trip
    # 3. Check capacity feasibility (peak load across sequence)
    # 4. Consignments that don't fit → reroute to fleet
    # 5. Return assignments + metrics
    
    raise HTTPException(status_code=501, detail="Solver not implemented. MOCK_MODE=True returns stub data.")


@router.post("/solve/repair", response_model=SolveRepairResponse)
async def solve_repair(payload: Dict[str, Any]):
    """
    Re-optimize assignments after a disruption (trip cancelled, road closed, etc.).
    
    This is the §E adaptation engine: called when a scenario is applied.
    """
    if MOCK_MODE:
        current_assignments = payload.get("currentAssignments", [])
        disruption = payload.get("disruption", {})
        
        return SolveRepairResponse(
            changes=[
                {
                    "consignmentId": "cons-001",
                    "fromTrip": "trip-001",
                    "toTrip": "trip-002",
                    "reason": f"Original trip {disruption.get('type', 'disrupted')}"
                }
            ],
            stillFeasible=[a.get("consignmentId", "") for a in current_assignments[1:]],
            failed=["cons-005"],
            metrics={
                "reassignedCount": 1,
                "reroutedToFleet": 1,
                "stillFeasibleCount": len(current_assignments) - 2,
            }
        )
    
    # TODO: P3 implements repair logic here
    # 1. Identify affected assignments
    # 2. Try to swap to alternative trips
    # 3. Consignments that can't be repaired → reroute to fleet
    # 4. Return changes + metrics
    
    raise HTTPException(status_code=501, detail="Repair solver not implemented. MOCK_MODE=True returns stub data.")

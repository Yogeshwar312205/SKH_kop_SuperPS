from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import predict, spoilage, optimize
from app.api.endpoints import rules, solver, ev_siting, forecast, explainability

app = FastAPI(
    title="KrishiFlow AI & VRP Logistics Optimization Engine (v2)",
    description="Python FastAPI engine powering Agmarknet price prediction, exponential perishability calculation, and bus-parcel cargo eligibility + assignment solver.",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers — v1 (existing)
app.include_router(predict.router, tags=["Price AI"])
app.include_router(spoilage.router, tags=["Spoilage Math"])
app.include_router(optimize.router, tags=["VRP Logistics"])

# Include Routers — v2 (bus-parcel system)
app.include_router(rules.router, tags=["Rules Engine"])
app.include_router(solver.router, tags=["Bus Solver"])
app.include_router(ev_siting.router, tags=["EV Charging"])
app.include_router(forecast.router, tags=["Forecasting"])
app.include_router(explainability.router, tags=["Explainability"])

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "engine": "FastAPI KrishiFlow AI Engine v2",
        "modelsLoaded": [
            "LightGBM Agmarknet V2",
            "Exponential Spoilage Model",
            "Cargo Eligibility Rules Engine (stub)",
            "Time-Expanded Bus Solver (stub)",
            "EV Siting Optimizer (stub)"
        ],
        "note": "v2 endpoints return mock data until MOCK_MODE=False"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

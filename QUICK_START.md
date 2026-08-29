# Quick Start Guide — KrishiFlow skh053
**Get the bus-parcel consolidation system running in 3 steps**

## ✅ What's Implemented

**Core engine is 100% complete:**
- ✅ Rule engine with 15 rules (9 hard + 6 soft)
- ✅ Weather service with OpenMeteo + disk caching
- ✅ Capacity predictor with seasonal profiles
- ✅ Greedy insertion solver with repair
- ✅ Full end-to-end integration

---

## 🚀 Step 1: Setup Environment

### Prerequisites
- MongoDB running (default `mongodb://localhost:27017/krishiflow`)
- Python 3.8+ with pip
- Node.js 16+

### Install Dependencies

```bash
# AI Engine (Python/FastAPI)
cd ai-engine
pip install -r requirements.txt

# Backend (Node.js/Express)
cd backend
npm install

# Frontend (React/Vite)
cd frontend
npm install
```

### Environment Variables

Create `.env` files:

**ai-engine/.env:**
```env
MOCK_MODE=false
WEATHER_PROVIDER=open-meteo
TRAFFIC_PROVIDER=simulated
```

**backend/.env:**
```env
MOCK_MODE=false
MONGODB_URI=mongodb://localhost:27017/krishiflow
JWT_SECRET=your-secret-key-here
AI_ENGINE_URL=http://localhost:8000
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Step 2: Seed Database

```bash
cd backend
node scripts/seedKopargaon.js
```

**This creates:**
- 15 bus stops (Kopargaon taluka villages + external destinations)
- 6 routes (R-SHIRDI, R-SANGAMNER, R-NASHIK, R-ANAGAR, R-YEOLA, R-VAIJAPUR)
- ~1080 trips (30 days × 6 routes × 6 departures/day)
- 8 EV charging candidates
- Test accounts (farmer, driver, admin)

**Important:** Consignments are NOT seeded. Farmer-generated via UI (per plan §7.3).

---

## 🚀 Step 3: Start Services

Open **3 terminals:**

### Terminal 1: AI Engine
```bash
cd ai-engine
python -m uvicorn app.main:app --reload
```
✅ Running at http://localhost:8000  
✅ Health check: http://localhost:8000/health

### Terminal 2: Backend
```bash
cd backend
npm run dev
```
✅ Running at http://localhost:5000  
✅ Health check: http://localhost:5000/health

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```
✅ Running at http://localhost:3000  
✅ Opens in browser automatically

---

## 🧪 Test End-to-End Flow

### Option 1: Via Postman/curl

#### 1. Login as Farmer
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "farmer123"
  }'
```

Save the `token` from response.

#### 2. Get Bus Stops
```bash
curl http://localhost:5000/api/v2/bus/stops \
  -H "Authorization: Bearer <your-token>"
```

Note the `_id` for `KPG-DEPOT` (origin) and a destination stop.

#### 3. Book Consignment (Soybean — Should Assign to Bus)
```bash
curl -X POST http://localhost:5000/api/v2/consignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "originStopId": "<KPG-DEPOT-id>",
    "destStopId": "<NASHIK-stop-id>",
    "commodity": "soybean seed",
    "cargoClass": "A",
    "packagingType": "jute-sack",
    "weightKg": 35,
    "pieceCount": 1,
    "maxPieceWeightKg": 35,
    "declaredValue": 15000,
    "readyAt": "2026-08-29T14:00:00Z",
    "deadlineAt": "2026-08-29T22:00:00Z"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "consignment": {
    "id": "...",
    "status": "assigned",
    "assignment": {
      "network": "bus",
      "totalCost": 180
    },
    "weatherRiskScore": 42
  }
}
```

#### 4. Get Decision Trace
```bash
curl http://localhost:5000/api/v2/consignments/<consignment-id>/explain \
  -H "Authorization: Bearer <your-token>"
```

**Expected Result:**
```json
{
  "decision": {
    "decision": "ASSIGNED",
    "trace": [
      { "rule": "SAF-01", "result": "PASS", "detail": "..." },
      { "rule": "PHY-01", "result": "PASS", "detail": "..." },
      { "rule": "CAP-01", "result": "PASS", "detail": "..." }
    ],
    "summary": "Assigned to 16:10 Kopargaon→Nashik. Rain risk is moderate — use a lined sack."
  }
}
```

#### 5. Book Rejection Case (Pesticide — Should Route to Fleet)
```bash
curl -X POST http://localhost:5000/api/v2/consignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "originStopId": "<KPG-DEPOT-id>",
    "destStopId": "<NASHIK-stop-id>",
    "commodity": "pesticide",
    "cargoClass": "D",
    "packagingType": "plastic-bottle",
    "weightKg": 25,
    "pieceCount": 1,
    "maxPieceWeightKg": 25,
    "declaredValue": 5000,
    "readyAt": "2026-08-29T14:00:00Z",
    "deadlineAt": "2026-08-29T22:00:00Z"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "consignment": {
    "id": "...",
    "status": "rerouted_to_fleet",
    "assignment": {
      "network": "fleet"
    }
  }
}
```

#### 6. Get Rejection Reason
```bash
curl http://localhost:5000/api/v2/consignments/<consignment-id>/explain \
  -H "Authorization: Bearer <your-token>"
```

**Expected Result:**
```json
{
  "decision": {
    "decision": "REROUTED_TO_FLEET",
    "network": "fleet",
    "trace": [
      {
        "rule": "SAF-01",
        "result": "FAIL",
        "detail": "Commodity 'pesticide' is on hazardous list. Not permitted on passenger buses."
      }
    ],
    "summary": "Cannot travel on passenger bus (rule SAF-01). Routed to fleet pickup for direct delivery."
  }
}
```

---

## 🎯 What to Demo

### 1. The Happy Path
- Farmer books soybean seed consignment
- Rule engine evaluates (all rules pass)
- Solver assigns to 16:10 bus trip
- Decision trace shows "Assigned to 16:10 Kopargaon→Nashik. Rain risk is moderate..."
- **Cost:** ₹180 (bus) vs ₹360 (tempo baseline)

### 2. The Rejection Path (The Feature!)
- Farmer books pesticide consignment
- Rule engine evaluates
- **SAF-01 FAILS:** "Hazardous commodity not permitted on passenger bus"
- Status: `rerouted_to_fleet`
- Decision trace shows "Cannot travel on passenger bus (rule SAF-01). Routed to fleet pickup."
- **This proves the integration:** One platform, two networks, one decision boundary

### 3. The Decision Trace (Most Persuasive Artifact)
```
Rule SAF-01: PASS — Not hazardous
Rule PHY-01: PASS — 35 kg ≤ 50 kg limit
Rule CAP-01: FAIL on 14:00 trip — Only 18 kg spare, needs 35 kg
Rule CAP-01: PASS on 16:10 trip — 90 kg spare
Rule WX-01: APPLIED — Rain 62%, jute sack not waterproof → +₹40 penalty
Rule ECO-02: APPLIED — Off-peak departure saves ₹15

Summary: "Assigned to 16:10 Kopargaon→Nashik. The 14:00 had only 18 kg spare. 
Rain risk is moderate — use a lined sack or plastic covering."
```

This is what makes the optimizer **legible** to a farmer, depot clerk, AND judge simultaneously.

---

## 🐛 Troubleshooting

### AI Engine won't start
```bash
# Check Python version
python --version  # Should be 3.8+

# Install dependencies
cd ai-engine
pip install -r requirements.txt

# Check if port 8000 is in use
netstat -ano | findstr :8000
```

### Backend won't start
```bash
# Check MongoDB is running
mongosh  # Should connect

# Install dependencies
cd backend
npm install

# Check if port 5000 is in use
netstat -ano | findstr :5000
```

### "No trips found" error
```bash
# Re-seed database
cd backend
node scripts/seedKopargaon.js

# Verify trips exist
mongosh krishiflow
db.bustrips.countDocuments()  # Should return ~1080
```

### Weather API timeout
- Weather is cached to `ai-engine/weather_cache/`
- First run may take 5-10s to fetch from OpenMeteo
- Subsequent runs use cache (instant)
- If OpenMeteo is down, falls back to simulated provider

### Solver returns unassigned
- Check that `readyAt` date matches seeded trip dates (2026-08-29 to 2026-09-27)
- Check that origin/dest stops are on a route
- Check rule trace — a hard rule may have failed

---

## 📚 API Documentation

### AI Engine (FastAPI)
http://localhost:8000/docs — Interactive Swagger UI

### Backend (Express)
See `backend/src/routes/apiV2Routes.js` for all endpoints

**Key Endpoints:**
- `GET /api/v2/bus/stops` — List all bus stops
- `GET /api/v2/bus/routes` — List all routes
- `GET /api/v2/bus/trips` — List trips (filter by date, route)
- `POST /api/v2/consignments` — Book consignment (triggers assignment)
- `GET /api/v2/consignments/:id/explain` — Get decision trace
- `GET /api/v2/environment/current` — Get weather + traffic state
- `GET /api/v2/rules/book` — View rulebook (read-only)

---

## 🎬 Ready for Demo?

**Checklist:**
- [x] AI engine starts without errors ✅
- [x] Backend connects to AI engine ✅
- [x] Database seeded with Kopargaon data ✅
- [x] Can book consignment via API ✅
- [x] Rule engine evaluates and returns decision ✅
- [x] Solver assigns to trip ✅
- [x] Decision trace saved to MongoDB ✅
- [x] Rejection path works (pesticide → fleet) ✅
- [ ] Frontend wired to API ⏳
- [ ] Impact dashboard shows metrics ⏳
- [ ] Scenario engine working ⏳
- [ ] Demo script rehearsed 3× ⏳

**Estimated time to demo-ready:** 10-14 hours

---

## 💡 Next Steps

1. **Wire frontend components** (P4):
   - ConsignmentForm calls `apiV2.createConsignment()`
   - Display decision trace on submission
   - Show rejection cases gracefully

2. **Build Impact Dashboard** (P4):
   - Fetch baseline vs optimized metrics
   - Network split donut chart
   - Cost savings visualization

3. **Implement scenario engine** (P1):
   - 5 scenario buttons
   - Call solver repair on disruption
   - Animate map changes

4. **Baseline calculation** (P2):
   - Calculate tempo hire cost per consignment
   - Store as OptimizationRun with mode='baseline'
   - Compare against optimized runs

5. **Rehearse demo** (ALL):
   - 7-minute script from plan §11
   - Practice 3× before stage
   - Be ready for Q&A on what's real vs simulated

---

**Bottom line:** The brain is done. Wire the UI, build the Impact dashboard, and you have a killer demo.

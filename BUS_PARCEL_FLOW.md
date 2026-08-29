# 🚌 Bus-Parcel System - Complete Flow Explanation

## 📖 What Is This System?

The Bus-Parcel System lets farmers send cargo (like seeds, produce, fertilizer) on passenger buses instead of hiring separate tempo/trucks. This saves money because:
- ✅ Buses already run fixed routes daily (Kopargaon → Shirdi, Nashik, etc.)
- ✅ Buses have spare cargo capacity under seats and in luggage area
- ✅ Zero extra vehicles needed = ±0% vehicle-km added ★
- ✅ Cost reduced by ~42% vs hiring tempo

---

## 🎯 The Core Concept

**Traditional Way:**
```
Farmer needs to send 35 kg seeds
→ Hires tempo for ₹360
→ Tempo drives empty from depot → picks up cargo → delivers → returns empty
→ Expensive + adds vehicle-km
```

**Bus-Parcel Way:**
```
Farmer needs to send 35 kg seeds
→ Books on bus that's already going there
→ Bus picks up parcel along its route
→ Drops at destination APMC mandi
→ Only ₹180 cost + zero extra vehicles
```

---

## 🔄 Complete Flow: Farmer → Backend → AI Engine → Decision

### **Step 1: Farmer Fills Consignment Form** 📝

**Location:** Frontend > Bus Parcel tab > Book Consignment

**What Farmer Provides:**
1. **Origin Stop** - Where cargo will be picked up (e.g., Kopargaon Bus Depot)
2. **Destination Stop** - Where cargo should be delivered (e.g., Nashik APMC)
3. **Commodity** - What they're sending (e.g., Soybean Seeds, Onion, Pesticide)
4. **Cargo Class:**
   - **Class A** = Bus-eligible agricultural produce (seeds, grains, vegetables)
   - **Class B** = General parcels (documents, courier, spare parts)
   - **Class C** = Institutional shipments
   - **Class D** = NOT bus-eligible (hazardous, oversized)
5. **Packaging** - Jute sack, plastic bag, HDPE, cardboard, wooden crate
6. **Weight & Pieces:**
   - Total weight (e.g., 35 kg)
   - Number of pieces (e.g., 1 sack)
   - Max piece weight (MSRTC limit: 50 kg per piece)
7. **Value** - Declared value for insurance (₹15,000)
8. **Timing:**
   - Ready by (when cargo will be available for pickup)
   - Deadline (latest delivery time)

**Frontend Code:** `frontend/src/features/busParcel/ConsignmentForm.jsx`

---

### **Step 2: Frontend Sends Request to Backend** 🌐

**API Call:**
```javascript
POST /api/v2/consignments
Body: {
  originStopId: "stop-123",
  destStopId: "stop-456",
  commodity: "Soybean Seeds",
  cargoClass: "A",
  packagingType: "jute-sack",
  weightKg: 35,
  pieceCount: 1,
  maxPieceWeightKg: 35,
  declaredValue: 15000,
  readyAt: "2026-08-29T08:00:00Z",
  deadlineAt: "2026-08-29T22:00:00Z"
}
```

**Backend File:** `backend/src/controllers/consignmentController.js` → `createConsignment()`

---

### **Step 3: Backend Processes Request** 🔧

**What Backend Does:**

1. **Saves consignment to database** (MongoDB)
   - Creates Consignment document with status: 'pending'
   - Stores farmer details, cargo details, timing

2. **Fetches origin & destination stops** from database
   - Gets coordinates, stop types (depot/mandi/regular)

3. **Finds candidate bus trips** for that day
   - Queries BusTrip collection
   - Filters by service date and route
   - Gets trips with status: 'scheduled' or 'running'

4. **Gets current weather** from weather service
   - Temperature, humidity, rain probability, rainfall
   - Uses OpenMeteo API (cached on disk)
   - Fallback to mock data if API fails

5. **Calls AI Engine** for assignment decision

**Backend File:** `backend/src/controllers/consignmentController.js` lines 60-170

---

### **Step 4: Backend → AI Engine Communication** 🤖

**API Call to Python AI Engine:**
```javascript
POST http://localhost:8000/solve/assign
Body: {
  trips: [
    {
      id: "trip-001",
      routeCode: "R-NASHIK",
      departureTime: "2026-08-29T14:00:00Z",
      predictedSpareKg: 80,  // How much cargo space left
      cargoUsedKg: 20,        // How much already booked
      transitDurationMin: 120
    },
    {
      id: "trip-002",
      routeCode: "R-NASHIK",
      departureTime: "2026-08-29T16:10:00Z",
      predictedSpareKg: 90,
      cargoUsedKg: 10,
      transitDurationMin: 120
    }
  ],
  consignments: [{
    id: "cons-123",
    commodity: "Soybean Seeds",
    cargoClass: "A",
    weightKg: 35,
    packagingType: "jute-sack",
    ...
  }],
  environment: {
    tempC: 28,
    humidityPct: 65,
    rainProbPct: 62,
    rainfallMm: 0
  }
}
```

**Backend File:** `backend/src/services/aiEngineService.js` → `assignConsignments()`

---

### **Step 5: AI Engine Evaluates Rules** 📋

**AI Engine (Python FastAPI):**
- **File:** `ai-engine/app/services/rule_engine.py`
- **Endpoint:** `/solve/assign` calls rule engine internally

**Rule Evaluation Process:**

#### **Hard Rules (Must PASS, or rejection):**

1. **SAF-01: Hazardous Material Check**
   ```python
   if commodity in HAZARDOUS_LIST:
       FAIL → "Pesticide is on hazardous list. Not permitted on passenger buses."
   else:
       PASS → "Not hazardous"
   ```

2. **SAF-02: Sharp/Fragile Check**
   - Rejects glass bottles, sharp tools

3. **SAF-03: Liquid Leakage Check**
   - Ensures sealed containers for liquids

4. **PHY-01: Piece Weight Limit**
   ```python
   if maxPieceWeightKg > 50:
       FAIL → "MSRTC forbids pieces over 50 kg"
   else:
       PASS → "35 kg ≤ 50 kg limit"
   ```

5. **PHY-02: Bulk Oversized Check**
   - Rejects items that won't fit physically

6. **PKG-01: Packaging Adequacy**
   - Checks if packaging is appropriate for commodity

7. **CAP-01: Spare Capacity Check** (per trip)
   ```python
   for each trip:
       spareKg = trip.predictedSpareKg - trip.cargoUsedKg
       if consignment.weightKg > spareKg:
           FAIL → "Only 18 kg spare on 14:00 trip"
       else:
           PASS → "Needs 35 kg, 90 kg spare on 16:10 trip"
   ```

8. **CAP-02: Reserved Passenger Space**
   - Ensures minimum passenger capacity not compromised

9. **TIM-01: Deadline Feasibility**
   ```python
   if trip.arrivalTime > consignment.deadlineAt:
       FAIL → "Trip arrives after deadline"
   else:
       PASS → "Arrives by 18:00, deadline 22:00"
   ```

#### **Soft Rules (Can PASS with penalty/warning):**

10. **WX-01: Rain + Packaging Compatibility**
    ```python
    if rainProbPct > 60 and packaging not waterproof:
        WARN → "Rain 62%, jute sack not waterproof → +₹40 penalty"
        weatherRiskScore = 58  # MEDIUM risk
    ```

11. **WX-02: Temperature Sensitivity**
    - Perishables in hot weather → cooling penalty

12. **WX-03: Humidity + Moisture-Sensitive**
    - High humidity + grains/flour → penalty

13. **ECO-01: Vehicle-km Impact**
    - Prefers assignments that don't add detours

14. **ECO-02: Utilization Target**
    - Rewards filling underutilized trips

15. **VAL-01: High-Value Cargo**
    - High declared value → insurance cost added

**Rulebook Source:** `ai-engine/config/rulebook.yaml`

---

### **Step 6: Solver Assigns to Best Trip** 🎯

**After rules evaluated, solver picks:**
- ✅ All hard rules PASS
- ⚠️ Lowest penalty from soft rules
- 💰 Cheapest overall cost

**Algorithm:** Greedy cheapest-insertion
- **File:** `ai-engine/app/services/solver.py`

**Example Decision:**
```
Trip 14:00 Kopargaon→Nashik:
  ✗ CAP-01: FAIL — Only 18 kg spare
  → REJECTED

Trip 16:10 Kopargaon→Nashik:
  ✓ SAF-01: PASS — Not hazardous
  ✓ PHY-01: PASS — 35 kg ≤ 50 kg
  ✓ CAP-01: PASS — 90 kg spare
  ✓ TIM-01: PASS — Arrives 18:10, deadline 22:00
  ⚠ WX-01: WARN — Rain 62%, +₹40 penalty
  → ASSIGNED

Final Cost: ₹140 (base) + ₹40 (rain penalty) = ₹180
```

---

### **Step 7: AI Engine Returns Decision** ✅

**Response to Backend:**
```json
{
  "assignments": [{
    "consignmentId": "cons-123",
    "tripId": "trip-002",
    "cost": 180,
    "decision": {
      "decision": "ASSIGNED",
      "network": "bus",
      "trace": [
        {
          "rule": "SAF-01",
          "result": "PASS",
          "detail": "Commodity 'soybean seed' not on hazardous list"
        },
        {
          "rule": "PHY-01",
          "result": "PASS",
          "detail": "35 kg ≤ 50 kg piece limit"
        },
        {
          "rule": "CAP-01",
          "result": "FAIL",
          "tripId": "trip-001",
          "detail": "Needs 35 kg, 18 kg spare"
        },
        {
          "rule": "CAP-01",
          "result": "PASS",
          "tripId": "trip-002",
          "detail": "Needs 35 kg, 90 kg spare"
        },
        {
          "rule": "WX-01",
          "result": "WARN",
          "tripId": "trip-002",
          "detail": "Rain 62% on R-NASHIK 16:10–18:10; packaging 'jute sack' not waterproof → WRS 58 (MEDIUM), +₹40 penalty"
        }
      ],
      "summary": "Assigned to 16:10 Kopargaon→Nashik. Rain risk is moderate — use a lined sack. The 14:00 had only 18 kg spare.",
      "evaluatedAt": "2026-08-29T14:30:00Z",
      "chosen": {
        "tripId": "trip-002",
        "routeCode": "R-NASHIK",
        "departureTime": "2026-08-29T16:10:00Z",
        "costPenalty": 40
      }
    }
  }],
  "reroutedToFleet": [],
  "unassigned": []
}
```

**AI Engine Files:**
- `ai-engine/app/api/endpoints/solver.py` → `/solve/assign` endpoint
- `ai-engine/app/services/solver.py` → greedy insertion solver
- `ai-engine/app/services/rule_engine.py` → rule evaluation

---

### **Step 8: Backend Saves Decision & Assignment** 💾

**Backend receives AI response and:**

1. **Updates Consignment status** → 'assigned'
2. **Saves assignment details:**
   ```javascript
   consignment.assignment = {
     legs: [{
       tripId: "trip-002",
       boardStopId: originStopId,
       alightStopId: destStopId
     }],
     totalCost: 180,
     network: "bus"
   }
   ```

3. **Saves RuleDecision document** (for explainability):
   ```javascript
   RuleDecision.create({
     consignmentId: "cons-123",
     decision: "ASSIGNED",
     network: "bus",
     trace: [...],  // Full rule trace
     summary: "Assigned to 16:10...",
     evaluatedAt: new Date()
   })
   ```

4. **Emits Socket.io event** (if real-time enabled):
   ```javascript
   busSocket.emitConsignmentReassigned("cons-123", {
     tripId: "trip-002",
     status: "assigned"
   })
   ```

**Backend Files:**
- `backend/src/models/Consignment.js` - Mongoose schema
- `backend/src/models/RuleDecision.js` - Decision trace storage
- `backend/src/sockets/busSocket.js` - Real-time events

---

### **Step 9: Backend Returns Response to Frontend** 📤

**Response to Frontend:**
```json
{
  "success": true,
  "source": "database",
  "consignment": {
    "id": "cons-123",
    "farmerId": "farmer-001",
    "farmerName": "Ramesh Singh",
    "originStopId": "stop-kopargaon",
    "destStopId": "stop-nashik",
    "commodity": "Soybean Seeds",
    "cargoClass": "A",
    "weightKg": 35,
    "status": "assigned",
    "assignment": {
      "legs": [{ "tripId": "trip-002", ... }],
      "totalCost": 180,
      "network": "bus"
    },
    "weatherRiskScore": 58
  }
}
```

---

### **Step 10: Frontend Fetches Decision Trace** 📊

**Second API Call:**
```javascript
GET /api/v2/consignments/cons-123/explain
```

**Response:**
```json
{
  "success": true,
  "decision": {
    "consignmentId": "cons-123",
    "decision": "ASSIGNED",
    "trace": [...],  // All 15 rule evaluations
    "summary": "Assigned to 16:10 Kopargaon→Nashik...",
    "chosen": {
      "tripId": "trip-002",
      "routeCode": "R-NASHIK",
      "departureTime": "2026-08-29T16:10:00Z",
      "costPenalty": 40
    }
  }
}
```

---

### **Step 11: Frontend Displays Decision Trace** 🎨

**UI Shows:**

1. **Status Banner** (Green for ASSIGNED, Yellow for REROUTED, Red for REJECTED)
   ```
   ✓ Assigned to Bus Network
   
   "Assigned to 16:10 Kopargaon→Nashik. Rain risk is moderate —
   use a lined sack. The 14:00 had only 18 kg spare."
   
   Consignment ID: cons-123
   Network: bus
   Cost: ₹180
   Weather Risk: 58/100 (MEDIUM)
   ```

2. **Decision Trace** (Color-coded rule results)
   ```
   ✓ SAF-01   PASS   Commodity "soybean seed" not on hazardous list
   ✓ PHY-01   PASS   35 kg ≤ 50 kg piece limit
   ✗ CAP-01   FAIL   Needs 35 kg, 18 kg spare (Trip: trip-001)
   ✓ CAP-01   PASS   Needs 35 kg, 90 kg spare (Trip: trip-002)
   ⚠ WX-01    WARN   Rain 62% on R-NASHIK 16:10–18:10; jute not waterproof → WRS 58, +₹40
   ```

3. **Assignment Details** (if assigned)
   ```
   Trip ID: trip-002
   Route: R-NASHIK
   Departure: 4:10 PM
   Cost Penalty: +₹40
   ```

**Frontend File:** `frontend/src/features/busParcel/ConsignmentForm.jsx` → `DecisionTrace` component

---

## 🚫 Rejection Flow (Pesticide Example)

**If farmer tries to book pesticide:**

1. **SAF-01 Rule Fails:**
   ```
   ✗ SAF-01: FAIL — "Pesticide is on hazardous list. Not permitted on passenger buses."
   ```

2. **AI Engine Returns:**
   ```json
   {
     "reroutedToFleet": [{
       "consignmentId": "cons-456",
       "reason": "Hard rule rejection (SAF-01)",
       "suggestedNetwork": "fleet"
     }]
   }
   ```

3. **Backend Updates:**
   ```javascript
   consignment.status = 'rerouted_to_fleet'
   consignment.assignment = {
     network: "fleet"
   }
   ```

4. **Frontend Shows:**
   ```
   → Routed to Fleet
   
   "Cannot travel on passenger bus (rule SAF-01). Routed to
   fleet pickup for direct delivery."
   
   Status: REROUTED_TO_FLEET
   Network: fleet
   ```

**This is a FEATURE, not a failure!** The system knows eligibility boundaries and routes appropriately.

---

## 🗂️ Database Seeding

**To have stops available, you must seed the database:**

```bash
cd backend
node scripts/seedKopargaon.js
```

**This creates:**
- **15 bus stops:**
  - 1 depot (Kopargaon Bus Stand)
  - 2 APMC mandis (Kopargaon APMC, external destinations)
  - 12 regular stops (villages, external cities)
  
- **6 routes:**
  - R-SHIRDI (Kopargaon → Shirdi)
  - R-SANGAMNER (Kopargaon → Sangamner)
  - R-NASHIK (Kopargaon → Nashik)
  - R-ANAGAR (Kopargaon → Ahmednagar)
  - R-YEOLA (Kopargaon → Yeola)
  - R-VAIJAPUR (Kopargaon → Vaijapur)
  
- **1080 trips** (30 days × 6 routes × 6 departures/day)

**If stops dropdown is empty, run seeding script!**

---

## 🐛 Troubleshooting: No Stops in Dropdown

### Problem:
Origin/Destination dropdowns are empty or show "Select origin..."

### Cause:
Database not seeded OR backend not connected to MongoDB

### Solution:

**1. Check if MongoDB is running:**
```bash
mongosh
# If it connects, MongoDB is running
```

**2. Seed the database:**
```bash
cd backend
node scripts/seedKopargaon.js
```

**Expected output:**
```
✓ Cleared existing data
✓ Created 15 bus stops
✓ Created 6 routes
✓ Created 1080 trips
✓ Created 8 EV candidates
✓ Created test farmer account
Database seeded successfully!
```

**3. Verify stops were created:**
```bash
mongosh krishiflow
db.busstops.countDocuments()  # Should return 15
db.busstops.find().pretty()   # Should list all stops
```

**4. Restart backend:**
```bash
cd backend
npm run dev
```

**5. Check API directly:**
```bash
curl http://localhost:5000/api/v2/bus/stops
```

Should return:
```json
{
  "success": true,
  "stops": [
    {
      "id": "...",
      "name": "Kopargaon Bus Stand",
      "code": "KPG-DEPOT",
      "type": "depot",
      ...
    },
    ...
  ]
}
```

**6. Refresh frontend with hard reload:**
```
Ctrl + Shift + R
```

---

## 📋 Quick Reference: Full Stack

| Layer | Technology | File Location |
|-------|-----------|---------------|
| **Frontend UI** | React | `frontend/src/features/busParcel/ConsignmentForm.jsx` |
| **API Client** | Axios | `frontend/src/services/apiV2.js` |
| **Backend Controller** | Node.js/Express | `backend/src/controllers/consignmentController.js` |
| **AI Service Client** | Axios | `backend/src/services/aiEngineService.js` |
| **AI Engine API** | FastAPI (Python) | `ai-engine/app/api/endpoints/solver.py` |
| **Rule Engine** | Python | `ai-engine/app/services/rule_engine.py` |
| **Solver** | Python | `ai-engine/app/services/solver.py` |
| **Rulebook** | YAML | `ai-engine/config/rulebook.yaml` |
| **Database** | MongoDB + Mongoose | `backend/src/models/Consignment.js`, `RuleDecision.js` |
| **Seeding** | Node.js script | `backend/scripts/seedKopargaon.js` |

---

## 🎯 The Value Proposition

**Traditional Tempo Hire:**
- Cost: ₹360
- Vehicle-km: +120 km (empty return trip)
- CO2: +24 kg

**Bus-Parcel System:**
- Cost: ₹180 (50% savings)
- Vehicle-km: ±0 km (bus already running)
- CO2: +0 kg (no extra emissions)

**Impact at Scale (1000 consignments/month):**
- ✅ ₹1,80,000 saved vs tempo
- ✅ 0 extra vehicle-km
- ✅ 24,000 kg CO2 avoided

**That's the demo punchline: "Vehicle-km added ≈ 0 ★"**

---

**Now you understand the complete flow! 🚀**

**Next step: Seed the database so stops appear in dropdown!**

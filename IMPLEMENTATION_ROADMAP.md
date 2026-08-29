# KrishiFlow skh053 Implementation Roadmap
**Status: Scaffolding Complete → Now Implementing Core Features**

## 🎯 What We're Building (Visual Overview)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARMER BOOKS CONSIGNMENT                      │
│  "35 kg soybean seed, Kopargaon → Nashik, ready 14:00, by 22:00" │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              ① CARGO ELIGIBILITY ENGINE                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ HARD RULES (reject → fleet)                              │  │
│  │ ✓ SAF-01: Not hazardous (pesticide? NO)                 │  │
│  │ ✓ SAF-02: Not live animals                              │  │
│  │ ✓ PHY-01: ≤50 kg per piece (MSRTC limit)                │  │
│  │ ✓ PKG-01: Not wet/leaking                               │  │
│  │ ✓ CAP-01: Fits in spare capacity                        │  │
│  │ ✓ TIM-01: Can meet deadline                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SOFT RULES (penalties, not reject)                       │  │
│  │ • WX-01: Rain risk × packaging (62% rain, jute → +₹40)  │  │
│  │ • ECO-01: Consolidation bonus                            │  │
│  │ • ECO-02: Hold-for-later savings                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📄 Decision: ELIGIBLE for bus network                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              ② WEATHER CONDITIONING                              │
│  Open-Meteo API → cached to disk (offline-safe)                 │
│                                                                  │
│  W1: Rain × packaging → WX-01 rule trigger                      │
│  W2: Temp/humidity → spoilage model → deadline shift            │
│  W3: Rain → unpaved road speed penalty                          │
│  W4: Rain → demand forecast adjustment                          │
│                                                                  │
│  Weather Risk Score: 58/100 (MEDIUM)                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              ③ SOLVER (Time-Expanded Graph)                      │
│  Available trips on 2026-08-29:                                 │
│  • T-NASHIK-1400  KPG→NASH  14:00-17:00  [18 kg spare] ❌       │
│  • T-NASHIK-1610  KPG→NASH  16:10-19:15  [90 kg spare] ✓       │
│                                                                  │
│  Greedy cheapest-insertion + local repair                       │
│  Assignment: T-NASHIK-1610, cost ₹180 (vs ₹360 tempo)          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              📊 IMPACT DASHBOARD (leads demo)                    │
│  ┌────────────────────────┬────────────────────────────────┐   │
│  │ Baseline (tempo hire)  │ Optimized (bus + fleet)        │   │
│  │ ₹12.40 / quintal-km    │ ₹7.20 / quintal-km   [-42%]   │   │
│  │ 340 vehicle-km         │ 340 vehicle-km       [±0%] ★   │   │
│  │ 85 min avg transit     │ 110 min avg transit  [+29%]    │   │
│  └────────────────────────┴────────────────────────────────┘   │
│                                                                  │
│  Network Split (donut):  68% bus · 32% fleet                    │
│  Cargo Classes: A:45% B:30% C:15% D:10% (fleet-only)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              🎬 SCENARIO ENGINE (adaptation demos)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [Trip Cancelled] [Road Closed] [Demand Spike]           │  │
│  │ [Heavy Rain] [Congestion] [Reset]                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Click "Heavy Rain" → re-runs solver → 8 consignments rerouted  │
│  3 flipped bus→fleet on WX-01 trigger                           │
│  Live animation on map                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              🔋 EV CHARGING SITING (bonus module)                │
│  Reuses bus trip density + dwell patterns                       │
│  8 candidates → select top 3 with coverage optimization         │
│  Ties to Maharashtra EV Policy 2025-30 mandate                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Implementation Priority (Next Steps)

### ✅ PHASE 0: SCAFFOLDING (COMPLETE)
All 10 tasks done. 36 files created. MOCK_MODE stubs ready.

### 🔵 PHASE 1: CORE BUSINESS LOGIC (P2 + P3) — **START HERE**
**Goal:** Make the happy path work end-to-end with real logic

#### 1.1 Rule Engine (P3 — HIGHEST PRIORITY)
**File:** `ai-engine/app/services/rule_engine.py`
- Parse `rulebook.yaml` (already created)
- Implement hard rule evaluators (SAF-01/02/03, PHY-01/02, PKG-01, CAP-01/02, TIM-01)
- Implement soft rule scorers (WX-01/02/03, ECO-01/02, VAL-01)
- Generate decision trace with plain-language summary
- Replace `/rules/evaluate` stub in `ai-engine/app/api/endpoints/rules.py`

**Why first:** This is the integration point. Solver needs this output.

#### 1.2 Weather Service (P2 + P3)
**Files:** 
- `backend/src/services/weatherService.js` (cache + fetch wrapper)
- `ai-engine/app/providers/weather_provider.py` (already scaffolded, complete implementation)

**Tasks:**
- Wire OpenMeteoWeatherProvider to real API
- Implement disk caching (weather_cache/)
- Calculate Weather Risk Score (WRS) in rule engine
- Test W1-W4 causal paths

#### 1.3 Trip Spare Capacity Predictor (P3)
**File:** `ai-engine/app/services/capacity_predictor.py`
- Seasonal profile: `baseCapacity × f(hour, weekday, route, month)`
- Add noise for realism
- Replace `/forecast/spare-capacity` stub

#### 1.4 Solver — Greedy Insertion (P3)
**File:** `ai-engine/app/services/solver.py`
- Build time-expanded graph (NetworkX)
- Greedy cheapest-insertion algorithm
- Replace `/solve/assign` stub
- Input: trips[], consignments[], environment, rule decisions
- Output: assignments[], reroutedToFleet[], unassigned[]

**Fallback (if behind):** Nearest-feasible-trip greedy (no graph)

#### 1.5 Backend Controller Implementation (P2)
**Files:** `backend/src/controllers/*Controller.js`
- Wire consignmentController to call Python `/rules/evaluate` → `/solve/assign`
- Implement baseline calculation (tempo hire rates × distance)
- Implement metrics aggregation (OptimizationRun model)
- Add socket emission on state changes

### 🟢 PHASE 2: FRONTEND INTEGRATION (P4)
**Goal:** Replace stub data with real API calls, build Impact dashboard

#### 2.1 Wire API Client
- Import `apiV2.js` functions into components
- Replace all hardcoded mock data
- Add loading states, error handling

#### 2.2 Impact Dashboard (HIGHEST SCORING SCREEN)
**File:** `frontend/src/features/busParcel/ImpactDashboard.jsx`
- Fetch baseline vs optimized runs from `/api/v2/optimize/compare`
- Build metric cards (cost, vehicle-km, transit time, utilization)
- **Network split donut chart** (D3.js or Recharts)
- Cargo class breakdown

#### 2.3 Consignment Form + Decision Trace
- Wire form submission to `createConsignment()`
- Display RuleDecision trace in accordion
- Show plain-language summary prominently
- Handle rejections gracefully

#### 2.4 Map Layers
- Use MapLayerRegistry to add bus-stops, bus-routes, ev-candidates
- Wire live trip updates via socket
- Add consignment flow lines (origin → destination)

### 🟡 PHASE 3: ADAPTATION & SCENARIOS (P1 + P2)
**Goal:** Live scenario demos that change decisions

#### 3.1 Scenario Engine (P1)
**File:** `backend/src/services/scenarioService.js`
- Implement 5 scenario types:
  - `trip_cancelled`: mark trip unavailable
  - `road_closed`: remove edges from graph
  - `demand_spike`: inject historical APMC arrival day
  - `heavy_rain`: override weather to 95% rain prob
  - `congestion`: multiply edge weights by 2.5x
- Trigger re-optimization
- Emit socket events

#### 3.2 Scenario UI (P4)
**File:** `frontend/src/features/scenarios/ScenarioControl.jsx`
- Wire 5 buttons to `applyScenario()`
- Listen to `scenario:applied` socket events
- Animate changes on map
- Show diff: "8 consignments rerouted, 3 moved to fleet"

### 🟣 PHASE 4: EV CHARGING (P3 + P4)
**Optional — cut if behind schedule**

#### 4.1 EV Siting Algorithm (P3)
**File:** `ai-engine/app/services/ev_siting.py`
- Score candidates on: trip density, dwell time, grid proximity
- Greedy k-select with coverage optimization
- Replace `/ev-siting/optimize` stub

#### 4.2 EV Panel (P4)
- Display candidates with score breakdown
- k slider, coverage before/after chart
- One-line context on Maharashtra EV Policy

### 🔴 PHASE 5: POLISH & EXPLAINABILITY (All)
**Hours 14-17 — before Gate 2 freeze**

#### 5.1 SHAP Integration (P3)
**File:** `ai-engine/app/api/endpoints/explainability.py`
- TreeExplainer on LightGBM price model
- Waterfall plot for one consignment
- **CUT if behind schedule** — decision trace carries explainability alone

#### 5.2 Depot Operations (P4)
- Trip manifest view (loading list)
- Rulebook viewer (read-only YAML display)
- Empty states, mobile responsiveness

#### 5.3 Testing & Hardening (All)
- End-to-end flow: book consignment → see decision trace → trigger scenario → see rerout
- Error handling, loading states
- Offline demo mode (all caches populated)

---

## 🎬 Demo Flow (7 minutes)

```
0:00  Problem statement (Kopargaon context)
0:30  IMPACT DASHBOARD — numbers first
      ★ Vehicle-km added ≈ 0 ★
1:30  Book consignment #1 (soybean) → ACCEPTED
      Show decision trace with plain-language summary
2:15  Book consignment #2 (pesticide) → REJECTED
      Watch it hand off to fleet (proves eligibility engine)
3:00  Depot manifest view (deployment realism)
3:30  SCENARIO: Cancel 14:00 Nashik trip + force heavy rain
      Watch 8 consignments reroute, 3 flip to fleet
5:00  EV siting module (same data, second question)
5:30  "What's real vs simulated" slide (honesty = trust)
6:30  Q&A buffer
```

---

## 🚨 Cut Order (If Behind Schedule)

Cut from bottom up:
6. SHAP waterfall plots
5. TomTom live provider (keep simulated)
4. EV siting module
3. Weather paths W3, W4 (keep W1, W2)
2. Local repair pass (keep greedy)

**NEVER CUT:**
- Rule engine + decision trace
- Scenario engine
- Impact dashboard
- Baseline vs optimized comparison

---

## 🎯 Success Criteria

### Must Have (Gate 2 — H17)
- [ ] Rule engine evaluates 9 hard + 6 soft rules
- [ ] Decision trace with plain-language summary
- [ ] Solver assigns consignments to trips
- [ ] Impact dashboard shows baseline vs optimized
- [ ] One scenario works end-to-end (trip cancellation)
- [ ] Rejection path (pesticide → fleet handoff)

### Should Have
- [ ] All 5 scenarios work
- [ ] Weather Risk Score with W1-W4 paths
- [ ] Network split donut chart
- [ ] Map animations for reroutings
- [ ] Depot manifest view

### Nice to Have
- [ ] SHAP explainability
- [ ] EV siting module
- [ ] TomTom live traffic toggle
- [ ] Local repair optimization pass

---

## 📊 Current Status

✅ **Scaffold:** 100% complete (36 files, all MOCK_MODE stubs)
⏳ **P1 Core Logic:** 0% — **START HERE**
⏳ **P2 Frontend:** 0%
⏳ **P3 Scenarios:** 0%
⏳ **P4 EV:** 0%
⏳ **P5 Polish:** 0%

**Next action:** Implement rule engine (P3 priority #1)

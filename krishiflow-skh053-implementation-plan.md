# KrishiFlow → skh053 Extension Plan (v2)
**Smart Kopargaon Hackathon · Track 3 · Intelligent Mobility & Logistics Optimization**

> v2 changes: added the cargo eligibility engine as the core integration point, a rule engine + explainability layer, weather-conditioned decisions, and a pluggable traffic provider. Google Maps demoted from primary to optional adapter — see §7.2 for why.

---

## 0. Assumptions (correct these before starting)

| Assumption | If wrong |
|---|---|
| Team of 4 | At 3, P1 absorbs the Impact dashboard; cut EV module to a static analysis screen |
| Existing frontend has a working map with vehicle markers | Add 2h to P4; cut the EV map layer |
| 24h build window | Gates in §9 shift proportionally |
| Existing VRP is callable as a service, not inlined in a controller | P3 spends hour 1 extracting it behind a function boundary |
| Existing LightGBM price model is retrainable / has a saved model artifact | SHAP explainability (§6.3) drops to rule-trace only |
| Hackathon rules permit extending prior work | **Verify first.** If code must be written in-window, keep the architecture, rebuild the fleet layer thin |

---

## 1. The one-line pitch

> Kopargaon's buses already run on fixed schedules with unused luggage capacity, and MSRTC already runs a parcel service. We don't add vehicles — we decide **what** is safe and legal to put on **which** bus, **when**, and we re-decide automatically when a bus breaks, a road closes, or it rains.

The three verbs are the three subsystems: **eligibility** (rule engine), **assignment** (solver), **adaptation** (scenario engine).

---

## 2. Scope lock

Write this on a whiteboard. Highest-value artifact in this document.

### Building
- **Core (existing):** farm→mandi capacitated VRP fleet — *skh041, skh043*
- **A. Cargo eligibility & rule engine** — decides bus vs. fleet. **This is the integration point.**
- **B. Bus-parcel consolidation** onto scheduled MSRTC trips — *skh014*
- **C. Environmental conditioning** — weather + road/traffic state feeding A and B
- **D. EV charger siting** reusing B's route data — *skh042*
- **E. Scenario engine** + baseline-vs-optimized metrics

### Not building
- Drone surveillance (*skh015*) — appears only as a congestion input to C
- Depot workforce product (*skh050*) — appears only as crew availability windows constraining B
- Cold chain hardware, FPO management, maintenance trackers, bulk aggregation UI
- Any real MSRTC systems integration (no public API exists)

If someone proposes an addition at hour 14, the answer is no. It goes on the roadmap slide.

---

## 3. Cargo eligibility engine — the grounding layer

**Why this matters more than the solver:** every competing team will claim "put parcels on buses." The ones who lose are the ones a judge stops with *"can you actually put 200 kg of wet tomatoes in a passenger bus?"* You want the answer to be a screen.

### 3.1 What state RTCs actually allow
- MSRTC's own rule: a passenger may carry up to **50 kg**, of which **20 kg is free**; above that, per-stage charges apply. MSRTC also runs a formal parcel service with offices at major bus stands, operated through a statewide appointed agent.
- KSRTC (comparator) publicly permits goods including pipes, tyres, utensils and appliances on passenger buses, **subject to available space**, with a 30 kg free allowance.

So: bus-borne goods movement is existing, regulated practice. You are scheduling and optimizing it, not inventing it. Say exactly this on stage.

### 3.2 Cargo classes

| Class | Contents | Route | Why it matters |
|---|---|---|---|
| **A — Bus-eligible agri** | Packed seeds, pulses, dried grain ≤50kg sacks, jaggery, spices, dried chilli | Bus | High margin, farmer-facing story |
| **B — General parcels** | Personal courier, documents, spare parts, medicines, e-commerce returns, pilgrim/Shirdi traffic parcels | Bus | **The volume filler.** Agri alone is seasonal and can't fill capacity year-round |
| **C — Institutional** | India Post / govt mail, cooperative society documents, bank pouches | Bus | Predictable, schedulable, contractable |
| **D — Not bus-eligible** | Bulk onion lots, wet/unpackaged produce, pesticides & agri-chemicals, livestock, oversized, >50kg pieces | **Existing KrishiFlow VRP fleet** | The rejection path is a feature, not a failure |

**Class D is the point.** When the engine rejects a consignment from the bus network, it doesn't fail — it hands off to your existing fleet VRP. One platform, two networks, one decision boundary. That is your Integration & Scalability answer.

Be honest on stage that agri alone won't fill the buses — Class B/C is what makes the economics work. That admission reads as commercial maturity, and it's true.

### 3.3 Rule set

**Hard rules (reject from bus network → route to fleet):**

| ID | Rule | Basis |
|---|---|---|
| `SAF-01` | Flammable / hazardous (pesticides, agri-chemicals, fuel) | Passenger safety |
| `SAF-02` | Live animals / poultry | Passenger safety, MSRTC policy |
| `SAF-03` | Strong odour (dried fish, manure) | Passenger comfort |
| `PHY-01` | Single piece > 50 kg | MSRTC luggage ceiling |
| `PHY-02` | Dimensions exceed luggage duct envelope | Physical |
| `PKG-01` | Wet / leaking / unsealed produce | Damage to other cargo |
| `CAP-01` | Requested weight > trip predicted spare capacity | Capacity |
| `CAP-02` | Crew duty window doesn't cover trip (*skh050 constraint*) | Operations |
| `TIM-01` | Earliest feasible arrival > consignment deadline | Service |

**Soft rules (score penalties, don't reject):**

| ID | Rule |
|---|---|
| `WX-01` | Rain probability on route × non-waterproof packaging |
| `WX-02` | Temp/humidity × commodity perishability → feeds existing spoilage model |
| `WX-03` | Heavy rain × unpaved village approach link → speed penalty |
| `ECO-01` | Consolidation bonus — same destination, same trip |
| `ECO-02` | Hold-for-later bonus — a later trip is materially cheaper |
| `VAL-01` | Declared value above parcel-service liability limit |

Rules live in **one declarative JSON/YAML file**, not scattered through code. That's what makes them demoable ("here is the rulebook, a depot manager can edit it") and testable.

---

## 4. Weather integration — four causal paths

**Design rule: weather must change a decision, or it's decoration.** A "rain-friendly score" that only displays a number will be spotted immediately. Each path below terminates in an actual assignment change.

**Source:** Open-Meteo — free, no API key, forecast + historical, works from a script. Cache responses to disk so the demo never depends on venue wifi.

| Path | Mechanism | Terminates in |
|---|---|---|
| **W1 — Packaging exposure** | Rain probability along route window × packaging type → `WX-01` | Consignment rejected from open-duct loading, or flagged for sealed repack |
| **W2 — Spoilage acceleration** | Temp + humidity → your **existing exponential spoilage model** → shortens effective deadline | Solver picks an earlier trip, or hands to fleet for direct run |
| **W3 — Road degradation** | Rainfall → speed multiplier on unpaved village approach links (Kopargaon taluka is 94.66% agricultural land — lots of kachcha approaches) | Longer edge weights → different route/trip |
| **W4 — Demand shift** | Rainfall interrupts harvest → next-day APMC arrivals dip; clear post-rain days spike | Demand forecast adjustment, feeds capacity planning |

**Reframe "crop rain-friendly score" as a Weather Risk Score** per consignment:
```
WRS = f(commodity_moisture_sensitivity, packaging_class,
        rain_prob_along_route, transit_duration_hrs, temp_c, humidity_pct)
→ 0–100, banded LOW / MEDIUM / HIGH
```
HIGH triggers `WX-01`. MEDIUM applies a cost penalty that nudges the solver toward faster trips. LOW is a no-op. That's a score that *does something*.

W2 is the highest-value path because it reuses a model you already built — say so on stage.

---

## 5. Road conditions & traffic — provider abstraction

### 5.1 The rule
**The demo must run with zero network access.** Simulated provider is the default. Live providers are a toggle you flip on stage only if wifi is holding.

```python
class TrafficProvider(ABC):
    def get_speed_factor(self, edge_ids, at_time) -> dict[str, float]
    def get_incidents(self, bbox) -> list[Incident]
```

| Implementation | Status | Notes |
|---|---|---|
| `SimulatedTrafficProvider` | **Default, build first** | Time-of-day profile + injectable congestion events + rain coupling (W3) |
| `TomTomTrafficProvider` | **Recommended live provider** | Traffic Flow API gives real-time observed speeds; free tier ~50k tile / 2.5k non-tile requests per day, no card; permissive terms (results may be rendered over non-TomTom basemaps) |
| `GoogleTrafficProvider` | Optional, likely skip | See §5.2 |

### 5.2 Why Google is demoted
Google Maps Platform restructured pricing in 2026 — the old $200 monthly credit was replaced by tiered subscriptions (Starter ~$100/mo, Essentials ~$275/mo, Pro ~$1,200/mo) at roughly $2–40 per 1,000 requests depending on API and tier. For a student team that's a hard blocker, and it couples your demo to a billing account plus venue wifi. Google's terms are also more restrictive about rendering its data over third-party basemaps. **Verify current terms yourself before committing** — but plan for TomTom.

### 5.3 Simulated congestion (what you'll actually demo)
- Baseline speed profile per road class from OSM tags
- Time-of-day multiplier: morning mandi rush at APMC, Shirdi pilgrim peaks on the `R-SHIRDI` corridor
- Rain coupling from W3
- Injectable incident events (this is also your road-closure scenario)

This is where the dropped drone PS reappears honestly: label the congestion layer *"congestion inputs — currently simulated; designed to accept vehicle-count feeds from junction cameras or aerial survey."* That's an integration story with no drone in the room.

---

## 6. Rule engine + explainability

### 6.1 Architecture — three tiers, clearly labelled
```
Tier 1  DETERMINISTIC RULES     hard/soft rules from rulebook.yaml
        → full decision trace, no ML                          [call it "rules"]

Tier 2  HEURISTIC OPTIMIZATION  time-expanded greedy + local repair
        → cost breakdown per chosen leg                       [call it "optimizer"]

Tier 3  LEARNED MODELS          spare-capacity forecast, existing price model
        → SHAP attribution                                    [call it "ML"]
```

**Do not call Tier 1 "AI."** Naming a rule engine "AI" is the fastest way to lose a technical judge. Naming it correctly and showing a clean decision trace wins the same judge. Explainability that is *genuinely* explainable beats a SHAP plot nobody can read.

### 6.2 Decision trace (Tier 1 — build this, it's cheap and it's your best UI moment)

Every consignment carries an ordered evaluation log:

```json
{
  "consignmentId": "C-1042",
  "decision": "ASSIGNED",
  "trace": [
    { "rule": "SAF-01", "result": "PASS", "detail": "Commodity 'soybean seed' not on hazardous list" },
    { "rule": "PHY-01", "result": "PASS", "detail": "35 kg ≤ 50 kg piece limit" },
    { "rule": "WX-01", "result": "WARN", "detail": "Rain 62% on R-NASHIK 14:00–17:00; packaging 'jute sack' not waterproof → WRS 58 (MEDIUM), +₹40 penalty" },
    { "rule": "CAP-01", "result": "FAIL", "trip": "T-NASHIK-1400", "detail": "Needs 35 kg, 18 kg spare" },
    { "rule": "CAP-01", "result": "PASS", "trip": "T-NASHIK-1610", "detail": "Needs 35 kg, 90 kg spare" },
    { "rule": "ECO-02", "result": "APPLIED", "detail": "16:10 is ₹180 cheaper than fleet dispatch; deadline 22:00 still met" }
  ],
  "chosen": "T-NASHIK-1610",
  "summary": "Assigned to 16:10 Kopargaon→Nashik. The 14:00 had only 18 kg spare, and waiting 2h saves ₹180 while still meeting your 22:00 deadline. Rain risk is moderate — use a lined sack."
}
```

That `summary` string is the single most persuasive thing you will build. It makes the optimizer legible to a farmer, a depot clerk, and a judge simultaneously.

### 6.3 Tier 3 explainability
SHAP on the existing LightGBM price model and on the spare-capacity model if it's learned rather than profile-based. ~20 lines with `shap.TreeExplainer`. One waterfall plot in the UI. **If time runs short at Gate 2, cut SHAP, keep the trace.** The trace carries the explainability claim on its own.

### 6.4 Rulebook file
`ai-engine/config/rulebook.yaml` — declarative, hot-reloadable, exposed read-only in the admin UI. Being able to say "a depot manager edits this file, not our code" is a deployment-realism point.

---

## 7. Data spine

### 7.1 Geography
Kopargaon taluka: ~725 km², ~79 villages, ~302k population (2011), 94.66% agricultural land, ~78% rural. NH-60 and NH-160 both pass through. Hub-and-spoke: one town, radial village corridors.

Seed **12–15 stops** (not 79 — you need a legible map):
`KPG-DEPOT` (Kopargaon ST Depot), `KPG-APMC` (market yard), villages Sanwatsar, Pohegaon, Kolpewadi, Dhamori, Chas Nali, Karanji Bk, Manjur, Shingnapur, Rawanda, plus external nodes Shirdi, Sangamner, Ahmednagar, Nashik, Yeola, Vaijapur. OSM coordinates; approximate is fine, label it.

### 7.2 Bus corridors

| Code | Route | Notes |
|---|---|---|
| `R-SHIRDI` | Kopargaon ↔ Shirdi | ~16 km, high frequency, fare anchor ₹36, pilgrim parcel demand (Class B) |
| `R-SANGAMNER` | Kopargaon ↔ Sangamner | via villages |
| `R-NASHIK` | Kopargaon ↔ Nashik | onion corridor |
| `R-ANAGAR` | Kopargaon ↔ Ahmednagar | district HQ |
| `R-YEOLA` | Kopargaon ↔ Yeola | |
| `R-VAIJAPUR` | Kopargaon ↔ Vaijapur | |

4–8 daily departures each. **Photograph the real depot timetable board if anyone can reach it** (depot: 02423-223243). "We digitised the depot's physical timetable" is a strong Q&A answer.

### 7.3 Demand
Kopargaon APMC publishes daily arrivals and modal prices via Agmarknet / data.gov.in (wheat, maize, gram, tur, soybean, jowar, bajra, onion). Pull 60–90 days if you can; synthesise 30 shaped like the real seasonal pattern if you can't. **Find one real historical arrival-spike day** and use it as your demand-spike scenario.

Generate Class B/C demand synthetically (courier, post, spare parts) — label it clearly as synthetic.

### 7.4 Weather
Open-Meteo forecast + historical for Kopargaon (19.88 N, 74.48 E). Cache to disk.

### 7.5 Cost baselines
Survey 8–10 farmers/traders at Kopargaon APMC for tempo/pickup hire rates (₹/trip, ₹/km). One afternoon. It's the only primary data in your submission — worth disproportionate marks.

---

## 8. Contract-first scaffolding

**P1 builds this in hours 0–2. Nobody else writes code until it's pushed.**

Rule: every stub returns realistic, correctly-shaped mock JSON immediately, behind a `MOCK_MODE` flag. P4 builds the whole frontend against stubs; P3 replaces solver stubs; neither waits.

### 8.1 Models
```
backend/src/models/
├── BusStop.js  BusRoute.js  BusTrip.js
├── Consignment.js  CargoClass.js
├── ChargingCandidate.js  ScenarioEvent.js
├── OptimizationRun.js  RuleDecision.js
└── EnvironmentSnapshot.js
```

```js
BusStop      { code, name, nameMr, location:{type:'Point',coordinates:[lng,lat]},
               villageCode, isDepot, isMandi, approachRoadClass }

BusRoute     { code, name, distanceKm, stops:[{stopId,seq,offsetMin}], operatingDays }

BusTrip      { routeId, serviceDate, departureTime, vehicleCode,
               status:'scheduled'|'running'|'cancelled'|'delayed', delayMin,
               passengerCapacity, cargoCapacityKg, predictedSpareKg, cargoUsedKg,
               crewWindow:{startTime,endTime} }

Consignment  { farmerId, originStopId, destStopId,
               commodity, cargoClass:'A'|'B'|'C'|'D', packagingType, weightKg,
               pieceCount, maxPieceWeightKg, declaredValue,
               readyAt, deadlineAt,
               status:'pending'|'assigned'|'in_transit'|'delivered'|'rerouted_to_fleet'|'failed',
               assignment:{ legs:[{tripId,boardStopId,alightStopId,etd,eta}],
                            totalCost, network:'bus'|'fleet' },
               weatherRiskScore, decisionId, baselineCost }

RuleDecision { consignmentId, decision, trace:[{rule,result,tripId,detail}],
               chosen, summary, evaluatedAt }

EnvironmentSnapshot { at, source:'open-meteo'|'simulated',
                      tempC, humidityPct, rainProbPct, rainfallMm,
                      trafficProvider, edgeSpeedFactors:{} }

ChargingCandidate   { name, location, siteType, demandScore, dwellScore,
                      gridScore, totalScore, selected }
ScenarioEvent       { type:'trip_cancelled'|'road_closed'|'demand_spike'|'weather'|'congestion',
                      targetId, params, appliedAt, active }
OptimizationRun     { runId, mode:'baseline'|'optimized', serviceDate, scenarioId,
                      metrics:{ costPerQuintalKm, totalVehicleKm, meanTransitMin,
                                spareCapacityUtilPct, parcelRevenue,
                                busAssignedCount, fleetReroutedCount,
                                unassignedCount, co2Kg }, createdAt }
```

### 8.2 REST contracts (all under `/api/v2/`)
```
GET    /api/v2/bus/stops                    → BusStop[]
GET    /api/v2/bus/routes                   → BusRoute[]
GET    /api/v2/bus/trips?date=&routeId=     → BusTrip[] + live load
GET    /api/v2/bus/trips/:id/manifest       → { trip, consignments[] }

POST   /api/v2/consignments                 → Consignment (triggers eligibility + assign)
GET    /api/v2/consignments?status=&class=  → Consignment[]
GET    /api/v2/consignments/:id             → Consignment + assignment
GET    /api/v2/consignments/:id/explain     → RuleDecision (full trace + summary)

POST   /api/v2/rules/evaluate               { consignment, tripIds[] } → RuleDecision
GET    /api/v2/rules/book                   → parsed rulebook.yaml (read-only)

GET    /api/v2/environment/current          → EnvironmentSnapshot
POST   /api/v2/environment/override         { rainProbPct, tempC, congestionLevel }
GET    /api/v2/environment/providers        → { traffic: 'simulated'|'tomtom', weather: ... }
POST   /api/v2/environment/providers        { traffic } → switch provider live

POST   /api/v2/optimize/run                 { mode, serviceDate } → OptimizationRun
GET    /api/v2/optimize/compare?date=       → { baseline, optimized, delta }

POST   /api/v2/scenario/apply               { type, targetId, params }
                                            → { scenario, changes[], metrics }
POST   /api/v2/scenario/reset               → { ok }
GET    /api/v2/scenario/active              → ScenarioEvent[]

GET    /api/v2/ev/candidates                → ChargingCandidate[]
POST   /api/v2/ev/optimize                  { k } → { selected[], coverageBefore, coverageAfter }
```

### 8.3 Socket.io (`/v2` namespace)
```
trip:updated            { tripId, status, delayMin, cargoUsedKg }
consignment:reassigned  { consignmentId, from, to, reason }
consignment:rerouted    { consignmentId, toNetwork:'fleet', failedRule }
environment:changed     { rainProbPct, congestionLevel, affectedEdges[] }
scenario:applied        { scenarioId, affectedTrips[], affectedConsignments[] }
optimize:progress       { runId, pct, stage }
```
`consignment:reassigned` and `consignment:rerouted` drive the live demo animation.

### 8.4 FastAPI solver contracts
```
POST /rules/evaluate        { consignment, trips[], environment } → RuleDecision
POST /solve/assign          { trips[], consignments[], environment, costParams }
                            → { assignments[], reroutedToFleet[], unassigned[], metrics }
POST /solve/repair          { currentAssignments[], disruption, trips[], environment }
                            → { changes[], stillFeasible[], failed[], metrics }
POST /solve/ev-siting       { candidates[], tripDensity, dwellData, k }
                            → { selected[], coverageBefore, coverageAfter, scoreBreakdown }
GET  /forecast/spare-capacity?tripId=  → { predictedSpareKg, confidence, basis }
POST /explain/shap          { modelName, features } → { baseValue, contributions[] }
```

### 8.5 Frontend scaffold
```
frontend/src/features/
├── busParcel/      BusParcelPanel · TripManifest · ConsignmentForm · DecisionTrace
├── evCharging/     EVSitingPanel · CoverageChart
├── environment/    WeatherPanel · TrafficPanel · ProviderToggle
├── scenarios/      ScenarioControl
├── impact/         ImpactDashboard · BaselineCompare · NetworkSplitChart
└── shared/         MapLayerRegistry.js ← real, not stub
                    apiV2.js            ← real, typed client for every endpoint
```

`MapLayerRegistry` must be fully implemented — a registry where each feature registers `{ id, label, defaultOn, render(map, data) }` and the shell renders toggles. This is what lets four people add markers to one map without merge wars.

---

## 9. Ownership & timeline (24h)

### Roles
**P1 — Scaffolder → Integration captain.** §8 in H0–2. Then scenario engine + environment provider switching. **Writes no new features after H14.**
**P2 — Node backend.** Controllers, trip expansion, manifests, metrics service, socket emission, Node→FastAPI wiring.
**P3 — Python.** Rule engine + rulebook.yaml, time-expanded graph, greedy assign + local repair, WRS calculation, EV siting, SHAP.
**P4 — Frontend.** Everything in §10, against stubs from H2.

### Baseline definition (P2 owns — get this right)
Each consignment moves by individually-hired tempo, direct, no consolidation. Cost = hire rate × distance. **Your entire impact claim rests on this number.**

### Solver guidance for P3
**Do not use CP-SAT.** Modeling it correctly in six hours by someone who hasn't shipped it is the biggest technical risk here. Build instead: NetworkX time-expanded graph (nodes = stop×time, edges = ride-trip or wait) → greedy cheapest-insertion → local repair swap pass. Same algorithm family as the existing VRP, so you can honestly say *"we extended our VRP heuristic to a scheduled network."*

Defence under Q&A: *"Exact optimization on a time-expanded network is NP-hard at scale; we use cheapest-insertion with local improvement, which is what production VRP systems ship. We report the optimality gap against brute force on a 10-consignment instance."* Compute that gap if time allows — killer slide.

**Spare capacity:** seasonal profile `base × f(hour, weekday, route)` with noise. **Do not fake an LSTM.** On stage: *"synthetic passenger load profile shaped from timetable patterns; swaps for real ETM ticketing data on deployment."*

### Schedule

| Hours | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 0–2 | **Scaffold + seed + push** | Collect timetable, coords, hire rates | Extract VRP behind fn boundary; draft `rulebook.yaml` | Read existing map component |
| 2–6 | Environment providers (simulated + Open-Meteo) | Bus/trip/consignment controllers | **Rule engine + decision trace** (before the solver) | Shell, sidebar, map layers, Impact cards vs stubs |
| 6–8 | Scenario engine | Metrics + baseline calc | Time-expanded graph + greedy assign | Consignment form + decision trace UI |
| 8–10 | **GATE 1 — first integration** | Manifest endpoints | Solver returns real assignments | Wire real trips + consignments |
| 10–14 | Repair wiring, sockets, TomTom adapter | Socket emission, fleet handoff path | Repair endpoint, WRS, EV siting | Depot ops, scenario panel, weather panel |
| 14–17 | Integration only | 30-day baseline run | SHAP, tuning | Impact dashboard real data, animations |
| **17** | **GATE 2 — FEATURE FREEZE** | | | |
| 17–19 | Bug triage, full run-through | Bug triage | Bug triage | Polish, empty states, mobile |
| 19–21 | **Record fallback demo video** | Slides | Optimality-gap slide | Screenshots |
| 21–23 | Rehearse ×3 | Rehearse | Rehearse | Rehearse |
| 23–24 | Buffer | | | |

### Gates
- **Gate 1 (H8):** if the solver returns nothing end-to-end, P3 drops the time-expanded graph and ships pure greedy nearest-feasible-trip. Ugly, demoable. **Pre-commit to this now, while rested.**
- **Gate 2 (H17):** hard freeze. Unfinished work moves to the roadmap slide. No exceptions, including P1.
- **H19 fallback video is not optional.** Live demos fail.

### Cut order if behind (cut from the bottom up)
```
6. SHAP waterfall plots
5. TomTom live provider (keep simulated)
4. EV siting module
3. Weather paths W3, W4 (keep W1, W2)
2. Local repair pass (keep greedy)
1. NEVER CUT: rule engine + decision trace, scenario engine, Impact dashboard
```

---

## 10. Frontend structure

One map-centric shell. **No separate full-page views per module** — that fragments the platform story and doubles the work.

**Layout:** left sidebar nav · full-bleed map · right contextual drawer driven by map selection · top strip for active scenario + environment state.

### Sections

**1. Impact** *(build first — highest-scoring screen)*
Baseline vs optimized cards: cost per quintal-km · **total vehicle-km added ≈ 0 (the punchline)** · mean transit time · spare capacity utilised % · incremental parcel revenue · CO₂ avoided. Plus a **network split donut**: how much volume went to bus vs. handed to fleet, by cargo class. That chart alone communicates the eligibility engine's existence.

**2. Live map**
Layers: bus trips · fleet vehicles · stops/villages · depot · APMC · charging candidates · congestion overlay · rain overlay · consignment flow lines.

**3. Book a consignment** *(Farmer)*
Form: origin · commodity · packaging type · weight · piece count · destination · ready-by · deadline · declared value.
On submit, show the **decision trace** and the plain-language `summary`. Rejections are as informative as acceptances: *"Pesticide cannot travel on a passenger bus (rule SAF-01). Routed to fleet pickup, 14:30 tomorrow, ₹340."*

**4. Depot operations** *(Admin)*
Per-trip loading manifest as a clerk would print it. Crew availability windows. Trip status board. Read-only rulebook viewer. This is your deployment-realism evidence.

**5. Environment**
Current weather (Open-Meteo, cached) · Weather Risk banding · congestion state · **provider toggle** (simulated ⇄ TomTom) · manual override sliders for rain and congestion so you can force conditions on stage.

**6. EV charging**
Candidates with score breakdown, `k` slider, coverage before/after chart. One line of context: Maharashtra's EV Policy 2025–30 mandates a fast charger at every MSRTC depot, so this answers a live government requirement, not a hypothesis.

**7. Scenarios** *(front and centre — the ADAPTATION requirement)*
Five buttons, clicked live: **vehicle out of service** · **road closure** · **demand spike (real historical day)** · **heavy rain** · **congestion surge**. Each triggers re-optimization and animates the diff. Plus reset.

### Map popups

| Marker | Contents |
|---|---|
| Bus trip | Route, next stop + ETA, passenger load %, cargo load %, manifest link |
| Village / stop | Pending consignments by class, next pickup, approach road condition |
| Charging candidate | Recommended vs existing, score breakdown, dwell fit |
| Depot | Vehicles based here, crew availability, today's parcel volume by class |

### Copy rules
Active voice, sentence case, plain verbs. "Book consignment," not "Submit." The button that says "Apply scenario" produces a banner that says "Scenario applied." Empty states give direction: *"No consignments booked yet. Book one to see how it routes."* Errors say what happened and what to do — never vague, never apologetic.

---

## 11. Demo script (7 min)

1. **(0:30) Problem, local.** 79 villages, 302k people, 94.66% agricultural land. Buses already run. MSRTC already runs a parcel service and already permits up to 50 kg of passenger luggage. We optimize an existing service.
2. **(1:00) Impact screen first.** Lead with numbers. Vehicle-km added ≈ 0.
3. **(1:30) Book two consignments live.** One accepted (soybean seed) with its decision trace. One **rejected** (pesticide) → watch it hand off to the fleet. The rejection is the moment the platform stops looking like a demo.
4. **(0:45) Depot manifest.** "This is what the parcel clerk prints."
5. **(1:30) Break something.** Cancel the 14:00 Nashik trip on stage, then force heavy rain. Watch consignments re-route and one flip to fleet on `WX-01`. This wins the adaptation criterion.
6. **(0:30) EV module.** Same data, second question, mandated by state policy.
7. **(1:00) What's real vs simulated.** Say it before a judge asks. **Real:** road network, village geography, depot routes, APMC arrival records, weather API, MSRTC luggage rules, hire-rate survey. **Simulated:** passenger load profiles, live GPS, traffic flow (unless TomTom is toggled on), Class B/C parcel demand. This slide earns trust; skipping it loses trust the moment someone probes.

---

## 12. Setup prompt (P1 — paste into your coding agent)

> I'm extending an existing full-stack project called KrishiFlow for a hackathon. Stack: React + Vite frontend, Node.js + Express backend, FastAPI Python AI engine, MongoDB with 2dsphere geospatial indexing, Socket.io realtime, JWT auth with roles (Farmer, Driver, Admin). It currently does capacitated VRP routing for farm-to-mandi logistics, plus a LightGBM mandi price model and an exponential spoilage model.
>
> **First: read the existing codebase and report back the file structure, naming conventions, error-handling pattern, and auth middleware pattern you found. Wait for my confirmation before generating code.**
>
> Then scaffold a new feature set. **Do not implement business logic.** Build the skeleton so four developers work in parallel without blocking. Every stub returns realistic, correctly-shaped mock JSON immediately, gated behind a `MOCK_MODE` env flag so real implementations replace stubs one at a time.
>
> 1. **Mongoose models** in `backend/src/models/`: `BusStop`, `BusRoute`, `BusTrip`, `Consignment`, `RuleDecision`, `EnvironmentSnapshot`, `ChargingCandidate`, `ScenarioEvent`, `OptimizationRun`. Schemas: [paste §8.1]
> 2. **Express routes** under `/api/v2/` with stub controllers matching these contracts exactly: [paste §8.2]
> 3. **Socket.io** namespace `/v2` with emitter helpers for: [paste §8.3]
> 4. **FastAPI stub endpoints** returning mock output: [paste §8.4]
> 5. **`ai-engine/config/rulebook.yaml`** — declarative rule definitions with id, description, type (hard/soft), condition expression, and penalty. Seed it with these rules: [paste §3.3]
> 6. **`ai-engine/app/providers/`** — a `TrafficProvider` ABC with `get_speed_factor(edge_ids, at_time)` and `get_incidents(bbox)`, plus a fully working `SimulatedTrafficProvider` and empty `TomTomTrafficProvider`. Same pattern for `WeatherProvider` with a working Open-Meteo implementation that caches responses to local disk.
> 7. **Seed script** `backend/scripts/seedKopargaon.js`: 15 bus stops in Kopargaon taluka, Maharashtra (Kopargaon ST Depot, Kopargaon APMC, villages Sanwatsar, Pohegaon, Kolpewadi, Dhamori, Chas Nali, Karanji Bk, Manjur, Shingnapur, Rawanda, plus Shirdi, Sangamner, Ahmednagar, Nashik, Yeola, Vaijapur — approximate real OSM coordinates); 6 bus routes with 4–8 daily departures; 30 days of consignment demand across cargo classes A/B/C/D covering wheat, maize, gram, tur, soybean, jowar, bajra, onion plus general parcels, with one deliberate 3× spike day; 8 EV charging candidate sites.
> 8. **Frontend scaffold** in `frontend/src/features/` — stub components per [paste §8.5], with sidebar nav entries and routes.
> 9. **Fully implement (not stubs):**
>    - `frontend/src/features/shared/MapLayerRegistry.js` — registry where features register `{ id, label, defaultOn, render(map, data) }`; the map shell renders toggle controls for all registered layers.
>    - `frontend/src/features/shared/apiV2.js` — typed client function per endpoint, respecting `MOCK_MODE`.
>
> Match the existing project's conventions throughout. Do not introduce new patterns.

---

## 13. Top risks

1. **Scope creep past Gate 2.** Mitigation: §2 not-building list on a whiteboard; P1 empowered to say no.
2. **Solver doesn't converge by H8.** Mitigation: Gate 1 fallback pre-decided so nobody debates it at hour 8.
3. **Demo depends on network.** Mitigation: simulated providers are default; every external API response cached to disk; fallback video recorded at H19.
4. **Weather/rules become decoration.** Mitigation: every path in §4 must terminate in a decision change. If a rule never fires in the demo, cut it or force it with a scenario.
5. **Beautiful UI, no numbers.** The rubric weights measurable gain heavily. At 3am, ship the Impact chart, not the animation.

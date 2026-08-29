# EV Charging System Issues & Fixes

## Issues Reported
1. **Cartographic map not working properly**
2. **EV Route simulation not giving correct results**

## Quick Fix - Restart Backend Server First

⚠️ **CRITICAL**: Before testing anything, you need to **restart the backend server** to fix MOCK_MODE issue!

```bash
# Stop current backend (Ctrl+C in terminal)
# Then restart:
cd backend
npm run dev
```

This fixes BOTH the bus-parcel route validation AND ensures EV endpoints work correctly.

---

## Issue 1: Cartographic Map Not Working

### Root Cause Analysis
The MapLibre GL map in `EvFleetSimulator.jsx` depends on:
1. Map style loading from `mapTheme.js`
2. Correct geographic coordinates from `CORRIDOR_COORDS`
3. MapLibre GL library properly installed

### Diagnostic Steps

**Step 1: Check MapLibre Installation**
```bash
cd frontend
npm list maplibre-gl
```

Should show: `maplibre-gl@X.X.X`

If not found:
```bash
npm install maplibre-gl
```

**Step 2: Check Console Errors**
Open browser DevTools Console when viewing EV Simulator. Look for:
- ❌ Map style loading errors
- ❌ `loadMapStyle is not a function`
- ❌ CORS or network errors loading map tiles
- ❌ GL JS errors

**Step 3: Verify Map Style File**
Check `frontend/src/shared/map/mapTheme.js` exists and has `loadMapStyle` export.

### Common Fixes

**Fix 1: Missing maplibre-gl CSS**
Check that `EvFleetSimulator.jsx` line 3 has:
```javascript
import 'maplibre-gl/dist/maplibre-gl.css';
```

**Fix 2: Map Container Sizing**
The map container must have explicit height. Check CSS:
```jsx
<div ref={containerRef} style={{ width: '100%', height: '500px' }} />
```

**Fix 3: Coordinates Validation**
Verify CORRIDOR_COORDS uses [Longitude, Latitude] format (NOT [Lat, Lng]):
```javascript
const CORRIDOR_COORDS = {
  'KPG-DEPOT': [74.4765, 19.8826],  // ✓ [lng, lat]
  'NASHIK': [73.7898, 19.9975],      // ✓ [lng, lat]
};
```

---

## Issue 2: EV Route Simulation Not Giving Correct Results

### Expected Behavior

When you request EV route optimization, the system should:

1. **Calculate energy consumption** based on:
   - Distance (km)
   - Battery capacity (kWh)
   - Current State of Charge (%)
   - Cargo weight (kg)
   - Consumption rate: `0.22 kWh/km + (weight/1000 * 0.04) kWh/km`

2. **Predict battery at destination**:
   - If predicted SoC < 20% → Insert charging stop
   - If predicted SoC >= 20% → Direct route

3. **Select charging station**:
   - Find nearest station along corridor
   - Calculate charging time to reach 85% SoC
   - Update final destination SoC

### Diagnostic Test

**Test the API directly:**

```bash
# Windows PowerShell
$body = @{
    batteryCapacityKwh = 40
    currentSoc = 30
    cargoWeightKg = 1500
    distanceKm = 70
    originCode = "KPG-DEPOT"
    destCode = "NASHIK"
} | ConvertTo-Json

# Get your auth token first (login to get JWT)
$token = "YOUR_JWT_TOKEN_HERE"

Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/v2/ev/route-optimize" `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "vehicleType": "E-Pickup",
  "batteryCapacityKwh": 40,
  "initialSoc": 30,
  "cargoWeightKg": 1500,
  "distanceKm": 70,
  "consumptionRateKwhPerKm": 0.28,  // 0.22 + (1.5 * 0.04)
  "totalEnergyRequiredKwh": 19.6,   // 70 * 0.28
  "predictedSocWithoutCharge": -19,  // (12 - 19.6) / 40 = NEGATIVE
  "requiresChargingStop": true,
  "chargingStop": {
    "station": {
      "name": "Kopargaon ST Depot EV Fast Charger",
      "code": "KPG-DEPOT",
      "chargerKw": 60,
      "portsAvailable": 3
    },
    "chargedEnergyKwh": 22.0,      // Charge to 85% (34 kWh total)
    "dwellTimeMin": 22,             // 22 kWh / 60 kW * 60 min
    "postChargeSocAtDest": 36       // After charging and travel
  },
  "co2SavedKg": 18.6,               // 70 * 0.265
  "fuelCostSavedRs": 455            // 70 * 6.5
}
```

### Common Issues & Fixes

**Issue 2.1: API Returns Error**

Check if backend routes are registered. Verify in `backend/src/routes/apiV2Routes.js`:
```javascript
router.post('/ev/route-optimize', apiLimiter, protect, evController.optimizeEVRoute);
```

**Issue 2.2: Wrong Charging Station Selected**

The current logic picks the station matching `originCode`:
```javascript
selectedStation = EV_CHARGING_STATIONS.find((s) => s.code === originCode) || EV_CHARGING_STATIONS[0];
```

**Enhancement**: Pick nearest station along route corridor using distance calculation.

**Issue 2.3: Negative SoC Not Handled**

Check line in `evController.js`:
```javascript
const predictedSocAtDest = Math.round((remainingEnergyAtDestKwh / capacity) * 100);
// Can be negative if energy required > current energy
```

Fix: Add bounds checking:
```javascript
const predictedSocAtDest = Math.max(-50, Math.round((remainingEnergyAtDestKwh / capacity) * 100));
```

**Issue 2.4: Charging Time Calculation Incorrect**

Current formula:
```javascript
chargingTimeMin = Math.round((chargedEnergyKwh / selectedStation.chargerKw) * 60);
```

This assumes:
- Linear charging rate (not accurate for batteries, but acceptable approximation)
- No charging losses (real-world is ~85-90% efficient)

**Improvement**: Add efficiency factor:
```javascript
const chargingEfficiency = 0.88;
chargingTimeMin = Math.round((chargedEnergyKwh / (selectedStation.chargerKw * chargingEfficiency)) * 60);
```

---

## Issue 3: Frontend Simulation Animation

### Check Simulation Progress Logic

In `EvFleetSimulator.jsx`, the simulation uses `progress` state (0-100):

1. **0-40%**: Origin → Charging Station
2. **40-45%**: Parked at charging station (dwell time)
3. **45-100%**: Charging Station → Destination

Verify this matches your route:
```javascript
const currentVehCoords = useMemo(() => {
  if (progress <= 40) {
    // Leg 1: Origin to charger
    const ratio = progress / 40;
    return interpolate(originCoords, chargingStationCoords, ratio);
  } else if (progress <= 45) {
    // Charging dwell
    return chargingStationCoords;
  } else {
    // Leg 2: Charger to destination
    const ratio = (progress - 45) / 55;
    return interpolate(chargingStationCoords, destCoords, ratio);
  }
}, [progress, originCoords, chargingStationCoords, destCoords]);
```

### Battery SoC Animation

Battery should drain during travel and recharge during stop:

```javascript
const liveSoc = useMemo(() => {
  if (!optResult) return initialSoc;
  
  if (progress <= 40) {
    // Drain from initial to arrival at charger
    const ratio = progress / 40;
    const drainToCharger = /* calculate based on distance */;
    return initialSoc - (drainToCharger * ratio);
  } else if (progress <= 45) {
    // Charging animation (fast increase)
    const chargeRatio = (progress - 40) / 5;
    return arrivalSoc + (85 - arrivalSoc) * chargeRatio;
  } else {
    // Drain from 85% to final destination
    const ratio = (progress - 45) / 55;
    return 85 - (85 - finalSoc) * ratio;
  }
}, [progress, optResult]);
```

---

## Testing Checklist

### Backend Testing
- [ ] Backend server restarted (MOCK_MODE=false)
- [ ] EV route optimize endpoint accessible: `POST /api/v2/ev/route-optimize`
- [ ] Test with Postman/curl returns valid response
- [ ] Check backend logs for errors: `node backend/src/index.js` or `npm run dev`

### Frontend Testing
- [ ] MapLibre GL installed: `npm list maplibre-gl`
- [ ] Map container visible on screen
- [ ] No console errors related to map or GL
- [ ] Vehicle marker appears on map
- [ ] Route line drawn correctly
- [ ] Charging station markers visible

### Simulation Testing
- [ ] Select E-Pickup vehicle with low battery (< 40%)
- [ ] Start simulation (Play button)
- [ ] Vehicle moves along route
- [ ] Battery SoC drains during travel
- [ ] Vehicle stops at charging station (if required)
- [ ] Battery SoC increases during charging stop
- [ ] Vehicle continues to destination
- [ ] Final SoC matches predicted value

---

## Debug Scripts

**Test EV Route Calculation:**
```bash
node -e "
const energy = 70 * (0.22 + (1.5 * 0.04));
const current = 40 * 0.30;
const remaining = current - energy;
const finalSoc = (remaining / 40) * 100;
console.log('Energy required:', energy, 'kWh');
console.log('Current energy:', current, 'kWh');
console.log('Remaining:', remaining, 'kWh');
console.log('Final SoC:', finalSoc, '%');
console.log('Needs charging:', finalSoc < 20);
"
```

---

## Files to Check

### Backend
- `backend/src/controllers/evController.js` - Route optimization logic
- `backend/src/routes/apiV2Routes.js` - API endpoint registration (line ~70)
- `backend/.env` - MOCK_MODE=false setting

### Frontend
- `frontend/src/features/logistics/EvFleetSimulator.jsx` - Main EV simulation component
- `frontend/src/shared/map/mapTheme.js` - Map style loading
- `frontend/src/services/apiV2.js` - API client for /ev/route-optimize
- `frontend/package.json` - Check maplibre-gl dependency

---

## Next Steps

1. **Restart backend server** (fixes both bus-parcel and EV issues)
2. **Test EV API endpoint directly** with curl/Postman
3. **Open EV Simulator in browser** and check console for errors
4. **Share specific error messages** if issues persist

Would you like me to:
- Create a test script to verify the EV route calculations?
- Fix specific map rendering issues?
- Improve the charging station selection algorithm?
- Add better error handling to the EV simulator?

# Fix: Route Validation "Failed to validate route"

## Root Cause
The backend server is running with **MOCK_MODE=true** (cached from initial startup), returning mock stop IDs like "stop-001" instead of real MongoDB ObjectIds.

## Evidence
✅ Database is correctly seeded with 15 stops and 7 routes  
✅ Route validation logic works perfectly (tested directly)  
✅ `validateRoute()` finds KPG-DEPOT → SHIRDI route successfully  
✅ 6 trips available for today (2026-08-29)  
❌ Frontend receives mock data with IDs like "stop-001" instead of ObjectIds

## Solution

### 1. Restart Backend Server

**If running in terminal:**
```bash
# Stop the backend (Ctrl+C in the terminal)
# Then restart:
cd backend
npm run dev
```

**If running as Windows service/background:**
```powershell
# Find and kill Node processes
Get-Process node | Stop-Process -Force
# Then restart:
cd backend
npm run dev
```

### 2. Verify Fix

After restarting, check browser DevTools:
1. Open Console
2. Look for API call to `/api/v2/bus/stops`
3. Verify response has real ObjectIds:
   ```json
   {
     "id": "6a92c597e8587c280c6814fc",  // ✓ Real ObjectId
     "code": "KPG-DEPOT",
     "name": "Kopargaon ST Depot"
   }
   ```
   NOT mock IDs:
   ```json
   {
     "id": "stop-001",  // ✗ Mock ID
     "code": "KPG-DEPOT"
   }
   ```

### 3. Test Route Preview

1. Open Consignment Form
2. Select **Origin**: Kopargaon ST Depot (KPG-DEPOT)
3. Select **Destination**: Shirdi Bus Stand (SHIRDI)
4. Should show:
   - ✅ "Route found: Kopargaon ↔ Shirdi"
   - ✅ "Distance: 16.2km, Travel Time: 25 min"
   - ✅ "6 trips available on 2026-08-29"

## Technical Details

### Database State (Verified ✓)
```
Stops: 15 stops loaded
Routes: 7 routes loaded
Trips: 1080 trips for next 15 days
R-SHIRDI route: KPG-DEPOT (seq:0) → SHIRDI (seq:1)
```

### Environment Setting (Verified ✓)
```env
# backend/.env
MOCK_MODE=false
```

### API Endpoints
- GET `/api/v2/bus/stops` - Returns all stops
- GET `/api/v2/bus/route-preview?originStopId=X&destStopId=Y&date=YYYY-MM-DD`

## Why This Happened

1. Backend server started initially with MOCK_MODE=true (development default)
2. MOCK_MODE was changed to false in .env
3. Server kept running with old cached environment variables
4. Node.js reads process.env at startup, not dynamically

## Prevention

Always restart the backend after changing .env files:
```bash
# After editing backend/.env:
cd backend
# Ctrl+C to stop
npm run dev  # Restart
```

## Test Scripts Created

Run these to verify database and logic (no server restart needed):
```bash
node backend/scripts/testStopsAPI.js          # Check stops in DB
node backend/scripts/testRoutePreviewAPI.js   # Test route validation logic
node backend/scripts/testRoutes.js            # Verify R-SHIRDI route
```

All tests pass ✓ - the issue is purely server restart needed.

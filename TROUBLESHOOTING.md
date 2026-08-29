# Troubleshooting Guide

## Backend Crashes / Won't Start

### Issue 1: Logger Import Error
**Error:** `Cannot find module '../config/logger'`  
**Fixed:** ✅ Changed to `'../utils/logger'` in weatherService.js

### Issue 2: React Hook Import Error (Frontend)
**Error:** `useEffect is not a function` or hooks error in socketService  
**Fixed:** ✅ Changed from `require('react')` to `import { useEffect } from 'react'`

### Issue 3: checkAiEngineHealth is not a function
**Error:** `TypeError: checkAiEngineHealth is not a function`  
**Fixed:** ✅ Added `checkAiEngineHealth` function to aiEngineService.js and exported it

### Issue 4: Socket.io Connection Error
**Symptoms:** Backend starts but socket connections fail  
**Check:**
```bash
# Verify socket.io is installed
cd backend
npm list socket.io

# If missing:
npm install socket.io
```

### Issue 4: AI Engine Connection Error
**Symptoms:** Backend starts but consignment creation fails with "AI engine error"  
**Check:**
1. AI engine is running: `http://localhost:8000/health`
2. Backend .env has correct `AI_ENGINE_URL=http://localhost:8000`
3. Check backend logs for axios timeout errors

**Workaround:** Set `MOCK_MODE=true` in backend/.env to bypass AI engine

### Issue 5: MongoDB Connection Error
**Symptoms:** Backend crashes on startup with "MongooseError"  
**Check:**
```bash
# Verify MongoDB is running
mongosh

# If not running, start MongoDB service
# Windows: net start MongoDB
# Or use MongoDB Compass
```

### Issue 6: Missing Dependencies
**Symptoms:** `Cannot find module 'axios'` or similar  
**Fix:**
```bash
cd backend
npm install

cd ../ai-engine
pip install -r requirements.txt

cd ../frontend
npm install
```

---

## AI Engine Crashes / Won't Start

### Issue 1: Python Version
**Error:** `SyntaxError` or version-related errors  
**Check:**
```bash
python --version  # Should be 3.8+
```

### Issue 2: Missing Python Dependencies
**Error:** `ModuleNotFoundError: No module named 'fastapi'`  
**Fix:**
```bash
cd ai-engine
pip install -r requirements.txt
```

### Issue 3: YAML Parsing Error
**Error:** `yaml.scanner.ScannerError` in rulebook.yaml  
**Check:** `ai-engine/config/rulebook.yaml` for syntax errors

### Issue 4: Weather Cache Permission Error
**Error:** `PermissionError` when creating weather_cache/  
**Fix:**
```bash
cd ai-engine
mkdir weather_cache
# Or run with admin privileges
```

---

## Frontend Issues

### Issue 1: API Connection Error
**Symptoms:** "Failed to load data" or network errors  
**Check:**
1. Backend is running: `http://localhost:5000/health`
2. Frontend .env has `VITE_API_URL=http://localhost:5000`
3. Check browser console for CORS errors

### Issue 2: Socket Connection Fails
**Symptoms:** No real-time updates, console shows socket errors  
**Check:**
1. Backend Socket.io is running
2. Frontend socketService is imported correctly
3. Check for CORS issues in backend

### Issue 3: Map Tiles Not Loading
**Symptoms:** Gray map, no OSM tiles  
**Cause:** No internet connection (OSM tiles require internet)  
**Workaround:** Use mobile hotspot or pre-cached tiles

### Issue 4: Login Fails
**Symptoms:** "Invalid credentials" even with correct login  
**Check:**
1. Database is seeded: `node backend/scripts/seedKopargaon.js`
2. User exists in database:
   ```bash
   mongosh krishiflow
   db.users.findOne({phone: "9876543210"})
   ```
3. JWT_SECRET is set in backend/.env

---

## Data Issues

### Issue 1: No Trips Returned
**Symptoms:** Consignment creation fails with "No trips serve this route"  
**Check:**
1. Database is seeded
2. Date range is correct (seeded trips: 2026-08-29 to 2026-09-27)
3. Origin/dest stops exist

**Fix:**
```bash
cd backend
node scripts/seedKopargaon.js
```

### Issue 2: Weather API Timeout
**Symptoms:** First weather call takes 10+ seconds  
**Cause:** OpenMeteo API slow on first fetch  
**Workaround:** Pre-warm cache:
```bash
curl "http://localhost:8000/forecast/weather?lat=19.88&lng=74.48&hours_ahead=0"
```

### Issue 3: Decision Trace Not Saved
**Symptoms:** explainConsignment returns 404  
**Check:**
1. RuleDecision was created during consignment creation
2. MongoDB connection is stable
3. Check backend logs for errors during AI engine call

---

## Performance Issues

### Issue 1: Solver Takes Too Long
**Symptoms:** Consignment creation > 5 seconds  
**Check:**
1. Number of candidate trips (should be < 50)
2. AI engine is not in debug mode
3. Network latency between backend and AI engine

**Workaround:** Use MOCK_MODE for faster testing

### Issue 2: Map Rendering Slow
**Symptoms:** Map takes 5+ seconds to load  
**Check:**
1. Number of stops (should be 15-20)
2. Browser performance
3. MapLibre GL JS loaded correctly

---

## Quick Fixes

### Reset Everything
```bash
# Stop all services (Ctrl+C in each terminal)

# Reset database
mongosh krishiflow
db.dropDatabase()
exit

# Re-seed
cd backend
node scripts/seedKopargaon.js

# Restart services
# Terminal 1: cd ai-engine && python -m uvicorn app.main:app --reload
# Terminal 2: cd backend && npm run dev
# Terminal 3: cd frontend && npm run dev
```

### Check All Services Are Running
```bash
# AI Engine
curl http://localhost:8000/health

# Backend
curl http://localhost:5000/health

# Frontend (open in browser)
http://localhost:3000
```

### View Logs
```bash
# Backend logs
cd backend
tail -f logs/combined.log

# AI Engine logs (console output)
# Check terminal where uvicorn is running

# Frontend logs
# Check browser console (F12)
```

---

## Common Error Messages

### "Cannot find module '../utils/logger'"
**Fixed:** ✅ Logger path corrected

### "useEffect is not a function"
**Fixed:** ✅ React hooks import corrected

### "MongoServerError: E11000 duplicate key error"
**Cause:** Trying to re-seed without dropping database  
**Fix:** Drop database first or delete existing records

### "AxiosError: connect ECONNREFUSED"
**Cause:** AI engine not running or wrong URL  
**Fix:** Start AI engine, check AI_ENGINE_URL in .env

### "JWT malformed"
**Cause:** Invalid auth token  
**Fix:** Login again to get fresh token

### "ValidationError: Path `originStopId` is required"
**Cause:** Missing required fields in consignment  
**Fix:** Ensure all required fields are provided in form

---

## Emergency Demo Mode

If everything fails right before demo:

### Option 1: MOCK_MODE
```bash
# backend/.env
MOCK_MODE=true

# ai-engine/.env
MOCK_MODE=true
```
**Result:** All APIs return realistic mock data instantly

### Option 2: Fallback Video
Play pre-recorded demo video showing the working system

### Option 3: Slide Deck Only
Present architecture diagrams and explain the design without live demo

---

## Getting Help

1. Check error logs:
   - Backend: `backend/logs/combined.log`
   - AI Engine: Terminal output
   - Frontend: Browser console (F12)

2. Test each service independently:
   - AI Engine: `curl http://localhost:8000/health`
   - Backend: `curl http://localhost:5000/health`
   - Frontend: Check Network tab in browser devtools

3. Verify environment variables:
   - backend/.env (AI_ENGINE_URL, MONGODB_URI, JWT_SECRET)
   - ai-engine/.env (MOCK_MODE, WEATHER_PROVIDER)
   - frontend/.env (VITE_API_URL)

4. Check dependencies:
   - Backend: `npm list` in backend/
   - AI Engine: `pip list` in ai-engine/
   - Frontend: `npm list` in frontend/

---

**Most Common Issue:** Logger path was wrong (fixed ✅)  
**Second Most Common:** React hooks imported incorrectly (fixed ✅)  
**Third Most Common:** AI engine not running → Set MOCK_MODE=true

You should be good to go now! 🚀

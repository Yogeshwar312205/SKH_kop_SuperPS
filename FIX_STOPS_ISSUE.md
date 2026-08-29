# Fix: Origin/Destination Stops Not Showing

## 🐛 Problem
The origin and destination dropdown menus in the Book Consignment form are empty.

## 🔍 Root Cause
Database was not seeded with bus stops data.

## ✅ Solution (5 minutes)

### Step 1: Ensure MongoDB is Running
```powershell
# Check if MongoDB is running
mongosh

# If it connects, you'll see:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017
# Using MongoDB: ...

# Type 'exit' to close
exit
```

**If MongoDB is NOT running:**
- Start MongoDB service
- Or use MongoDB Compass

---

### Step 2: Seed the Database
```powershell
cd D:\SKH_kop_SuperPS\backend
node scripts\seedKopargaon.js
```

**Expected Output:**
```
[INFO] Seeding Kopargaon network...
✓ Cleared existing data
✓ Created 15 bus stops
✓ Created 6 routes
✓ Created 1080 trips (30 days coverage)
✓ Created 8 EV charging candidates
✓ Created test farmer account: 9876543210 / farmer123
Database seeded successfully!
```

---

### Step 3: Verify Stops Were Created
```powershell
mongosh krishiflow
```

Then in MongoDB shell:
```javascript
// Count stops (should be 15)
db.busstops.countDocuments()

// List all stops
db.busstops.find({}, {name: 1, code: 1, type: 1}).pretty()

// Exit
exit
```

**You should see 15 stops:**
1. Kopargaon Bus Stand (depot)
2. Kopargaon APMC (mandi)
3. Shirdi
4. Nashik APMC
5. Sangamner
6. Ahmednagar
7-15. Other villages and destinations

---

### Step 4: Restart Backend (if running)
```powershell
# Stop backend (Ctrl+C in backend terminal)

# Restart
cd D:\SKH_kop_SuperPS\backend
npm run dev
```

**Check logs for:**
```
[INFO] Connected to database: krishiflow
[INFO] KrishiFlow Production Backend Core running on http://localhost:5000
```

---

### Step 5: Test API Directly
```powershell
# In a new PowerShell window:
curl http://localhost:5000/api/v2/bus/stops
```

**Should return JSON with 15 stops:**
```json
{
  "success": true,
  "source": "database",
  "count": 15,
  "stops": [
    {
      "id": "67...",
      "name": "Kopargaon Bus Stand",
      "code": "KPG-DEPOT",
      "type": "depot",
      "district": "Ahmednagar",
      "location": {
        "type": "Point",
        "coordinates": [74.48, 19.88]
      }
    },
    ...
  ]
}
```

---

### Step 6: Refresh Frontend
```powershell
# In browser, hard refresh:
Ctrl + Shift + R

# Or clear Vite cache:
cd D:\SKH_kop_SuperPS\frontend
Remove-Item -Recurse -Force node_modules\.vite
npm run dev
```

---

### Step 7: Test Consignment Form

1. **Login:** 9876543210 / farmer123
2. **Click:** Bus Parcel tab
3. **Click:** Book Consignment tab
4. **Check:** Origin Stop dropdown should now show 15 options:
   ```
   Select origin...
   Kopargaon Bus Stand (KPG-DEPOT)
   Kopargaon APMC (KPG-APMC)
   Shirdi (SHIRDI)
   Nashik APMC (NASHIK)
   ...
   ```

5. **Fill form:**
   - Origin: Kopargaon Bus Stand
   - Destination: Nashik APMC
   - Commodity: Soybean Seeds
   - Cargo Class: A
   - Weight: 35 kg
   - Pieces: 1
   - Max piece weight: 35 kg
   - Ready by: (today, 8:00 AM)
   - Deadline: (today, 10:00 PM)

6. **Click:** Book Consignment

7. **Expected Result:**
   - Loading spinner
   - Green success banner: "✓ Assigned to Bus Network"
   - Decision trace with rule evaluations
   - Plain-language summary

---

## 🚨 If Still Not Working

### Check 1: Backend Console for Errors
Look for:
```
Error: Could not load bus stops
Failed to fetch data from /api/v2/bus/stops
```

**Solution:** Check backend is running on port 5000

---

### Check 2: Browser Console for Errors
Press F12 → Console tab

Look for:
```
Failed to load stops: Network Error
GET http://localhost:5000/api/v2/bus/stops net::ERR_CONNECTION_REFUSED
```

**Solution:** Backend not running, start it

---

### Check 3: CORS Issues
If you see:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:** Check `backend/src/server.js` has:
```javascript
app.use(cors({ origin: '*', credentials: true }));
```

---

### Check 4: MongoDB Connection
Backend logs should show:
```
[INFO] Connected to database: krishiflow
```

If you see:
```
[ERROR] MongoDB connection error
```

**Solution:** 
1. Start MongoDB service
2. Check `MONGODB_URI` in `backend/.env`

---

## 📊 What the Seeding Script Creates

### 15 Bus Stops:
| Stop Name | Code | Type | Use |
|-----------|------|------|-----|
| Kopargaon Bus Stand | KPG-DEPOT | depot | Origin (pickup) |
| Kopargaon APMC | KPG-APMC | apmc_mandi | Destination (delivery) |
| Shirdi | SHIRDI | regular | Tourist destination |
| Nashik APMC | NASHIK | apmc_mandi | Major mandi |
| Sangamner | SANGAMNER | regular | District town |
| Ahmednagar | ANAGAR | regular | District HQ |
| Yeola | YEOLA | regular | Town |
| Vaijapur | VAIJAPUR | regular | Town |
| Rahuri | RAHURI | regular | Village |
| Rahata | RAHATA | regular | Village |
| Niphad | NIPHAD | regular | Village |
| Kalwan | KALWAN | regular | Village |
| Malegaon | MALEGAON | regular | City |
| Sinnar | SINNAR | regular | Town |
| Belapur | BELAPUR | regular | Village |

### 6 Routes:
1. **R-SHIRDI:** Kopargaon → Shirdi (35 km, 6 trips/day)
2. **R-NASHIK:** Kopargaon → Nashik (90 km, 6 trips/day)
3. **R-SANGAMNER:** Kopargaon → Sangamner (45 km, 6 trips/day)
4. **R-ANAGAR:** Kopargaon → Ahmednagar (75 km, 6 trips/day)
5. **R-YEOLA:** Kopargaon → Yeola (50 km, 6 trips/day)
6. **R-VAIJAPUR:** Kopargaon → Vaijapur (60 km, 6 trips/day)

### 1080 Trips:
- Coverage: 2026-08-29 to 2026-09-27 (30 days)
- Frequency: 6 departures per route per day
- Times: 06:00, 09:00, 12:00, 14:00, 16:00, 18:00
- Spare capacity: 50-120 kg per trip

---

## ✅ Success Checklist

- [ ] MongoDB is running
- [ ] `node scripts\seedKopargaon.js` completed successfully
- [ ] `db.busstops.countDocuments()` returns 15
- [ ] Backend is running without errors
- [ ] `curl http://localhost:5000/api/v2/bus/stops` returns 15 stops
- [ ] Frontend refreshed (Ctrl+Shift+R)
- [ ] Login works (9876543210 / farmer123)
- [ ] Bus Parcel tab loads
- [ ] Origin dropdown shows 15 stops
- [ ] Destination dropdown shows 15 stops
- [ ] Can submit consignment form

---

**Once all steps complete, the stops dropdown will work! 🎉**

See `BUS_PARCEL_FLOW.md` for complete system flow explanation.

# Clear Frontend Cache & See New Components

The new bus-parcel system has been fully integrated! Here's how to see it:

## Quick Steps

### 1. Stop Frontend (if running)
Press `Ctrl+C` in the frontend terminal

### 2. Clear Node Cache
```bash
cd frontend
Remove-Item -Recurse -Force node_modules\.vite
```

### 3. Restart Frontend
```bash
npm run dev
```

### 4. Hard Refresh Browser
- **Chrome/Edge:** `Ctrl + Shift + R`
- **Firefox:** `Ctrl + F5`
- Or open DevTools (F12) → Network tab → Check "Disable cache"

---

## Where to Find the Bus-Parcel System

### Option 1: Navigation Tab (New!)
1. Login to the app (farmer account: 9876543210 / farmer123)
2. Look at the bottom navigation bar
3. Click the **"Bus Parcel"** tab (📦 icon)
4. You'll see 4 sub-tabs:
   - **Book Consignment** - Form with decision trace
   - **Impact** - Dashboard with metrics
   - **Weather** - WRS banding and scenario testing
   - **Network** - Map with bus stops

### Option 2: Direct URL
Navigate to: `http://localhost:3000` (will show Bus Parcel tab after login)

---

## What You Should See

### ✅ New Bottom Nav Item
```
[Today] [Price] [Vehicle] [📦 Bus Parcel]
```

### ✅ Bus Parcel Screen with 4 Tabs
```
[📦 Book Consignment] [📈 Impact] [☁️ Weather] [🗺️ Network]
```

### ✅ Full Features
- **Book Consignment:** 
  - Form with all fields (origin, dest, commodity, cargo class, etc.)
  - Real-time decision trace after submission
  - Plain-language summary
  - Color-coded rule results (PASS/FAIL/WARN)

- **Impact Dashboard:**
  - 6 metric cards (cost, vehicle-km, transit time, etc.)
  - Network split bar chart (bus vs fleet %)
  - Cargo class breakdown (A/B/C/D)
  - Date selector for historical comparison

- **Weather Panel:**
  - Current weather metrics
  - Weather Risk Score with LOW/MEDIUM/HIGH banding
  - Provider toggle (simulated ⇄ OpenMeteo)
  - Manual override sliders for scenario testing

- **Network Map:**
  - 15 bus stops on MapLibre GL
  - Depot/mandi differentiation
  - Layer toggle controls
  - Network summary

---

## Still Seeing Old Frontend?

### Clear Browser Cache Completely
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Or Use Incognito/Private Window
- Chrome: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`
- Edge: `Ctrl + Shift + N`

### Or Clear All Vite Cache
```bash
cd frontend
Remove-Item -Recurse -Force node_modules\.vite
Remove-Item -Recurse -Force dist
npm run dev
```

---

## Troubleshooting

### "Bus Parcel tab not showing"
**Check:** Did you restart the frontend after the code changes?
```bash
cd frontend
npm run dev
```

### "Components not loading"
**Check:** Are there any errors in the browser console (F12)?

### "Map tiles not loading"
**Cause:** No internet connection (OSM tiles require internet)
**Workaround:** Use mobile hotspot

### "Decision trace not appearing"
**Check:** 
1. Backend is running (`http://localhost:5000/health`)
2. AI Engine is running (`http://localhost:8000/health`)
3. Or set `MOCK_MODE=true` in backend/.env for instant mock responses

---

## Demo Flow

1. **Login:** 9876543210 / farmer123
2. **Click "Bus Parcel" tab** in bottom navigation
3. **Book Consignment tab:**
   - Fill form: Soybean Seeds, 35 kg, Kopargaon → Nashik
   - Click "Book Consignment"
   - See decision trace with plain-language summary
4. **Impact tab:**
   - See vehicle-km ≈ 0 ★
   - Network split: 68% bus, 32% fleet
5. **Weather tab:**
   - See WRS: 42/100 - LOW
   - Slide rain to 95% → WRS jumps to HIGH
6. **Network tab:**
   - See 15 bus stops on map
   - Toggle layers

---

**The new bus-parcel system is now fully integrated into the main app! 🚀**

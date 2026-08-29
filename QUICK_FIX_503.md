# 🔧 Quick Fix for 503 Error

## ✅ What I Fixed:

Added `MOCK_MODE=true` to `backend/.env` file. This makes the backend return mock data immediately instead of trying to connect to the AI Engine (which may not be running).

---

## 🚀 Steps to Fix:

### 1. Restart Backend
```powershell
# Go to backend terminal
# Press Ctrl+C to stop backend

# Then restart:
cd D:\SKH_kop_SuperPS\backend
npm run dev
```

### 2. Refresh Browser
```
Ctrl + Shift + R
```

### 3. Try Booking Again
- Go to Bus Parcel tab
- Fill the form
- Click "Book Consignment"
- Should work now with mock data!

---

## 📋 What MOCK_MODE Does:

With `MOCK_MODE=true`:
- ✅ Backend returns instant mock responses
- ✅ No need for AI Engine to be running
- ✅ No rule evaluation (returns fake decision trace)
- ✅ Perfect for UI testing

**Mock Response Example:**
```
✓ Assigned to Bus Network

"Assigned to 16:10 Kopargaon→Shirdi. Rain risk is moderate — 
use a lined sack."

Decision Trace:
✓ SAF-01: PASS - Not hazardous
✓ PHY-01: PASS - 35 kg ≤ 50 kg limit
⚠ WX-01: WARN - Rain 62%, jute not waterproof → +₹40
```

---

## 🔄 To Use Real AI Engine Later:

### Step 1: Start AI Engine
```powershell
cd D:\SKH_kop_SuperPS\ai-engine
python -m uvicorn app.main:app --reload
```

### Step 2: Change backend/.env
```
MOCK_MODE=false
```

### Step 3: Restart Backend
```powershell
cd D:\SKH_kop_SuperPS\backend
npm run dev
```

---

## ✅ Expected Result After Fix:

When you click "Book Consignment", you should see:

1. **Loading spinner** (brief)
2. **Green success banner:**
   ```
   ✓ Assigned to Bus Network
   
   "Assigned to 16:10 Kopargaon→Shirdi. Rain risk is moderate — 
   use a lined sack. The 14:00 had only 18 kg spare."
   ```
3. **Decision Trace** with color-coded rules
4. **Consignment Details:**
   - ID, Network, Cost, Weather Risk Score

---

**Just restart backend and try again! It will work with mock data now! 🎉**

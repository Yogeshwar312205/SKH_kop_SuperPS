# Bus-Parcel System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- ✅ Node.js v16+ installed
- ✅ MongoDB Atlas account (or local MongoDB)
- ✅ Git installed

---

## Step 1: Clone and Setup

```powershell
# Navigate to project
cd D:\SKH_kop_SuperPS

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Configure Environment

### Backend Configuration
Create/update `backend/.env`:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Mode (set to true for testing without AI Engine)
MOCK_MODE=true

# AI Engine (optional)
AI_ENGINE_URL=http://localhost:8000

# JWT Secret
JWT_SECRET=your-secret-key-here

# Port
PORT=5000
```

---

## Step 3: Seed Database

```powershell
cd backend
node scripts/seedKopargaon.js
```

**Expected Output**:
```
✓ Connected to MongoDB
✓ Cleared existing bus-parcel data
✓ Created 15 bus stops
✓ Created 6 routes
✓ Created 1080 trips
✓ Created 8 EV charging candidates
✓ Seed completed successfully!
```

---

## Step 4: Start Backend

```powershell
cd backend
npm start
```

**Expected Output**:
```
[2026-08-29 16:00:00] info: MongoDB Atlas Connected Successfully
[2026-08-29 16:00:00] info: Connected to database: test
[2026-08-29 16:00:01] info: Server running on port 5000
[2026-08-29 16:00:01] info: MOCK_MODE enabled - using mock AI Engine responses
```

Backend now running at: **http://localhost:5000**

---

## Step 5: Start Frontend

Open a **new terminal**:

```powershell
cd frontend
npm run dev
```

**Expected Output**:
```
VITE v4.x.x ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

Frontend now running at: **http://localhost:3000**

---

## Step 6: Login and Test

### Login
1. Open **http://localhost:3000**
2. Click **Login**
3. Use test farmer account:
   - **Email**: `farmer@test.com`
   - **Password**: `password123`

### Navigate to Bus-Parcel
1. After login, you'll see the **Farmer Dashboard**
2. Click on the **Bus-Parcel** tab (5th tab)

### Test Booking Flow

#### 1. Book Consignment Tab
```
✅ Select Origin: Kopargaon ST Depot
✅ Select Destination: Shirdi Bus Stand
   → Route Preview appears: "1 route available, 25 min"

✅ Enter Commodity: Soybean Seeds
   → Classification shows: ✓ AGRICULTURAL • 95% confidence • Bus Eligible

✅ Select Packaging: Jute Sack
✅ Enter Weight: 35 kg
✅ Enter Pieces: 1

✅ Click "Book Consignment"
   → Success! Booking code: BP-20260829-00001
   → Decision Trace shows all rules passed
```

#### 2. Test Hazardous Material
```
✅ Enter Commodity: Pesticide
   → Classification shows: ✗ HAZARDOUS • 98% confidence • Not Bus Eligible
   → Submit button disabled
   → Warning: "Cannot be transported on passenger buses"
```

#### 3. My Bookings Tab
```
✅ See your booking in the list
✅ Search by booking code
✅ Filter by status
```

#### 4. Impact Dashboard Tab
```
✅ View real-time metrics
✅ See cost savings
✅ View daily trends
```

#### 5. Bus Network Tab
```
✅ Explore stops
✅ View routes
✅ Check trip capacity
```

---

## 🧪 API Testing (Optional)

### Test Endpoints with curl or Postman

#### 1. Get Bus Stops
```bash
GET http://localhost:5000/api/v2/bus/stops
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 2. Classify Commodity
```bash
POST http://localhost:5000/api/v2/commodity/classify
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "commodity": "Soybean Seeds",
  "packagingType": "jute-sack",
  "weightKg": 35,
  "pieceCount": 1
}
```

#### 3. Create Consignment
```bash
POST http://localhost:5000/api/v2/consignments
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "originStopId": "STOP_ID_HERE",
  "destStopId": "STOP_ID_HERE",
  "commodity": "Soybean Seeds",
  "cargoClass": "A",
  "packagingType": "jute-sack",
  "weightKg": 35,
  "pieceCount": 1,
  "maxPieceWeightKg": 35,
  "readyAt": "2026-08-29T14:00:00Z"
}
```

---

## 🔧 Troubleshooting

### Backend won't start
```
Issue: MongoDB connection error
Fix: Check MONGODB_URI in backend/.env
```

### Frontend won't start
```
Issue: Port 3000 already in use
Fix: Kill the process or change port in vite.config.js
```

### No bus stops in dropdown
```
Issue: Database not seeded
Fix: Run: node scripts/seedKopargaon.js
```

### Booking fails with 503 error
```
Issue: AI Engine not running and MOCK_MODE=false
Fix: Set MOCK_MODE=true in backend/.env
```

### Classification not working
```
Issue: API call failing
Fix: Check browser console, verify backend is running
```

---

## 📊 Quick Verification Checklist

After setup, verify:

- [ ] Backend starts without errors
- [ ] Frontend loads at localhost:3000
- [ ] Can login with test account
- [ ] Can see Bus-Parcel tab
- [ ] Origin/destination dropdowns have stops
- [ ] Route preview shows when stops selected
- [ ] Commodity classification works (try "Soybean Seeds")
- [ ] Can successfully book a consignment
- [ ] Booking code appears (BP-YYYYMMDD-NNNNN format)
- [ ] Decision trace shows rules
- [ ] My Bookings shows the new booking
- [ ] Impact Dashboard shows metrics
- [ ] Bus Network shows stops/routes/trips

---

## 🎯 Next Steps

### Explore Features
1. **Book different commodities** - Try agricultural, general, fragile
2. **Test hazardous detection** - Try "pesticide", "chemical", "explosive"
3. **View dashboard metrics** - See real-time impact calculations
4. **Explore network** - Browse stops, routes, and trips
5. **Search bookings** - Use booking code search in history

### Test Edge Cases
1. **Same origin/destination** - Should show error
2. **No available route** - Should explain why
3. **Insufficient capacity** - Should reroute to fleet
4. **Weekend/holiday** - Check day-of-week availability

### Production Setup
1. **Disable MOCK_MODE** - Set to `false` in .env
2. **Start AI Engine** - Run FastAPI backend on port 8000
3. **Configure real credentials** - Update MongoDB URI, JWT secret
4. **Enable authentication** - Ensure protect middleware active
5. **Set up monitoring** - Add logging, error tracking

---

## 📚 Documentation

- **Complete System**: `COMPLETE_SYSTEM_SUMMARY.md`
- **Backend Details**: `IMPLEMENTATION_SUMMARY.md`
- **Frontend Details**: `FRONTEND_IMPLEMENTATION_COMPLETE.md`
- **API Reference**: See `backend/src/routes/apiV2Routes.js`
- **Component Docs**: JSDoc in each component file

---

## 🆘 Support

### Common Issues
1. **Port conflicts**: Change ports in .env and vite.config.js
2. **Module not found**: Run `npm install` in both folders
3. **Authentication errors**: Check JWT_SECRET matches
4. **Database errors**: Verify MongoDB URI and network access

### Debug Mode
Enable detailed logging:
```env
# backend/.env
DEBUG=*
LOG_LEVEL=debug
```

### Reset Database
```powershell
cd backend
node scripts/seedKopargaon.js --force
```

---

## ✅ Success!

You should now have:
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000
- ✅ Database seeded with stops, routes, trips
- ✅ Can book consignments
- ✅ Can view metrics and history

**Enjoy the Bus-Parcel System! 🚍📦**

---

**Time to Production**: ~5 minutes  
**Complexity**: Low (just npm install, seed, and start)  
**Dependencies**: Node.js, MongoDB  

**Happy coding! 🎉**

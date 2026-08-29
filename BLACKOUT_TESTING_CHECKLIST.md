# Blackout Challenge - Testing Checklist

## Pre-Demo Verification

### Backend Health
- [ ] Backend running on port 5000
- [ ] MongoDB connected
- [ ] Journal service initialized (check logs for `[Journal] Initialized`)
- [ ] Snapshot service initialized (check logs for `[Snapshot] Service initialized`)
- [ ] Health endpoint responds: `curl http://localhost:5000/api/system/health`

### Frontend Health
- [ ] Frontend running (usually port 5173)
- [ ] Landing page loads
- [ ] "🔥 Resilience Console" link visible in footer
- [ ] Console loads without authentication

### Initial State
- [ ] All status lights green (Database 🟢, Event Store 🟢, Recovery ⚪)
- [ ] Drill scope count = 0
- [ ] No affected records in scan

---

## Demo Flow Test (3 minutes)

### Test 1: Seed Drill Data
**Action**: Click "🌱 Seed Drill Data"

**Expected Results**:
- [ ] Button shows "Seeding..." with spinner
- [ ] Completes in 2-5 seconds
- [ ] Drill scope count increases to ~10
- [ ] Status card shows: "Seeded: 3 users, 3 vehicles, 4 requests, 2 postings"
- [ ] All lights still green

**Verify in Backend**:
```bash
# Check drill data exists
curl http://localhost:5000/api/system/health | jq '.drill.scopeCount'
# Should show: 10
```

---

### Test 2: Simulate Blackout
**Action**: Click "💥 SIMULATE BLACKOUT"

**Expected Results**:
- [ ] Confirmation dialog appears
- [ ] Button shows "Corrupting..." with spinner
- [ ] Completes in 1-3 seconds
- [ ] Status lights change:
  - Database: 🟢 → 🟡 Degraded
  - Recovery: ⚪ → 🔴 Blackout
- [ ] Scan shows:
  - Affected: 7-9 records
  - Recoverable: 6
  - Unrecoverable: 1
- [ ] Result card shows: "Deleted: 6, Corrupted: 3"

**Verify in Backend**:
```bash
# Check recovery state
curl http://localhost:5000/api/system/health | jq '.recovery'
# Should show: "blackout"

# Check affected records
curl http://localhost:5000/api/system/health | jq '.scan.affected'
# Should show array of affected records
```

---

### Test 3: Recover System
**Action**: Click "🔄 RECOVER SYSTEM"

**Expected Results**:
- [ ] Recovery progress card appears
- [ ] 8 stages animate one by one:
  1. [ ] ✓ Detecting corruption
  2. [ ] ✓ Loading snapshot
  3. [ ] ✓ Replaying events
  4. [ ] ✓ Reconstructing documents
  5. [ ] ✓ Validating data
  6. [ ] ✓ Restoring database
  7. [ ] ✓ Replaying queued operations
  8. [ ] ✓ Complete
- [ ] Completes in 10-30 seconds
- [ ] Final card shows:
  - [ ] Recovered: 6
  - [ ] Unrecoverable: 1
  - [ ] Data consistency: 90-99% (real number, not 100%)
- [ ] Status lights return to green
- [ ] Recovery state: 🔴 → ⚪ Standby

**Verify in Backend**:
```bash
# Check recovery complete
curl http://localhost:5000/api/system/health | jq '.recovery'
# Should show: "idle"

# Check database restored
curl http://localhost:5000/api/system/health | jq '.scan.affected'
# Should show: []
```

---

### Test 4: Reset Drill
**Action**: Click "🔄 Reset Drill"

**Expected Results**:
- [ ] Confirmation dialog appears
- [ ] Button shows "Resetting..." with spinner
- [ ] Completes in 1-2 seconds
- [ ] Drill scope count returns to 0
- [ ] System ready for next run

---

## Edge Case Tests

### Test 5: Multiple Blackout Cycles
**Steps**:
1. Seed → Blackout → Recover → Reset
2. Repeat 3 times

**Expected**: System stable across multiple cycles

---

### Test 6: Refresh During Recovery
**Steps**:
1. Seed data
2. Simulate blackout
3. Start recovery
4. Refresh browser page immediately

**Expected**:
- [ ] Recovery continues on backend
- [ ] Frontend reconnects via Socket.IO
- [ ] Progress resumes streaming
- [ ] Recovery completes successfully

---

### Test 7: Network Interruption
**Steps**:
1. Start recovery
2. Disconnect network mid-recovery
3. Reconnect network

**Expected**:
- [ ] Frontend shows connection lost
- [ ] Backend completes recovery independently
- [ ] Frontend catches up when reconnected

---

### Test 8: Concurrent Access
**Steps**:
1. Open console in 2 browser tabs
2. Seed data in tab 1
3. Both tabs should show updated metrics

**Expected**:
- [ ] Both tabs poll health independently
- [ ] Both tabs receive Socket.IO updates
- [ ] Both tabs show same state

---

## Performance Tests

### Test 9: Large Dataset
**Modify seed to create 100 records**:
```javascript
// backend/src/controllers/systemController.js
// In seedDrillData, loop to create 100 vehicles
```

**Expected**:
- [ ] Seed completes in <10 seconds
- [ ] Recovery completes in <60 seconds
- [ ] UI remains responsive

---

### Test 10: Snapshot Age
**Steps**:
1. Start system
2. Wait 15 minutes
3. Check health endpoint

**Expected**:
```bash
curl http://localhost:5000/api/system/health | jq '.snapshot.ageSec'
# Should be < 900 (15 minutes)
```

---

## Security Tests

### Test 11: Pre-Auth Access
**Steps**:
1. Open browser in incognito mode
2. Navigate to http://localhost:5173
3. Click "🔥 Resilience Console"

**Expected**:
- [ ] Console loads without login
- [ ] Health endpoint accessible
- [ ] All drill operations work

---

### Test 12: Production Guard (if testing)
**Steps**:
1. Set `NODE_ENV=production` in backend/.env
2. Restart backend
3. Try drill operations without token

**Expected**:
- [ ] GET /health works (always open)
- [ ] POST /drill/* returns 403 Unauthorized
- [ ] Add header: `resilience-drill-token: <token>`
- [ ] Operations work with valid token

---

## Data Integrity Tests

### Test 13: Hash Chain Verification
**Steps**:
1. Seed drill data (creates events)
2. Check health endpoint

**Expected**:
```bash
curl http://localhost:5000/api/system/health | jq '.journal.chainOk'
# Should show: true
```

---

### Test 14: Journal File Persistence
**Steps**:
1. Seed drill data
2. Check file exists:
```bash
ls -lh backend/data/journal.ndjson
# Should show file with content
```
3. Simulate blackout (deletes MongoDB)
4. Verify file still exists
5. Recover
6. Check file still has all events

**Expected**:
- [ ] File survives MongoDB deletion
- [ ] Recovery reads from file
- [ ] No data loss in file

---

### Test 15: Snapshot File Creation
**Steps**:
1. Seed drill data
2. Trigger manual snapshot:
```bash
curl -X POST http://localhost:5000/api/system/snapshot
```
3. Check snapshots directory:
```bash
ls -lh backend/data/snapshots/
# Should show JSON files for each collection
```

**Expected**:
- [ ] 4 JSON files created (users, vehicles, pickuprequests, buyerpostings)
- [ ] Files are readable JSON
- [ ] Snapshot metadata in MongoDB

---

## UI/UX Tests

### Test 16: Status Light Colors
- [ ] 🟢 Green = Online/Healthy
- [ ] 🟡 Yellow = Degraded
- [ ] 🔴 Red = Critical/Blackout
- [ ] 🔵 Blue = Recovering
- [ ] ⚪ Gray = Idle/Standby

---

### Test 17: Button States
- [ ] Seed button disabled when drill scope > 0
- [ ] Blackout button disabled when no drill data
- [ ] Recover button disabled when recovery = 'idle'
- [ ] Reset button disabled when drill scope = 0

---

### Test 18: Error Handling
**Steps**:
1. Stop backend
2. Try operations from frontend

**Expected**:
- [ ] Error messages display
- [ ] UI doesn't crash
- [ ] Clear error text (not generic "Error")

---

## Browser Compatibility

### Test 19: Cross-Browser
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

---

## Final Checklist Before Demo

### Pre-Demo Setup (5 minutes before)
- [ ] Backend running, MongoDB connected
- [ ] Frontend built (`npm run build` if showing production)
- [ ] Browser cache cleared
- [ ] Drill data reset (clean state)
- [ ] Test run completed successfully
- [ ] Screenshots/screen recording ready (backup)

### During Demo
- [ ] Narrate each step
- [ ] Show status lights changing
- [ ] Highlight "1 unrecoverable" (honest engineering)
- [ ] Show real consistency percentage
- [ ] Emphasize dual-sink (file survives DB wipe)
- [ ] Mention pre-auth access (works when auth broken)

### Demo Talking Points
1. "Database is wiped mid-operation"
2. "File-based journal survives the wipe"
3. "Hash chain detects tampering"
4. "One record unrecoverable - we're honest about it"
5. "98.3% consistency - real number, not rounded"
6. "Works without login - pre-auth accessible"

---

## Known Issues (Document These)

### Issue 1: First Snapshot Delay
**Symptom**: Initial snapshot on first boot takes 5-10 seconds
**Cause**: Creating directory structure + first database export
**Impact**: Low - only happens once
**Workaround**: Wait for `[Snapshot] Service initialized` log

### Issue 2: Recovery Progress Updates
**Symptom**: Sometimes progress skips steps visually
**Cause**: Socket.IO event timing vs UI render cycle
**Impact**: Low - recovery still completes correctly
**Workaround**: Final result is always accurate

---

## Success Criteria

✅ **All tests pass**: 19/19 tests green  
✅ **Demo flow smooth**: 3-minute demo completes without errors  
✅ **Honest metrics**: Unrecoverable record reported, real consistency %  
✅ **Pre-auth works**: Console accessible without login  
✅ **Data survives**: File-based journal persists through DB wipes  

---

## Emergency Backup Plan

If live demo fails:
1. Have screen recording ready
2. Have screenshots of each stage
3. Show journal.ndjson file contents
4. Show snapshot JSON files
5. Explain architecture from diagrams

---

*Testing checklist for The Blackout Challenge demo*

@echo off
echo ========================================
echo   Testing Bus Parcel API Endpoints
echo ========================================
echo.

echo [1/3] Testing Backend Health...
curl -s http://localhost:5000/health
echo.
echo.

echo [2/3] Testing Bus Stops API...
curl -s http://localhost:5000/api/v2/bus/stops
echo.
echo.

echo [3/3] Testing Bus Routes API...
curl -s http://localhost:5000/api/v2/bus/routes
echo.
echo.

echo ========================================
echo   Tests Complete
echo ========================================
echo.
echo If you see "success: true" and data above, APIs are working!
echo If you see errors or no data, run: node scripts\seedKopargaon.js
echo.
pause

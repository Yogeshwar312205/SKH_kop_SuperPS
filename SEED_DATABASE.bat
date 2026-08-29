@echo off
echo ========================================
echo   Seeding Kopargaon Bus Network
echo ========================================
echo.

cd backend
node scripts\seedKopargaon.js

echo.
echo ========================================
echo   Seeding Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart backend (npm run dev)
echo 2. Refresh browser (Ctrl+Shift+R)
echo 3. Login: 9876543210 / farmer123
echo 4. Go to Bus Parcel tab
echo.
pause

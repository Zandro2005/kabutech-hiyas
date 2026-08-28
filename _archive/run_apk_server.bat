@echo off
echo ===================================================
echo   KabuTech Hiyas - Local Server for APK Download
echo ===================================================
echo.
echo Starting the web server on port 8000...
echo You can access the APK download from your phone browser.
echo.
echo Make sure your phone is on the same Wi-Fi network.
echo.
npx.cmd -y http-server -p 8000 -a 0.0.0.0
pause

@echo off
title ShareMyFile - Local WiFi File Sharing
cls
echo ======================================================
echo          Starting ShareMyFile Server...
echo ======================================================
echo.
echo Opening ShareMyFile in your browser...
start "" http://localhost:5000
node server/index.js
pause

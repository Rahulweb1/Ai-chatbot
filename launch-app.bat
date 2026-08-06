@echo off
title NVIDIA AI Desktop Assistant
echo Launching NVIDIA AI Desktop Assistant...
cd /d "c:\Users\rahul\Downloads\Telegram Desktop\nvidia-ai-desktop-assistant (6)"

:: Check if server is responding on port 3000
powershell -Command "if (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Quiet)) { Start-Process -WindowStyle Hidden -FilePath 'npm' -ArgumentList 'run dev' -WorkingDirectory 'c:\Users\rahul\Downloads\Telegram Desktop\nvidia-ai-desktop-assistant (6)'; Start-Sleep -Seconds 3 }"

:: Open in standalone desktop app window mode
start "" msedge.exe --app=http://127.0.0.1:3000

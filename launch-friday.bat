@echo off
title Friday AI Assistant
echo Launching Friday AI Assistant...
cd /d "c:\Users\rahul\Downloads\Telegram Desktop\nvidia-ai-desktop-assistant (6)"

:: Check if server is running on port 3000, start if not
powershell -Command "if (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Quiet)) { Start-Process -WindowStyle Hidden -FilePath 'npm' -ArgumentList 'run dev' -WorkingDirectory 'c:\Users\rahul\Downloads\Telegram Desktop\nvidia-ai-desktop-assistant (6)'; Start-Sleep -Seconds 3 }"

:: Launch standalone app window
start "" msedge.exe --app=http://127.0.0.1:3000 --app-id=FridayAIAssistant

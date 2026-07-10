@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Portfolio local server: http://localhost:8765
echo Press Ctrl+C to stop.
start "" "http://localhost:8765/index.html"
python -m http.server 8765

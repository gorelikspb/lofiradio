# Start local server for lofi radio
Write-Host "Starting local server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Server running at: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "Open in browser: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

cd public
python -m http.server 8000


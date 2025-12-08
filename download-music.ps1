# Download lofi music automatically
$musicDir = "public/assets/music"

Write-Host "=== Downloading Lofi Playlist ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $musicDir)) {
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
    Write-Host "Created music folder" -ForegroundColor Green
}

# Check for yt-dlp
$hasYtDlp = $false
try {
    $null = Get-Command yt-dlp -ErrorAction Stop
    $hasYtDlp = $true
    Write-Host "yt-dlp found" -ForegroundColor Green
} catch {
    Write-Host "yt-dlp not found. Installing..." -ForegroundColor Yellow
    try {
        winget install yt-dlp --accept-package-agreements --accept-source-agreements --silent
        Start-Sleep -Seconds 5
        $null = Get-Command yt-dlp -ErrorAction Stop
        $hasYtDlp = $true
        Write-Host "yt-dlp installed" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install yt-dlp" -ForegroundColor Red
        Write-Host "Install manually: winget install yt-dlp" -ForegroundColor Yellow
    }
}

if ($hasYtDlp) {
    Write-Host ""
    Write-Host "Downloading lofi tracks..." -ForegroundColor Cyan
    
    $urls = @(
        "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        "https://www.youtube.com/watch?v=5qap5aO4i9A",
        "https://www.youtube.com/watch?v=DWcJFNfaw9c"
    )
    
    $num = 1
    foreach ($url in $urls) {
        $file = Join-Path $musicDir ("track-{0:000}.mp3" -f $num)
        Write-Host "[$num] Downloading..." -ForegroundColor Yellow
        
        & yt-dlp -x --audio-format mp3 --audio-quality 192K -o $file --no-playlist --quiet $url 2>&1 | Out-Null
        
        if (Test-Path $file) {
            Write-Host "  OK" -ForegroundColor Green
            $num++
        } else {
            Write-Host "  Failed" -ForegroundColor Red
        }
    }
    
    if ($num -gt 1) {
        Write-Host ""
        Write-Host "Creating playlist..." -ForegroundColor Yellow
        & .\create-playlist.ps1
        Write-Host "Done! Open public/index.html" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "Manual download:" -ForegroundColor Yellow
    Write-Host "1. Download MP3 from: https://pixabay.com/music/search/lofi/" -ForegroundColor Cyan
    Write-Host "2. Put files in: $musicDir" -ForegroundColor White
    Write-Host "3. Run: .\create-playlist.ps1" -ForegroundColor White
}


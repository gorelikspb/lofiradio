# Quick download script
$musicDir = "public/assets/music"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Test-Path $musicDir)) {
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}

Write-Host "Downloading lofi tracks..." -ForegroundColor Cyan

# Popular lofi YouTube videos (individual tracks, not streams)
$tracks = @(
    @{url="https://www.youtube.com/watch?v=jfKfPfyJRdk"; name="Lofi Girl"},
    @{url="https://www.youtube.com/watch?v=5qap5aO4i9A"; name="Chillhop"},
    @{url="https://www.youtube.com/watch?v=DWcJFNfaw9c"; name="Lofi Hip Hop"}
)

$num = 1
foreach ($track in $tracks) {
    $file = Join-Path $musicDir ("track-{0:000}.mp3" -f $num)
    Write-Host "[$num] $($track.name)..." -ForegroundColor Yellow
    
    & yt-dlp -x --audio-format mp3 --audio-quality 192K -o $file --no-playlist --quiet $track.url 2>&1 | Out-Null
    
    if (Test-Path $file) {
        $size = [math]::Round((Get-Item $file).Length / 1MB, 2)
        Write-Host "  OK ($size MB)" -ForegroundColor Green
        $num++
    } else {
        Write-Host "  Failed" -ForegroundColor Red
    }
}

if ($num -gt 1) {
    Write-Host ""
    Write-Host "Creating playlist..." -ForegroundColor Yellow
    & .\create-playlist.ps1
    Write-Host "Done!" -ForegroundColor Green
}


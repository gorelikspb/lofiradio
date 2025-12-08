# Fast download with progress
$musicDir = "public/assets/music"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Test-Path $musicDir)) {
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}

Write-Host "=== Downloading Lofi Tracks ===" -ForegroundColor Cyan
Write-Host ""

# List of lofi tracks to download
$tracks = @(
    "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    "https://www.youtube.com/watch?v=5qap5aO4i9A",
    "https://www.youtube.com/watch?v=DWcJFNfaw9c",
    "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    "https://www.youtube.com/watch?v=7NOSDKb0HlU"
)

$total = $tracks.Count
$num = 1

foreach ($url in $tracks) {
    $file = Join-Path $musicDir ("track-{0:000}.mp3" -f $num)
    Write-Host "[$num/$total] Downloading track $num..." -ForegroundColor Yellow -NoNewline
    
    $process = Start-Process -FilePath "yt-dlp" -ArgumentList "-x","--audio-format","mp3","--audio-quality","192K","-o","`"$file`"","--no-playlist","--quiet","--progress","$url" -Wait -PassThru -NoNewWindow
    
    if (Test-Path $file) {
        $size = [math]::Round((Get-Item $file).Length / 1MB, 1)
        Write-Host " OK ($size MB)" -ForegroundColor Green
        $num++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Creating playlist..." -ForegroundColor Yellow
& .\create-playlist.ps1

$downloaded = (Get-ChildItem $musicDir -Filter "*.mp3" -ErrorAction SilentlyContinue).Count
Write-Host ""
Write-Host "Done! Downloaded: $downloaded tracks" -ForegroundColor Green
Write-Host "Open: public/index.html" -ForegroundColor Cyan


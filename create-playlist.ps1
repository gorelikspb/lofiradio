# Create playlist from MP3 files
$musicDir = "public/assets/music"
$playlistFile = "public/playlist.json"

Write-Host "Searching for MP3 files..." -ForegroundColor Cyan

if (-not (Test-Path $musicDir)) {
    Write-Host "Folder $musicDir not found. Creating..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}

$mp3Files = Get-ChildItem -Path $musicDir -Filter "*.mp3" | Sort-Object Name

if ($mp3Files.Count -eq 0) {
    Write-Host "No MP3 files found in $musicDir" -ForegroundColor Red
    Write-Host "Add MP3 files and run script again." -ForegroundColor Yellow
    exit
}

Write-Host "Found files: $($mp3Files.Count)" -ForegroundColor Green

$tracks = $mp3Files | ForEach-Object -Begin { $id = 1 } -Process {
    $title = $_.BaseName -replace '_', ' ' -replace '-', ' '
    @{
        id = $id++
        title = $title
        file = "assets/music/$($_.Name)"
        artist = "Lofi Radio"
    }
}

$playlist = @{
    tracks = $tracks
    shuffle = $true
    repeat = $true
} | ConvertTo-Json -Depth 10

$playlist | Out-File -FilePath $playlistFile -Encoding UTF8 -NoNewline
Write-Host ""
Write-Host "Playlist created: $playlistFile" -ForegroundColor Green
Write-Host "Tracks in playlist: $($tracks.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "Done! Open index.html in browser." -ForegroundColor Cyan

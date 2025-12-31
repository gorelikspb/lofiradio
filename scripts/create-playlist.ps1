# Create playlist from MP3 files with category support
$musicDir = "public/assets/music"
$playlistFile = "public/playlist.json"

Write-Host "Searching for MP3 files..." -ForegroundColor Cyan

if (-not (Test-Path $musicDir)) {
    Write-Host "Folder $musicDir not found. Creating..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}

# Get regular MP3 files (not in subfolders)
$mp3Files = Get-ChildItem -Path $musicDir -Filter "*.mp3" -File | Sort-Object Name

# Get Xmas MP3 files
$xmasDir = Join-Path $musicDir "xmas"
$xmasFiles = @()
if (Test-Path $xmasDir) {
    $xmasFiles = Get-ChildItem -Path $xmasDir -Filter "*.mp3" -File | Sort-Object Name
    Write-Host "Found xmas files: $($xmasFiles.Count)" -ForegroundColor Cyan
}

if ($mp3Files.Count -eq 0 -and $xmasFiles.Count -eq 0) {
    Write-Host "No MP3 files found in $musicDir" -ForegroundColor Red
    Write-Host "Add MP3 files and run script again." -ForegroundColor Yellow
    exit
}

Write-Host "Found regular files: $($mp3Files.Count)" -ForegroundColor Green

$id = 1
$tracks = @()

# Add regular tracks
$tracks += $mp3Files | ForEach-Object {
    $title = $_.BaseName -replace '_', ' ' -replace '-', ' '
    @{
        id = $id++
        title = $title
        file = "assets/music/$($_.Name)"
        artist = "Lofi Radio"
        category = "regular"
    }
}

# Add xmas tracks
$tracks += $xmasFiles | ForEach-Object {
    $title = $_.BaseName -replace '_', ' ' -replace '-', ' '
    @{
        id = $id++
        title = $title
        file = "assets/music/xmas/$($_.Name)"
        artist = "Lofi Radio"
        category = "xmas"
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
Write-Host "Regular tracks: $($mp3Files.Count)" -ForegroundColor Green
Write-Host "Xmas tracks: $($xmasFiles.Count)" -ForegroundColor Green
Write-Host "Total tracks: $($tracks.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "Done! Open index.html in browser." -ForegroundColor Cyan

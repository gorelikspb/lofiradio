# Автоматическая загрузка lofi треков
$musicDir = "public/assets/music"

Write-Host "=== Автоматическая загрузка Lofi плейлиста ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $musicDir)) {
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
    Write-Host "Создана папка для музыки" -ForegroundColor Green
}

$hasYtDlp = $false
try {
    $null = Get-Command yt-dlp -ErrorAction Stop
    $hasYtDlp = $true
    Write-Host "yt-dlp найден" -ForegroundColor Green
} catch {
    Write-Host "yt-dlp не найден. Установка..." -ForegroundColor Yellow
    try {
        winget install yt-dlp --accept-package-agreements --accept-source-agreements --silent
        Start-Sleep -Seconds 3
        $null = Get-Command yt-dlp -ErrorAction Stop
        $hasYtDlp = $true
        Write-Host "yt-dlp установлен" -ForegroundColor Green
    } catch {
        Write-Host "Не удалось установить yt-dlp" -ForegroundColor Red
    }
}

if ($hasYtDlp) {
    Write-Host ""
    Write-Host "Загружаю lofi треки..." -ForegroundColor Cyan
    
    $lofiUrls = @(
        "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        "https://www.youtube.com/watch?v=5qap5aO4i9A",
        "https://www.youtube.com/watch?v=DWcJFNfaw9c"
    )
    
    $trackNum = 1
    foreach ($url in $lofiUrls) {
        $outputFile = Join-Path $musicDir ("track-{0:000}.mp3" -f $trackNum)
        Write-Host "[$trackNum] Загрузка..." -ForegroundColor Yellow
        
        try {
            & yt-dlp -x --audio-format mp3 --audio-quality 192K -o $outputFile --no-playlist --quiet $url 2>&1 | Out-Null
            if (Test-Path $outputFile) {
                Write-Host "  Загружен" -ForegroundColor Green
                $trackNum++
            }
        } catch {
            Write-Host "  Ошибка" -ForegroundColor Red
        }
    }
    
    if ($trackNum -gt 1) {
        Write-Host ""
        Write-Host "Создаю плейлист..." -ForegroundColor Yellow
        & .\create-playlist.ps1
        Write-Host "Готово!" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "Скачайте треки вручную:" -ForegroundColor Yellow
    Write-Host "https://pixabay.com/music/search/lofi/" -ForegroundColor Cyan
    Write-Host "Поместите MP3 в: $musicDir" -ForegroundColor White
    Write-Host "Запустите: .\create-playlist.ps1" -ForegroundColor White
}

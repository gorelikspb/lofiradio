# Скрипт для скачивания lofi музыки с YouTube используя yt-dlp
# Использование: .\download-from-youtube.ps1

$musicDir = "public/assets/music"

Write-Host "=== Загрузка Lofi музыки с YouTube ===" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие yt-dlp
$ytdlpPath = Get-Command yt-dlp -ErrorAction SilentlyContinue
if (-not $ytdlpPath) {
    Write-Host "yt-dlp не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установка yt-dlp..." -ForegroundColor Yellow
    try {
        winget install yt-dlp --accept-package-agreements --accept-source-agreements
        Write-Host "✓ yt-dlp установлен" -ForegroundColor Green
        Write-Host ""
        Write-Host "Перезапустите скрипт после установки" -ForegroundColor Yellow
        exit
    } catch {
        Write-Host "✗ Ошибка установки. Установите вручную:" -ForegroundColor Red
        Write-Host "  winget install yt-dlp" -ForegroundColor Cyan
        Write-Host "  или скачайте с: https://github.com/yt-dlp/yt-dlp/releases" -ForegroundColor Cyan
        exit
    }
}

# Создаем папку для музыки
if (-not (Test-Path $musicDir)) {
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}

Write-Host "Популярные lofi стримы и плейлисты:" -ForegroundColor Yellow
Write-Host ""

# Список популярных lofi стримов (можно расширить)
$lofiStreams = @(
    @{
        name = "Lofi Girl - 24/7 Stream"
        url = "https://www.youtube.com/watch?v=jfKfPfyJRdk"
    },
    @{
        name = "Chillhop Music"
        url = "https://www.youtube.com/watch?v=5qap5aO4i9A"
    },
    @{
        name = "Lofi Hip Hop Radio"
        url = "https://www.youtube.com/watch?v=DWcJFNfaw9c"
    }
)

Write-Host "Выберите источник (или нажмите Enter для загрузки всех):" -ForegroundColor Cyan
for ($i = 0; $i -lt $lofiStreams.Count; $i++) {
    Write-Host "  [$($i+1)] $($lofiStreams[$i].name)" -ForegroundColor White
}
Write-Host "  [0] Загрузить все" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Ваш выбор (0-$(lofiStreams.Count))"

if ([string]::IsNullOrWhiteSpace($choice)) {
    $choice = "0"
}

$selectedStreams = @()
if ($choice -eq "0") {
    $selectedStreams = $lofiStreams
} else {
    $index = [int]$choice - 1
    if ($index -ge 0 -and $index -lt $lofiStreams.Count) {
        $selectedStreams = @($lofiStreams[$index])
    } else {
        Write-Host "Неверный выбор" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "Сколько треков загрузить? (по умолчанию 20)" -ForegroundColor Cyan
$trackCount = Read-Host "Количество"

if ([string]::IsNullOrWhiteSpace($trackCount)) {
    $trackCount = 20
} else {
    $trackCount = [int]$trackCount
}

Write-Host ""
Write-Host "Начинаю загрузку..." -ForegroundColor Yellow
Write-Host ""

$trackIndex = 1
foreach ($stream in $selectedStreams) {
    Write-Host "Загружаю: $($stream.name)..." -ForegroundColor Cyan
    
    $outputTemplate = Join-Path $musicDir "track-{0:000}.%(ext)s" -f $trackIndex
    
    try {
        # Скачиваем аудио в MP3 формате
        & yt-dlp `
            -x `
            --audio-format mp3 `
            --audio-quality 192K `
            -o $outputTemplate `
            --playlist-end $trackCount `
            --no-playlist `
            --quiet `
            --no-warnings `
            $stream.url
        
        if (Test-Path (Join-Path $musicDir "track-{0:000}.mp3" -f $trackIndex)) {
            Write-Host "✓ Загружен трек $trackIndex" -ForegroundColor Green
            $trackIndex++
        }
    } catch {
        Write-Host "✗ Ошибка загрузки: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

if ($trackIndex -gt 1) {
    Write-Host "Загружено треков: $($trackIndex - 1)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Создаю плейлист..." -ForegroundColor Yellow
    & .\create-playlist.ps1
    Write-Host ""
    Write-Host "✓ Готово! Откройте index.html в браузере" -ForegroundColor Green
} else {
    Write-Host "Треки не загружены. Проверьте подключение к интернету." -ForegroundColor Red
}


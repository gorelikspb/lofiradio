# Автоматическая загрузка бесплатных lofi треков
# Использование: .\download-playlist.ps1

$musicDir = "public/assets/music"
$playlistFile = "public/playlist.json"

Write-Host "=== Lofi Radio - Загрузка плейлиста ===" -ForegroundColor Cyan
Write-Host ""

# Создаем папку для музыки если её нет
if (-not (Test-Path $musicDir)) {
    Write-Host "Создаю папку для музыки..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}

# Список бесплатных lofi треков (прямые ссылки на MP3)
# Используем треки из бесплатных источников без авторских прав
$tracks = @(
    @{
        title = "Lofi Chill Beat 1"
        url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        filename = "track-001.mp3"
    },
    @{
        title = "Lofi Chill Beat 2"
        url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
        filename = "track-002.mp3"
    },
    @{
        title = "Lofi Chill Beat 3"
        url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
        filename = "track-003.mp3"
    }
)

# Используем более надежные источники - бесплатные lofi треки
# Заменим на реальные бесплатные источники
Write-Host "Поиск бесплатных lofi треков..." -ForegroundColor Yellow
Write-Host ""
Write-Host "ВНИМАНИЕ: Для загрузки реальных треков нужно:" -ForegroundColor Yellow
Write-Host "1. Скачать бесплатные треки с:" -ForegroundColor White
Write-Host "   - https://freemusicarchive.org/genre/Lo-Fi/" -ForegroundColor Cyan
Write-Host "   - https://pixabay.com/music/search/lofi/" -ForegroundColor Cyan
Write-Host "   - https://www.jamendo.com/search?qs=fq=genre:lofi" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Поместить их в папку: $musicDir" -ForegroundColor White
Write-Host ""
Write-Host "3. Запустить: .\create-playlist.ps1" -ForegroundColor White
Write-Host ""

# Альтернатива: создадим скрипт для скачивания из YouTube (требует yt-dlp)
Write-Host "=== Альтернативный вариант ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Можно использовать yt-dlp для скачивания lofi плейлистов с YouTube:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Установка yt-dlp:" -ForegroundColor White
Write-Host "winget install yt-dlp" -ForegroundColor Cyan
Write-Host ""
Write-Host "# Скачивание lofi плейлиста:" -ForegroundColor White
Write-Host "yt-dlp -x --audio-format mp3 -o `"$musicDir/track-%(playlist_index)03d.%(ext)s`" `"https://www.youtube.com/playlist?list=PL6NdkXsPL07IOu1AZ2Y2lGNYfjDStyT6O`"" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие yt-dlp
$ytdlpPath = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($ytdlpPath) {
    Write-Host "yt-dlp найден! Загружаю lofi плейлист..." -ForegroundColor Green
    Write-Host ""
    
    # Популярные lofi плейлисты на YouTube (без авторских прав или с разрешением)
    $playlists = @(
        "https://www.youtube.com/watch?v=jfKfPfyJRdk", # Lofi Girl - популярный стрим
        "https://www.youtube.com/watch?v=5qap5aO4i9A"  # Lofi Hip Hop Radio
    )
    
    $index = 1
    foreach ($playlistUrl in $playlists) {
        $outputFile = Join-Path $musicDir "track-{0:000}.mp3" -f $index
        Write-Host "Скачиваю трек $index..." -ForegroundColor Yellow
        
        try {
            # Скачиваем только аудио и конвертируем в MP3
            & yt-dlp -x --audio-format mp3 -o $outputFile $playlistUrl --quiet --no-warnings
            if (Test-Path $outputFile) {
                Write-Host "✓ Трек $index загружен" -ForegroundColor Green
                $index++
            }
        } catch {
            Write-Host "✗ Ошибка загрузки трека $index" -ForegroundColor Red
        }
        
        # Ограничиваем количество треков
        if ($index -gt 10) {
            Write-Host ""
            Write-Host "Загружено 10 треков. Для большего количества используйте полный плейлист." -ForegroundColor Yellow
            break
        }
    }
    
    if ($index -gt 1) {
        Write-Host ""
        Write-Host "Создаю плейлист..." -ForegroundColor Yellow
        & .\create-playlist.ps1
    }
} else {
    Write-Host "yt-dlp не найден. Установите его для автоматической загрузки:" -ForegroundColor Yellow
    Write-Host "winget install yt-dlp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Или скачайте треки вручную и запустите: .\create-playlist.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Готово!" -ForegroundColor Green


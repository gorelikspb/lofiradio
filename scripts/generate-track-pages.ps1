# Генерация страниц треков из playlist.json
$playlistFile = "public/playlist.json"
$playlist = Get-Content $playlistFile -Encoding UTF8 | ConvertFrom-Json

# Функция для создания slug из названия
function Get-Slug {
    param($title)
    $title = $title.ToLower()
    $title = $title -replace '[^a-z0-9\s-]', ''
    $title = $title -replace '\s+', '-'
    $title = $title.Trim('-')
    return $title
}

# Маппинг треков на SEO-friendly названия
$trackMapping = @{
    "cutie-japan-lofi-402355" = @{
        ru = @{
            title = "Japanese Lofi Music - Cute Tokyo Beats"
            description = "Slushaite cute japanese lofi beats onlain besplatno. Rasslablyayushchie tokiyskie bity dlya ucheby i otdykha."
            keywords = "japanese lofi music, tokyo lofi beats, japan lofi, cute japanese lofi"
            content = "Slushaite cute japanese lofi music s rasslablyayushchimi tokiyskimi bitami. Eta milaya yaponskaya lofi muzyka sozdaet unikalnuyu atmosferu."
        }
        en = @{
            title = "Japanese Lofi Music - Cute Tokyo Beats"
            description = "Listen to cute japanese lofi beats online for free. Relaxing Tokyo beats for study and relaxation."
            keywords = "japanese lofi music, tokyo lofi beats, japan lofi, cute japanese lofi"
            content = "Listen to cute japanese lofi music with relaxing Tokyo beats. This cute Japanese lofi music creates a unique atmosphere."
        }
    }
    "rainy-lofi-city-lofi-music-332746" = @{
        ru = @{
            title = "Rainy Lofi Music - City Rain Beats"
            description = "Slushaite rainy lofi music onlain besplatno. Idealnaya muzyka dlya dozhdlivykh dney."
            keywords = "rainy lofi music, rain lofi beats, rainy day music, city rain lofi"
            content = "Slushaite rainy lofi music so zvukami gorodskogo dozhdya. Eta uspokaivayushchaya muzyka sozdaet idealnuyu atmosferu."
        }
        en = @{
            title = "Rainy Lofi Music - City Rain Beats"
            description = "Listen to rainy lofi music online for free. Perfect music for rainy days with city rain sounds."
            keywords = "rainy lofi music, rain lofi beats, rainy day music, city rain lofi"
            content = "Listen to rainy lofi music with city rain sounds. This soothing music creates the perfect atmosphere."
        }
    }
    "lofi-study-calm-peaceful-chill-hop-112191" = @{
        ru = @{
            title = "Lofi Study Music - Calm Focus Beats"
            description = "Slushaite lofi music for studying onlain besplatno. Spokoynaya muzyka dlya kontsentratsii i ucheby."
            keywords = "lofi music for studying, study music lofi, focus music, calm study music"
            content = "Slushaite lofi study music - spokoynuyu muzyku dlya kontsentratsii i ucheby. Eti uspokaivayushchie bity pomogayut sosredotochitsya."
        }
        en = @{
            title = "Lofi Study Music - Calm Focus Beats"
            description = "Listen to lofi music for studying online for free. Calm music for concentration and study."
            keywords = "lofi music for studying, study music lofi, focus music, calm study music"
            content = "Listen to lofi study music - calm music for concentration and study. These soothing beats help you focus."
        }
    }
    "good-night-lofi-cozy-chill-music-160166" = @{
        ru = @{
            title = "Good Night Lofi Music - Cozy Sleep Beats"
            description = "Slushaite good night lofi music onlain besplatno. Uspokaivayushchaya muzyka dlya sna i relaksatsii."
            keywords = "good night lofi music, sleep music lofi, cozy lofi, bedtime music"
            content = "Slushaite good night lofi music - uspokaivayushchuyu muzyku dlya sna i relaksatsii. Eti cozy chill beats sozdayut idealnuyu atmosferu."
        }
        en = @{
            title = "Good Night Lofi Music - Cozy Sleep Beats"
            description = "Listen to good night lofi music online for free. Soothing music for sleep and relaxation."
            keywords = "good night lofi music, sleep music lofi, cozy lofi, bedtime music"
            content = "Listen to good night lofi music - soothing music for sleep and relaxation. These cozy chill beats create the perfect atmosphere."
        }
    }
}

# Функция для генерации HTML страницы трека
function Generate-TrackPage {
    param($track, $lang, $mapping)
    
    $fileBase = $track.file -replace 'assets/music/', '' -replace '\.mp3$', ''
    $slug = Get-Slug ($track.title -replace '\d+$', '').Trim()
    
    if ($mapping.ContainsKey($fileBase)) {
        $info = $mapping[$fileBase][$lang]
        $pageTitle = $info.title
        $description = $info.description
        $keywords = $info.keywords
        $content = $info.content
    } else {
        $pageTitle = ($track.title -replace '\d+$', '').Trim() + " - Lofi Radio"
        $description = "Listen to $($track.title) online for free. Lofi music from Lofi Radio."
        $keywords = "lofi music, $($track.title.ToLower())"
        $content = "Listen to $($track.title) - soothing lofi music from Lofi Radio."
    }
    
    $cleanTitle = $track.title -replace '\d+$', '' -replace '-', ' '
    $trackPath = "../../assets/music/$($track.file -replace 'assets/music/', '')"
    
    $homeLink = if ($lang -eq 'ru') { "Glavnaya" } else { "Home" }
    $backLink = if ($lang -eq 'ru') { "Vernutsya k pleylistu" } else { "Back to playlist" }
    $prevLabel = if ($lang -eq 'ru') { "Predydushchiy trek" } else { "Previous track" }
    $nextLabel = if ($lang -eq 'ru') { "Sleduyushchiy trek" } else { "Next track" }
    $likeLabel = if ($lang -eq 'ru') { "Layk" } else { "Like" }
    $statusText = if ($lang -eq 'ru') { "Nazhmite dlya nachala" } else { "Click to start" }
    
    $ruActive = if ($lang -eq 'ru') { "active" } else { "" }
    $enActive = if ($lang -eq 'en') { "active" } else { "" }
    
    $html = @"
<!DOCTYPE html>
<html lang="$lang">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="$description">
    <meta name="keywords" content="$keywords">
    <meta name="robots" content="index, follow">
    <title>$pageTitle | Lofi Radio</title>
    
    <meta property="og:type" content="music.song">
    <meta property="og:url" content="https://lofilofi.pages.dev/$lang/track/$slug.html">
    <meta property="og:title" content="$pageTitle">
    <meta property="og:description" content="$description">
    <meta property="og:image" content="https://lofilofi.pages.dev/assets/images/background.jpg">
    <meta property="og:locale" content="$($lang)_$($lang.ToUpper())">
    
    <link rel="alternate" hreflang="ru" href="https://lofilofi.pages.dev/ru/track/$slug.html">
    <link rel="alternate" hreflang="en" href="https://lofilofi.pages.dev/en/track/$slug.html">
    <link rel="canonical" href="https://lofilofi.pages.dev/$lang/track/$slug.html">
    
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        "name": "$cleanTitle",
        "byArtist": {
            "@type": "MusicGroup",
            "name": "$($track.artist)"
        },
        "genre": "Lofi Hip Hop",
        "inLanguage": "$lang"
    }
    </script>
    
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="../../blog.css">
</head>
<body>
    <div class="language-switcher">
        <a href="../../$lang/" class="lang-link">$homeLink</a>
        <a href="../../ru/track/$slug.html" class="lang-link $ruActive">RU</a>
        <a href="../../en/track/$slug.html" class="lang-link $enActive">EN</a>
    </div>
    
    <div class="container">
        <div class="track-info-section">
            <h1>$pageTitle</h1>
            <p class="track-artist">$($track.artist)</p>
            
            <div class="track-description">
                <p>$content</p>
            </div>
        </div>
        
        <div class="player-wrapper">
            <canvas id="audioVisualizer" class="audio-visualizer"></canvas>
            
            <div class="visualizer">
                <div class="wave"></div>
                <div class="wave"></div>
                <div class="wave"></div>
            </div>
            
            <div class="controls">
                <button id="prevBtn" class="control-btn" aria-label="$prevLabel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="19 20 9 12 19 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="5" y1="4" x2="5" y2="20" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                
                <button id="playBtn" class="play-btn" aria-label="Play/Pause">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="5 3 19 12 5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: none;">
                        <rect x="6" y="4" width="4" height="16" stroke-width="2"/>
                        <rect x="14" y="4" width="4" height="16" stroke-width="2"/>
                    </svg>
                </button>
                
                <button id="nextBtn" class="control-btn" aria-label="$nextLabel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="5 4 15 12 5 20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="19" y1="4" x2="19" y2="20" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            
            <div class="status" id="status">$statusText</div>
            <div class="source-info" id="sourceInfo">$cleanTitle - $($track.artist)</div>
            <div class="track-info">
                <div class="track-time" id="trackTime">0:00 / 0:00</div>
                <button id="likeBtn" class="like-btn" aria-label="$likeLabel">
                    <svg class="like-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="track-counter" id="trackCounter"></div>
        </div>
        
        <div class="back-link">
            <a href="../../$lang/">← $backLink</a>
        </div>
    </div>
    
    <audio id="audioPlayer" preload="auto" crossorigin="anonymous">
        <source src="$trackPath" type="audio/mpeg">
    </audio>
    
    <script src="../../translations.js"></script>
    <script src="../../script.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer) {
                    audioPlayer.play().catch(err => console.log('Autoplay blocked'));
                }
            }, 500);
        });
    </script>
</body>
</html>
"@
    
    return @{
        slug = $slug
        html = $html
        lang = $lang
    }
}

# Генерируем страницы для всех треков
Write-Host "Generating track pages..." -ForegroundColor Cyan

foreach ($track in $playlist.tracks) {
    foreach ($lang in @('ru', 'en')) {
        $page = Generate-TrackPage -track $track -lang $lang -mapping $trackMapping
        $outputPath = "public/$lang/track/$($page.slug).html"
        
        $page.html | Out-File -FilePath $outputPath -Encoding UTF8 -NoNewline
        Write-Host "Created: $outputPath" -ForegroundColor Green
    }
}

Write-Host "`nDone! Created $($playlist.tracks.Count * 2) track pages" -ForegroundColor Green

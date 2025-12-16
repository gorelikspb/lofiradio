// Локальный плейлист
let playlist = [];
let currentTrackIndex = 0;
let isShuffle = true;
let isRepeat = true;
let audioPlayer;
let playBtn;
let prevBtn;
let nextBtn;
let statusEl;
let sourceInfoEl;
let trackCounterEl;
let trackTimeEl;
let likeBtn;
let visualizer;
let isPlaying = false;
let shuffledPlaylist = [];
let likedTracks = new Set();
let canvas;
let canvasCtx;
let backgroundCanvas;
let backgroundCanvasCtx;
let analyser;
let audioContext;
let dataArray;
let animationFrameId;

// Определение языка из URL пути
function getLanguage() {
    const path = window.location.pathname;
    // Проверяем путь: /ru/ или /en/
    if (path.startsWith('/en/') || path.includes('/en/')) {
        return 'en';
    }
    if (path.startsWith('/ru/') || path.includes('/ru/')) {
        return 'ru';
    }
    // По умолчанию русский
    return 'ru';
}

// Установка языка
function setLanguage(lang) {
    if (!translations || !translations[lang]) return;
    
    const texts = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = texts;
        for (const k of keys) {
            value = value?.[k];
        }
        if (value) {
            el.textContent = value;
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    // Устанавливаем язык
    const lang = getLanguage();
    setLanguage(lang);
    
    audioPlayer = document.getElementById('audioPlayer');
    playBtn = document.getElementById('playBtn');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    statusEl = document.getElementById('status');
    sourceInfoEl = document.getElementById('sourceInfo');
    trackCounterEl = document.getElementById('trackCounter');
    trackTimeEl = document.getElementById('trackTime');
    likeBtn = document.getElementById('likeBtn');
    visualizer = document.querySelector('.visualizer');
    canvas = document.getElementById('audioVisualizer');
    backgroundCanvas = document.getElementById('backgroundVisualizer');
    
    // Инициализация визуализации звука
    if (canvas) {
        canvasCtx = canvas.getContext('2d');
    }
    if (backgroundCanvas) {
        backgroundCanvasCtx = backgroundCanvas.getContext('2d');
    }
    initAudioVisualizer();
    
    // Инициализация фейерверков для новогодних страниц
    const path = window.location.pathname;
    if (path.includes('/xmas/') || path.includes('/new-year/') || path.includes('/christmas/')) {
        initFireworks();
    }
    
    // Загружаем лайки из localStorage
    loadLikes();
    
    // Загружаем плейлист
    await loadPlaylist();
    
    // Обработчики кликов
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    
    // Обработчики событий аудио
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        // Возобновляем AudioContext если нужно
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        updateUI();
    });
    
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updateUI();
    });
    
    audioPlayer.addEventListener('ended', () => {
        // Трек закончился, переключаем на следующий
        playNext();
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Ошибка загрузки трека:', e, audioPlayer.error);
        statusEl.classList.remove('loading');
        
        // Показываем ошибку только если это реальная ошибка загрузки файла
        if (audioPlayer.error && audioPlayer.error.code !== 0) {
            // Показываем ошибку только если пользователь пытался играть или трек не загрузился
            if (isPlaying || audioPlayer.error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
                const lang = getLanguage();
                statusEl.textContent = lang === 'en' ? 'Error loading track' : 'Ошибка загрузки трека';
                // Пробуем следующий трек
                setTimeout(() => {
                    playNext();
                }, 1000);
            } else {
                // Если просто загрузка без воспроизведения, не показываем ошибку
                const lang = getLanguage();
                statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
            }
        } else {
            // Нет реальной ошибки, просто обновляем статус
            const lang = getLanguage();
            statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
        }
    });
    
    audioPlayer.addEventListener('loadstart', () => {
        statusEl.textContent = 'Загрузка...';
        statusEl.classList.add('loading');
    });
    
    audioPlayer.addEventListener('canplay', () => {
        statusEl.classList.remove('loading');
        updateTrackInfo();
        updateTime();
        
        // Обновляем статус если трек не играет
        if (!isPlaying) {
            const lang = getLanguage();
            statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
        }
    });
    
    audioPlayer.addEventListener('timeupdate', () => {
        updateTime();
    });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateTime();
    });
    
    audioPlayer.addEventListener('loadeddata', () => {
        statusEl.classList.remove('loading');
        if (!isPlaying) {
            const lang = getLanguage();
            statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
        }
    });
    
    // Обработчик лайка
    likeBtn.addEventListener('click', toggleLike);
    
    // Поддержка медиа-клавиш
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
    
    // Загружаем первый трек после загрузки плейлиста и пытаемся запустить автоплей
    if (shuffledPlaylist.length > 0) {
        loadTrack(0, true); // true = пытаемся начать воспроизведение автоматически
        
        // Устанавливаем начальный статус через небольшую задержку на случай если события не сработают
        setTimeout(() => {
            if (!isPlaying && statusEl.textContent === 'Загрузка...') {
                const lang = getLanguage();
                statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
                statusEl.classList.remove('loading');
            }
        }, 2000);
    } else {
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Playlist is empty. Add tracks to playlist.json' : 'Плейлист пуст. Добавьте треки в playlist.json';
        console.error('Плейлист не загружен. playlist.length:', playlist.length, 'shuffledPlaylist.length:', shuffledPlaylist.length);
    }
});

// Загрузка плейлиста
async function loadPlaylist() {
    try {
        // Определяем путь к плейлисту в зависимости от структуры папок
        let playlistPath;
        const path = window.location.pathname;
        if (path.includes('/xmas/') || path.includes('/new-year/') || path.includes('/christmas/')) {
            // Из папки xmas/new-year/christmas нужно подняться на 2 уровня выше
            playlistPath = '../../playlist.json';
        } else if (path.includes('/ru/') || path.includes('/en/')) {
            // Из папки ru/ или en/ нужно подняться на уровень выше
            playlistPath = '../playlist.json';
        } else {
            playlistPath = './playlist.json';
        }
        
        const response = await fetch(playlistPath, {
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Загруженные данные:', data);
        
        let allTracks = data.tracks || [];
        
        // Фильтруем треки по категории для xmas/new-year страниц
        if (path.includes('/xmas/') || path.includes('/new-year/') || path.includes('/christmas/')) {
            playlist = allTracks.filter(track => track.category === 'xmas');
            const pageType = path.includes('/xmas/') ? 'Xmas' : path.includes('/new-year/') ? 'New Year' : 'Christmas';
            console.log(`Фильтр ${pageType}: загружено ${playlist.length} xmas треков из ${allTracks.length} всего треков`);
            if (playlist.length === 0) {
                const lang = getLanguage();
                if (statusEl) {
                    statusEl.textContent = lang === 'en' ? 'No Xmas tracks available. Add MP3 files to assets/music/xmas/ folder and run create-playlist.ps1' : 'Нет новогодних треков. Добавьте MP3 файлы в папку assets/music/xmas/ и запустите create-playlist.ps1';
                }
                console.warn('Нет xmas треков! Добавьте треки в папку xmas и запустите create-playlist.ps1');
            }
        } else {
            // На обычной странице показываем все треки или только regular (если есть категория)
            playlist = allTracks.filter(track => !track.category || track.category === 'regular');
            console.log(`Обычный плейлист: загружено ${playlist.length} из ${allTracks.length} треков`);
        }
        
        isShuffle = data.shuffle !== false;
        isRepeat = data.repeat !== false;
        
        console.log(`Загружено треков: ${playlist.length}`);
        
        if (playlist.length === 0) {
            console.warn('Плейлист пуст! Проверь структуру playlist.json');
            const lang = getLanguage();
            statusEl.textContent = lang === 'en' ? 'Playlist is empty. Check console (F12)' : 'Плейлист пуст. Проверь консоль (F12)';
            return;
        }
        
        // Создаем перемешанный плейлист если включен shuffle
        if (isShuffle) {
            shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
        } else {
            shuffledPlaylist = [...playlist];
        }
        
        console.log(`Перемешанный плейлист: ${shuffledPlaylist.length} треков`);
        
        // Обновляем Schema.org для плейлиста
        updatePlaylistSchema();
        
        // Создаем список треков для навигации
        createTracksList();
    } catch (error) {
        console.error('Ошибка загрузки плейлиста:', error);
        console.error('Current URL:', window.location.href);
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Error loading playlist: ' + error.message : 'Ошибка загрузки плейлиста: ' + error.message;
    }
}

// Загрузка трека
function loadTrack(index, autoPlay = false) {
    if (shuffledPlaylist.length === 0) {
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Playlist is empty' : 'Плейлист пуст';
        return;
    }
    
    // Используем перемешанный плейлист
    const track = shuffledPlaylist[index];
    if (!track) {
        // Если трек не найден, начинаем сначала
        if (isRepeat) {
            currentTrackIndex = 0;
            loadTrack(0, autoPlay);
        }
        return;
    }
    
    currentTrackIndex = index;
    // Путь к треку в зависимости от структуры папок
    let trackPath;
    const path = window.location.pathname;
    if (path.includes('/xmas/') || path.includes('/new-year/') || path.includes('/christmas/')) {
        // Из папки xmas/new-year/christmas нужно подняться на 2 уровня выше
        trackPath = '../../' + track.file;
    } else if (path.includes('/ru/') || path.includes('/en/')) {
        // Из папки ru/ или en/ нужно подняться на уровень выше
        trackPath = '../' + track.file;
    } else {
        trackPath = track.file;
    }
    audioPlayer.src = trackPath;
    
    console.log('Загрузка трека:', track.file, 'Track:', track.title);
    
    // Инициализируем визуализацию если еще не инициализирована
    if (!audioContext && canvas) {
        initAudioVisualizer();
    }
    
    // Обновляем информацию о треке
    updateTrackInfo();
    
    // Загружаем трек
    audioPlayer.load();
    
    // Проверяем состояние трека после небольшой задержки
    setTimeout(() => {
        if (!isPlaying) {
            // Проверяем что трек загружен и нет ошибок
            if (audioPlayer.readyState >= 2 && (!audioPlayer.error || audioPlayer.error.code === 0)) {
                // Трек загружен успешно, обновляем статус
                statusEl.classList.remove('loading');
                const lang = getLanguage();
                statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
            } else if (audioPlayer.error && audioPlayer.error.code !== 0) {
                // Есть реальная ошибка, но не показываем если не играет
                statusEl.classList.remove('loading');
                const lang = getLanguage();
                statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
            }
        }
    }, 1000);
    
    // Автоматически начинаем воспроизведение только если явно запрошено или уже играло
    if (autoPlay || isPlaying) {
        // Пытаемся запустить автоплей после небольшой задержки, чтобы трек успел загрузиться
        setTimeout(() => {
            if (audioPlayer.readyState >= 2) {
                audioPlayer.play().then(() => {
                    isPlaying = true;
                    updateUI();
                }).catch(err => {
                    console.log('Автоплей заблокирован браузером (это нормально):', err.name);
                    // Браузер блокирует автоплей - это нормально, не показываем ошибку
                    statusEl.classList.remove('loading');
                    const lang = getLanguage();
                    statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
                });
            } else {
                // Трек еще не загружен, ждем события canplay
                audioPlayer.addEventListener('canplay', () => {
                    audioPlayer.play().then(() => {
                        isPlaying = true;
                        updateUI();
                    }).catch(err => {
                        console.log('Автоплей заблокирован браузером (это нормально):', err.name);
                        statusEl.classList.remove('loading');
                        const lang = getLanguage();
                        statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
                    });
                }, { once: true });
            }
        }, 300);
    }
}

// Инициализация визуализации звука
function initAudioVisualizer() {
    if (!audioPlayer) return;
    
    // Настройка размера canvas внутри плеера
    if (canvas) {
        const resizeCanvas = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // Настройка размера фонового canvas
    if (backgroundCanvas) {
        const resizeBackgroundCanvas = () => {
            backgroundCanvas.width = window.innerWidth;
            backgroundCanvas.height = window.innerHeight;
        };
        resizeBackgroundCanvas();
        window.addEventListener('resize', resizeBackgroundCanvas);
    }
    
    // Создаем AudioContext и AnalyserNode
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Подключаем аудио к анализатору
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    } catch (e) {
        console.warn('Web Audio API не поддерживается:', e);
    }
}

// Визуализация звука
function drawVisualization() {
    if (!analyser || !isPlaying) {
        if (canvas) {
            canvas.classList.remove('active');
        }
        if (backgroundCanvas) {
            backgroundCanvas.classList.remove('active');
        }
        return;
    }
    
    if (canvas) {
        canvas.classList.add('active');
    }
    if (backgroundCanvas) {
        backgroundCanvas.classList.add('active');
    }
    
    animationFrameId = requestAnimationFrame(drawVisualization);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Рисуем на фоновом canvas (большой, на весь экран)
    if (backgroundCanvas && backgroundCanvasCtx) {
        const bgWidth = backgroundCanvas.width;
        const bgHeight = backgroundCanvas.height;
        
        // Очищаем с небольшим fade эффектом
        backgroundCanvasCtx.fillStyle = 'rgba(102, 126, 234, 0.05)';
        backgroundCanvasCtx.fillRect(0, 0, bgWidth, bgHeight);
        
        // Рисуем большие волны симметрично от центра
        const barCount = 40; // Половина от общего количества для симметрии
        const barWidth = (bgWidth / 2) / barCount; // Ширина для половины экрана
        const barGap = 1;
        const centerY = bgHeight / 2;
        const centerX = bgWidth / 2;
        
        // Рисуем полоски слева от центра
        for (let i = 0; i < barCount; i++) {
            // Для левой части используем обычный порядок частот
            const dataIndexLeft = Math.floor((i / barCount) * dataArray.length);
            const barHeightLeft = (dataArray[dataIndexLeft] / 255) * bgHeight * 0.4;
            
            const xLeft = centerX - (barCount - i) * barWidth;
            
            // Lofi цвета: фиолетовый, розовый, голубой
            const gradientLeft = backgroundCanvasCtx.createLinearGradient(
                xLeft, centerY - barHeightLeft,
                xLeft, centerY + barHeightLeft
            );
            gradientLeft.addColorStop(0, `rgba(118, 75, 162, 0.4)`); // #764ba2
            gradientLeft.addColorStop(0.5, `rgba(102, 126, 234, 0.5)`); // #667eea
            gradientLeft.addColorStop(1, `rgba(118, 75, 162, 0.3)`);
            
            backgroundCanvasCtx.fillStyle = gradientLeft;
            // Рисуем слева от центра
            backgroundCanvasCtx.fillRect(
                xLeft + barGap,
                centerY - barHeightLeft / 2,
                barWidth - barGap * 2,
                barHeightLeft
            );
            
            // Для правой части используем перевернутый порядок частот (зеркально)
            const reversedIndex = barCount - 1 - i;
            const dataIndexRight = Math.floor((reversedIndex / barCount) * dataArray.length);
            const barHeightRight = (dataArray[dataIndexRight] / 255) * bgHeight * 0.4;
            
            const xRight = centerX + i * barWidth;
            
            const gradientRight = backgroundCanvasCtx.createLinearGradient(
                xRight, centerY - barHeightRight,
                xRight, centerY + barHeightRight
            );
            gradientRight.addColorStop(0, `rgba(118, 75, 162, 0.4)`);
            gradientRight.addColorStop(0.5, `rgba(102, 126, 234, 0.5)`);
            gradientRight.addColorStop(1, `rgba(118, 75, 162, 0.3)`);
            
            backgroundCanvasCtx.fillStyle = gradientRight;
            // Рисуем справа от центра с перевернутыми частотами
            backgroundCanvasCtx.fillRect(
                xRight + barGap,
                centerY - barHeightRight / 2,
                barWidth - barGap * 2,
                barHeightRight
            );
        }
    }
    
    // Рисуем на canvas внутри плеера (внизу, одинаковые полоски)
    if (canvas && canvasCtx) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Очищаем canvas
        canvasCtx.clearRect(0, 0, width, height);
        
        // Рисуем полоски внизу, занимающие всю ширину
        const barCount = 60;
        const barWidth = width / barCount; // Без промежутков, полоски занимают всю ширину
        const maxBarHeight = height * 0.15; // Максимальная высота полосок
        
        // Усредняем данные для более равномерной высоты
        const smoothedData = [];
        for (let i = 0; i < barCount; i++) {
            const startIndex = Math.floor((i / barCount) * dataArray.length);
            const endIndex = Math.floor(((i + 1) / barCount) * dataArray.length);
            
            // Усредняем значения в диапазоне для этой полоски
            let sum = 0;
            let count = 0;
            for (let j = startIndex; j < endIndex && j < dataArray.length; j++) {
                sum += dataArray[j];
                count++;
            }
            const avg = count > 0 ? sum / count : 0;
            smoothedData.push(avg);
        }
        
        // Находим среднее значение для нормализации
        const avgValue = smoothedData.reduce((a, b) => a + b, 0) / smoothedData.length;
        const baseHeight = (avgValue / 255) * maxBarHeight;
        
        for (let i = 0; i < barCount; i++) {
            // Используем усредненное значение с небольшими вариациями
            const normalizedValue = smoothedData[i] / 255;
            // Делаем полоски примерно одинаковой высоты с небольшими вариациями
            const barHeight = baseHeight * 0.7 + (normalizedValue * maxBarHeight * 0.3);
            
            // Lofi цвета для внутренней визуализации
            const gradient = canvasCtx.createLinearGradient(
                i * barWidth, height - barHeight,
                i * barWidth, height
            );
            gradient.addColorStop(0, `rgba(118, 75, 162, 0.6)`);
            gradient.addColorStop(0.5, `rgba(102, 126, 234, 0.7)`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0.4)`);
            
            canvasCtx.fillStyle = gradient;
            // Рисуем снизу вверх
            canvasCtx.fillRect(
                i * barWidth,
                height - barHeight,
                barWidth,
                barHeight
            );
        }
    }
}

// Обновление Schema.org для плейлиста
function updatePlaylistSchema() {
    const schemaScript = document.getElementById('playlist-schema');
    if (!schemaScript || playlist.length === 0) return;
    
    const lang = getLanguage();
    const tracks = playlist.slice(0, 10).map(track => ({
        "@type": "MusicRecording",
        "name": cleanTrackTitle(track.title),
        "byArtist": {
            "@type": "MusicGroup",
            "name": track.artist || "Lofi Radio"
        }
    }));
    
    const schema = {
        "@context": "https://schema.org",
        "@type": "MusicPlaylist",
        "name": lang === 'en' ? "Lofi Radio Playlist" : "Lofi Radio Плейлист",
        "description": lang === 'en' 
            ? "Collection of relaxing lofi music for study, work and relaxation"
            : "Коллекция успокаивающей lofi музыки для учебы, работы и отдыха",
        "numTracks": playlist.length,
        "genre": ["Lofi Hip Hop", "Chill", "Ambient", "Study Music"],
        "inLanguage": lang,
        "track": tracks
    };
    
    schemaScript.textContent = JSON.stringify(schema);
}

// Удаление цифр в конце названия трека
function cleanTrackTitle(title) {
    if (!title) return title;
    // Убираем цифры и пробелы в конце строки
    return title.replace(/\s+\d+$/, '').trim();
}

// Создание списка треков для навигации
function createTracksList() {
    const tracksListEl = document.getElementById('tracksList');
    if (!tracksListEl || playlist.length === 0) return;
    
    // Используем оригинальный плейлист (не перемешанный) для списка
    playlist.forEach((track) => {
        const cleanTitle = cleanTrackTitle(track.title);
        const trackSlug = cleanTitle.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
        
        const trackUrl = `track/${trackSlug}.html`;
        const link = document.createElement('a');
        link.href = trackUrl;
        link.textContent = cleanTitle;
        link.style.cssText = 'color: rgba(255, 255, 255, 0.7); text-decoration: none; padding: 6px 12px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; font-size: 0.9em; transition: all 0.3s ease; backdrop-filter: blur(5px);';
        link.onmouseover = function() { this.style.color = 'rgba(255, 255, 255, 1)'; this.style.background = 'rgba(255, 255, 255, 0.15)'; };
        link.onmouseout = function() { this.style.color = 'rgba(255, 255, 255, 0.7)'; this.style.background = 'rgba(255, 255, 255, 0.05)'; };
        
        tracksListEl.appendChild(link);
    });
}

// Обновление информации о треке
function updateTrackInfo() {
    const track = shuffledPlaylist[currentTrackIndex];
    if (track) {
        const cleanTitle = cleanTrackTitle(track.title);
        
        // Создаем slug для ссылки на страницу трека
        const trackSlug = cleanTitle.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
        
        const trackUrl = `track/${trackSlug}.html`;
        
        // Делаем название трека кликабельным
        if (sourceInfoEl) {
            sourceInfoEl.innerHTML = `<a href="${trackUrl}" style="color: rgba(255, 255, 255, 0.9); text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='rgba(255, 255, 255, 1)'" onmouseout="this.style.color='rgba(255, 255, 255, 0.9)'">${cleanTitle}</a>${track.artist ? ' - ' + track.artist : ''}`;
        }
        
        if (trackCounterEl) {
            trackCounterEl.textContent = `${currentTrackIndex + 1} / ${shuffledPlaylist.length}`;
        }
        
        // Обновляем состояние лайка
        updateLikeButton();
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: cleanTitle,
                artist: track.artist || 'Lofi Radio',
                artwork: []
            });
        }
    }
}

// Форматирование времени
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Обновление времени трека
function updateTime() {
    if (!trackTimeEl || !audioPlayer) return;
    
    const current = audioPlayer.currentTime || 0;
    const duration = audioPlayer.duration || 0;
    
    if (duration && isFinite(duration)) {
        trackTimeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    } else {
        trackTimeEl.textContent = `${formatTime(current)} / --:--`;
    }
}

// Загрузка лайков из localStorage
function loadLikes() {
    try {
        const saved = localStorage.getItem('lofiRadioLikes');
        if (saved) {
            likedTracks = new Set(JSON.parse(saved));
        }
    } catch (e) {
        console.error('Ошибка загрузки лайков:', e);
    }
}

// Сохранение лайков в localStorage
function saveLikes() {
    try {
        localStorage.setItem('lofiRadioLikes', JSON.stringify([...likedTracks]));
    } catch (e) {
        console.error('Ошибка сохранения лайков:', e);
    }
}

// Обновление кнопки лайка
function updateLikeButton() {
    if (!likeBtn) return;
    
    const track = shuffledPlaylist[currentTrackIndex];
    if (!track) return;
    
    const trackId = track.id || track.file;
    const isLiked = likedTracks.has(trackId);
    
    if (isLiked) {
        likeBtn.classList.add('liked');
    } else {
        likeBtn.classList.remove('liked');
    }
}

// Переключение лайка
function toggleLike() {
    const track = shuffledPlaylist[currentTrackIndex];
    if (!track) return;
    
    const trackId = track.id || track.file;
    
    if (likedTracks.has(trackId)) {
        likedTracks.delete(trackId);
    } else {
        likedTracks.add(trackId);
    }
    
    updateLikeButton();
    saveLikes();
}

// Следующий трек
function playNext() {
    if (shuffledPlaylist.length === 0) return;
    
    let nextIndex = currentTrackIndex + 1;
    
    if (nextIndex >= shuffledPlaylist.length) {
        if (isRepeat) {
            // Перемешиваем заново если включен shuffle
            if (isShuffle) {
                shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
            }
            nextIndex = 0;
        } else {
            // Плейлист закончился
            isPlaying = false;
            updateUI();
            return;
        }
    }
    
    loadTrack(nextIndex);
    if (!isPlaying) {
        togglePlay();
    }
}

// Предыдущий трек
function playPrevious() {
    if (shuffledPlaylist.length === 0) return;
    
    let prevIndex = currentTrackIndex - 1;
    
    if (prevIndex < 0) {
        if (isRepeat) {
            prevIndex = shuffledPlaylist.length - 1;
        } else {
            return;
        }
    }
    
    loadTrack(prevIndex);
    if (!isPlaying) {
        togglePlay();
    }
}

// Переключение Play/Pause
function togglePlay() {
    if (shuffledPlaylist.length === 0) {
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Playlist is empty. Add tracks' : 'Плейлист пуст. Добавьте треки';
        return;
    }
    
    if (!audioPlayer.src) {
        loadTrack(0);
    }
    
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    isPlaying = true;
                    updateUI();
                })
                .catch(error => {
                    console.error('Ошибка воспроизведения:', error);
                    // Показываем ошибку только если это реальная ошибка воспроизведения
                    // Автоплей блокируется браузером - это нормально, не показываем ошибку
                    if (error.name !== 'NotAllowedError' && error.name !== 'NotSupportedError') {
                        const lang = getLanguage();
                        statusEl.textContent = lang === 'en' ? 'Error playing track' : 'Ошибка воспроизведения';
                    } else {
                        // Автоплей заблокирован - это нормально, просто обновляем статус
                        const lang = getLanguage();
                        statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
                    }
                });
        }
    }
}

// Обновление UI
function updateUI() {
    const lang = getLanguage();
    if (isPlaying) {
        playBtn.classList.add('playing');
        playBtn.querySelector('.play-icon').style.display = 'none';
        playBtn.querySelector('.pause-icon').style.display = 'block';
        statusEl.textContent = translations[lang]?.status?.playing || 'Играет';
        visualizer.classList.add('active');
        updateTrackInfo();
        // Запускаем визуализацию
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        drawVisualization();
    } else {
        playBtn.classList.remove('playing');
        playBtn.querySelector('.play-icon').style.display = 'block';
        playBtn.querySelector('.pause-icon').style.display = 'none';
        statusEl.textContent = translations[lang]?.status?.pause || 'Пауза';
        visualizer.classList.remove('active');
        // Останавливаем визуализацию
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (canvas) {
            canvas.classList.remove('active');
        }
        if (backgroundCanvas) {
            backgroundCanvas.classList.remove('active');
            // Очищаем фоновый canvas
            if (backgroundCanvasCtx) {
                backgroundCanvasCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
            }
        }
    }
}

// Сохранение состояния
window.addEventListener('beforeunload', () => {
    if (isPlaying) {
        localStorage.setItem('lofiRadioPlaying', 'true');
        localStorage.setItem('lofiRadioTrackIndex', currentTrackIndex.toString());
        localStorage.setItem('lofiRadioTime', audioPlayer.currentTime.toString());
    } else {
        localStorage.removeItem('lofiRadioPlaying');
        localStorage.removeItem('lofiRadioTrackIndex');
        localStorage.removeItem('lofiRadioTime');
    }
});

// Восстановление состояния
window.addEventListener('load', async () => {
    // Ждем загрузки плейлиста
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (playlist.length === 0) return;
    
    const wasPlaying = localStorage.getItem('lofiRadioPlaying') === 'true';
    const savedTrackIndex = parseInt(localStorage.getItem('lofiRadioTrackIndex') || '0');
    const savedTime = parseFloat(localStorage.getItem('lofiRadioTime') || '0');
    
    if (wasPlaying && savedTrackIndex < shuffledPlaylist.length && shuffledPlaylist.length > 0) {
        loadTrack(savedTrackIndex);
        audioPlayer.currentTime = savedTime;
        setTimeout(() => {
            togglePlay();
        }, 500);
    }
});

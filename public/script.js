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
    
    // Инициализация визуализации звука
    if (canvas) {
        canvasCtx = canvas.getContext('2d');
        initAudioVisualizer();
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
        console.error('Ошибка загрузки трека:', e);
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Error loading track' : 'Ошибка загрузки трека';
        // Пробуем следующий трек
        setTimeout(() => {
            playNext();
        }, 1000);
    });
    
    audioPlayer.addEventListener('loadstart', () => {
        statusEl.textContent = 'Загрузка...';
        statusEl.classList.add('loading');
    });
    
    audioPlayer.addEventListener('canplay', () => {
        statusEl.classList.remove('loading');
        if (isPlaying) {
            updateTrackInfo();
        }
        updateTime();
    });
    
    audioPlayer.addEventListener('timeupdate', () => {
        updateTime();
    });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateTime();
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
    
    // Загружаем первый трек после загрузки плейлиста
    if (shuffledPlaylist.length > 0) {
        loadTrack(0);
    } else {
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Playlist is empty. Add tracks to playlist.json' : 'Плейлист пуст. Добавьте треки в playlist.json';
        console.error('Плейлист не загружен. playlist.length:', playlist.length, 'shuffledPlaylist.length:', shuffledPlaylist.length);
    }
});

// Загрузка плейлиста
async function loadPlaylist() {
    try {
        // Путь к плейлисту (из папки ru/ или en/ нужно подняться на уровень выше)
        const playlistPath = window.location.pathname.includes('/ru/') || window.location.pathname.includes('/en/') 
            ? '../playlist.json' 
            : './playlist.json';
        const response = await fetch(playlistPath, {
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Загруженные данные:', data);
        
        playlist = data.tracks || [];
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
    } catch (error) {
        console.error('Ошибка загрузки плейлиста:', error);
        console.error('Current URL:', window.location.href);
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Error loading playlist: ' + error.message : 'Ошибка загрузки плейлиста: ' + error.message;
    }
}

// Загрузка трека
function loadTrack(index) {
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
            loadTrack(0);
        }
        return;
    }
    
    currentTrackIndex = index;
    // Путь к треку (из папки ru/ или en/ нужно подняться на уровень выше)
    const trackPath = window.location.pathname.includes('/ru/') || window.location.pathname.includes('/en/')
        ? '../' + track.file
        : track.file;
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
    
    // Автоматически начинаем воспроизведение если уже играло
    if (isPlaying) {
        audioPlayer.play().catch(err => {
            console.error('Ошибка автоплея:', err);
        });
    }
}

// Инициализация визуализации звука
function initAudioVisualizer() {
    if (!canvas || !audioPlayer) return;
    
    // Настройка размера canvas
    const resizeCanvas = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
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
    if (!canvas || !canvasCtx || !analyser || !isPlaying) {
        if (canvas) {
            canvas.classList.remove('active');
        }
        return;
    }
    
    canvas.classList.add('active');
    
    animationFrameId = requestAnimationFrame(drawVisualization);
    
    analyser.getByteFrequencyData(dataArray);
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Очищаем canvas
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    canvasCtx.fillRect(0, 0, width, height);
    
    // Рисуем волны
    const barCount = 60;
    const barWidth = width / barCount;
    const barGap = 2;
    
    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const barHeight = (dataArray[dataIndex] / 255) * height * 0.6;
        
        // Градиент для каждой полосы
        const gradient = canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, `rgba(102, 126, 234, 0.8)`);
        gradient.addColorStop(0.5, `rgba(255, 107, 107, 0.6)`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0.4)`);
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(
            i * barWidth + barGap,
            height - barHeight,
            barWidth - barGap * 2,
            barHeight
        );
    }
    
    // Рисуем дополнительные круги для эффекта
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.3;
    
    for (let i = 0; i < 3; i++) {
        const radius = (dataArray[i * 10] / 255) * maxRadius;
        const alpha = 0.1 + (dataArray[i * 10] / 255) * 0.2;
        
        canvasCtx.beginPath();
        canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        canvasCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
    }
}

// Удаление цифр в конце названия трека
function cleanTrackTitle(title) {
    if (!title) return title;
    // Убираем цифры и пробелы в конце строки
    return title.replace(/\s+\d+$/, '').trim();
}

// Обновление информации о треке
function updateTrackInfo() {
    const track = shuffledPlaylist[currentTrackIndex];
    if (track) {
        const cleanTitle = cleanTrackTitle(track.title);
        sourceInfoEl.textContent = `${cleanTitle}${track.artist ? ' - ' + track.artist : ''}`;
        trackCounterEl.textContent = `${currentTrackIndex + 1} / ${shuffledPlaylist.length}`;
        
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
                    statusEl.textContent = 'Ошибка воспроизведения';
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
        }
        if (canvas) {
            canvas.classList.remove('active');
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

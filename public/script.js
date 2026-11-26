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
let favoritesBtn;
let visualizer;
let isPlaying = false;
let shuffledPlaylist = [];
let likedTracks = new Set();
let favoritesOnly = false;
let canvas;
let canvasCtx;
let backgroundCanvas;
let backgroundCanvasCtx;
let analyser;
let audioContext;
let gainNode;
let dataArray;
let animationFrameId;
let volumeSlider;
let muteBtn;
let volumeBeforeMute = 0.8;
let isVolumeMuted = false;

const VOLUME_STORAGE_KEY = 'lofiradio-volume-v2';
const VOLUME_DEFAULT = 0.8;
const MUSIC_CDN = 'https://lofimusic.online';
const NATIVE_STALL_MS = 4000;
const WEB_STALL_MS = 12000;
const CDN_FAIL_LIMIT = 1;
let usingLocalFallback = false;
let offlineMode = false;
let fullOnlinePlaylist = [];
let cdnFailCount = 0;
let currentBlobUrl = null;
let loadToken = 0;
let loadAbort = null;
let stallTimer = null;

// Определение языка из URL пути (простая и единообразная логика)
function getLanguage() {
    if (typeof isNativeApp === 'function' && isNativeApp()) {
        try {
            const saved = localStorage.getItem('lofiradio-lang');
            if (saved === 'en' || saved === 'ru') return saved;
        } catch (e) {}
        return 'ru';
    }
    const path = window.location.pathname;
    if (path.startsWith('/en/') || path.startsWith('/en')) {
        return 'en';
    }
    if (path.startsWith('/ru/') || path.startsWith('/ru')) {
        return 'ru';
    }
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

    updateVolumeLabels(lang);
}

function getStoredVolume() {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored === null) return VOLUME_DEFAULT;
    const value = parseFloat(stored);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : VOLUME_DEFAULT;
}

function updateVolumeIcon(volume) {
    if (!muteBtn) return;

    const iconHigh = muteBtn.querySelector('.volume-icon-high');
    const iconLow = muteBtn.querySelector('.volume-icon-low');
    const iconMute = muteBtn.querySelector('.volume-icon-mute');
    if (!iconHigh || !iconLow || !iconMute) return;

    iconHigh.style.display = 'none';
    iconLow.style.display = 'none';
    iconMute.style.display = 'none';

    if (volume === 0 || isVolumeMuted) {
        iconMute.style.display = 'block';
    } else if (volume < 0.35) {
        iconLow.style.display = 'block';
    } else {
        iconHigh.style.display = 'block';
    }
}

function updateVolumeLabels(lang) {
    if (!muteBtn || !volumeSlider) return;
    const texts = translations[lang]?.volume;
    if (!texts) return;

    volumeSlider.setAttribute('aria-label', texts.label);
    muteBtn.setAttribute(
        'aria-label',
        isVolumeMuted || (audioPlayer && audioPlayer.volume === 0) ? texts.unmute : texts.mute
    );
}

function applyVolume(volume, save = true) {
    const clamped = Math.max(0, Math.min(1, volume));
    isVolumeMuted = clamped === 0;

    if (gainNode) {
        gainNode.gain.value = clamped;
    }
    if (audioPlayer) {
        audioPlayer.volume = clamped;
    }
    if (volumeSlider) {
        volumeSlider.value = Math.round(clamped * 100);
    }

    if (clamped > 0) {
        volumeBeforeMute = clamped;
    }

    updateVolumeIcon(clamped);
    updateVolumeLabels(getLanguage());

    if (save) {
        localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
    }
}

function toggleMute() {
    if (isVolumeMuted || (audioPlayer && audioPlayer.volume === 0)) {
        applyVolume(volumeBeforeMute > 0 ? volumeBeforeMute : VOLUME_DEFAULT);
    } else {
        volumeBeforeMute = audioPlayer ? audioPlayer.volume : volumeBeforeMute;
        applyVolume(0);
    }
}

function initVolumeControl() {
    const controls = document.querySelector('.controls');
    if (!controls || document.getElementById('volumeControl')) return;

    const lang = getLanguage();
    const texts = translations[lang]?.volume || {
        label: 'Громкость',
        mute: 'Выключить звук',
        unmute: 'Включить звук'
    };

    const volumeControl = document.createElement('div');
    volumeControl.id = 'volumeControl';
    volumeControl.className = 'volume-control';
    volumeControl.innerHTML = `
        <button type="button" id="muteBtn" class="volume-btn" aria-label="${texts.mute}">
            <svg class="volume-icon-high" viewBox="0 0 24 24" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke-linecap="round"/>
            </svg>
            <svg class="volume-icon-low" viewBox="0 0 24 24" aria-hidden="true" style="display: none;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/>
            </svg>
            <svg class="volume-icon-mute" viewBox="0 0 24 24" aria-hidden="true" style="display: none;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="23" y1="9" x2="17" y2="15" stroke-linecap="round"/>
                <line x1="17" y1="9" x2="23" y2="15" stroke-linecap="round"/>
            </svg>
        </button>
        <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="80"
            aria-label="${texts.label}" aria-valuemin="0" aria-valuemax="100">
    `;

    controls.parentNode.insertBefore(volumeControl, controls.nextSibling);

    muteBtn = document.getElementById('muteBtn');
    volumeSlider = document.getElementById('volumeSlider');

    applyVolume(getStoredVolume(), false);

    volumeSlider.addEventListener('input', () => {
        applyVolume(volumeSlider.value / 100);
    });

    muteBtn.addEventListener('click', toggleMute);
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    const lang = getLanguage();
    setLanguage(lang);
    
    audioPlayer = document.getElementById('audioPlayer');
    initVolumeControl();
    initSleepTimer();
    playBtn = document.getElementById('playBtn');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    statusEl = document.getElementById('status');
    sourceInfoEl = document.getElementById('sourceInfo');
    trackCounterEl = document.getElementById('trackCounter');
    trackTimeEl = document.getElementById('trackTime');
    likeBtn = document.getElementById('likeBtn');
    favoritesBtn = document.getElementById('favoritesBtn');
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
        syncNativeBackgroundAudio(true);
    });
    
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updateUI();
        if (audioPlayer.ended || document.hidden) {
            syncNativeBackgroundAudio(true);
        } else {
            syncNativeBackgroundAudio(false);
        }
    });
    
    audioPlayer.addEventListener('ended', () => {
        // Трек закончился, переключаем на следующий
        playNext();
    });
    
    audioPlayer.addEventListener('error', (e) => {
        console.error('Ошибка загрузки трека:', e, audioPlayer.error);
        console.error('Текущий src:', audioPlayer.src);
        console.error('Текущий URL:', window.location.href);
        statusEl.classList.remove('loading');

        const track = shuffledPlaylist[currentTrackIndex];
        if (handleNativeTrackError(track)) return;

        if (audioPlayer.error && audioPlayer.error.code !== 0) {
            if (isPlaying || audioPlayer.error.code === 4) {
                const lang = getLanguage();
                statusEl.textContent = lang === 'en' ? 'Error loading track' : 'Ошибка загрузки трека';
                setTimeout(() => {
                    playNext();
                }, 1000);
            } else {
                const lang = getLanguage();
                statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
            }
        } else {
            const lang = getLanguage();
            statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
        }
    });

    audioPlayer.addEventListener('canplay', () => {
        if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
        }
        cdnFailCount = 0;
    });
    
    audioPlayer.addEventListener('loadstart', () => {
        statusEl.textContent = 'Загрузка...';
        statusEl.classList.add('loading');
    });
    
    audioPlayer.addEventListener('canplay', () => {
        if (!usingLocalFallback && /^https?:\/\//i.test(audioPlayer.currentSrc || audioPlayer.src || '')) {
            cdnFailCount = 0;
        }
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
    if (favoritesBtn) favoritesBtn.addEventListener('click', toggleFavoritesOnly);
    initLanguageToggle();
    
    // Поддержка медиа-клавиш
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
        navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
        navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }

    initNativeShell();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        } else if (isPlaying) {
            drawVisualization();
        }
    });

    // Управление с клавиатуры
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isInputElement =
            activeElement &&
            (activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable);

        // Не перехватываем ввод в полях/текстовых областях
        if (isInputElement) {
            return;
        }

        switch (event.key) {
            case ' ':
            case 'Spacebar': // старые браузеры
                event.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                event.preventDefault();
                playNext();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                playPrevious();
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (audioPlayer) {
                    applyVolume(audioPlayer.volume + 0.05);
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (audioPlayer) {
                    applyVolume(audioPlayer.volume - 0.05);
                }
                break;
            case 'k':
            case 'K':
                // Альтернатива для Space — удобно на ноутбуках
                event.preventDefault();
                togglePlay();
                break;
        }
    });
    
    // Загружаем первый трек после загрузки плейлиста и пытаемся запустить автоплей
    if (shuffledPlaylist.length > 0) {
        loadTrack(0, true, offlineMode);
        
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

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

function trackKey(track) {
    if (!track) return '';
    const raw = String(track.local || track.file || track.id || '');
    const base = raw.replace(/^https?:\/\/[^/]+\//i, '').split('/').pop() || raw;
    return base.replace(/\.mp3$/i, '');
}

function isLikedTrack(track) {
    if (!track) return false;
    const key = trackKey(track);
    return likedTracks.has(key) || likedTracks.has(track.id) || likedTracks.has(track.file);
}

function activeQueue() {
    if (!favoritesOnly) return playlist.slice();
    return playlist.filter(isLikedTrack);
}

function rebuildQueue(keepCurrent) {
    const current = shuffledPlaylist[currentTrackIndex];
    const queue = activeQueue();
    shuffledPlaylist = isShuffle ? shuffleArray(queue) : queue;
    if (!shuffledPlaylist.length) {
        currentTrackIndex = 0;
        return;
    }
    if (keepCurrent && current) {
        const idx = shuffledPlaylist.findIndex((t) => trackKey(t) === trackKey(current));
        currentTrackIndex = idx >= 0 ? idx : 0;
    } else {
        currentTrackIndex = 0;
    }
}

function languageToggleUrl() {
    const lang = getLanguage();
    if (isNativeApp()) return lang === 'en' ? '../' : './en/';
    return lang === 'en' ? '/ru/' : '/en/';
}

function refreshLanguageToggle() {
    const btn = document.getElementById('langToggle');
    const code = document.getElementById('langToggleCode');
    if (!btn) return;
    const lang = getLanguage();
    if (code) code.textContent = lang === 'en' ? 'RU' : 'EN';
    btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Russian' : 'Switch to English');
}

function initLanguageToggle() {
    const btn = document.getElementById('langToggle');
    if (!btn) return;
    refreshLanguageToggle();
    btn.onclick = () => {
        const current = getLanguage();
        const next = current === 'en' ? 'ru' : 'en';
        try { localStorage.setItem('lofiradio-lang', next); } catch (e) {}
        if (isNativeApp()) {
            document.documentElement.lang = next;
            setLanguage(next);
            refreshLanguageToggle();
            createTracksList();
            updateTrackInfo();
            updateUI();
            return;
        }
        window.location.href = languageToggleUrl();
    };
}

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
            console.log('Все треки:', allTracks.map(t => ({ title: t.title, category: t.category })));
            console.log('Отфильтрованные xmas треки:', playlist.map(t => ({ title: t.title, category: t.category, file: t.file })));
            if (playlist.length === 0) {
                const lang = getLanguage();
                if (statusEl) {
                    statusEl.textContent = lang === 'en' ? 'No Xmas tracks available. Add MP3 files to assets/music/xmas/ folder and run create-playlist.ps1' : 'Нет новогодних треков. Добавьте MP3 файлы в папку assets/music/xmas/ и запустите create-playlist.ps1';
                }
                console.warn('Нет xmas треков! Добавьте треки в папку xmas и запустите create-playlist.ps1');
                // Не выходим, продолжаем выполнение чтобы создать пустой shuffledPlaylist
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

        fullOnlinePlaylist = playlist.slice();
        // RuStore / poor networks: play bundled MP3s first (Benzin-style local-first).
        if (isNativeApp() && applyOfflineFirstPlaylist()) {
            console.warn('Native offline-first:', playlist.length, 'bundled tracks');
            probeCdnAndUpgrade();
        }
        
        rebuildQueue(false);
        
        console.log(`Перемешанный плейлист: ${shuffledPlaylist.length} треков`);
        
        // Обновляем Schema.org для плейлиста
        updatePlaylistSchema();
        
        // Создаем список треков для навигации
        createTracksList();
        
        // Загружаем первый трек для автозапуска
        if (shuffledPlaylist.length > 0) {
            loadTrack(0, true, offlineMode);
        }
    } catch (error) {
        console.error('Ошибка загрузки плейлиста:', error);
        console.error('Current URL:', window.location.href);
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Error loading playlist: ' + error.message : 'Ошибка загрузки плейлиста: ' + error.message;
    }
}

function relativeTrackFile(track) {
    if (!track) return '';
    const raw = track.local || track.file || '';
    return String(raw).replace(/^https?:\/\/[^/]+\//i, '').replace(/^\//, '');
}

function localTrackUrl(rel) {
    if (!rel) return '';
    const path = window.location.pathname || '';
    if (path.includes('/xmas/') || path.includes('/new-year/') || path.includes('/christmas/')) {
        return '../../' + rel;
    }
    if (path.includes('/ru/') || path.includes('/en/')) {
        return '../' + rel;
    }
    return rel;
}

function resolveTrackUrl(track, preferLocal) {
    if ((preferLocal || offlineMode) && track.local) {
        return localTrackUrl(track.local);
    }
    if (track.file && /^https?:\/\//i.test(track.file)) {
        return track.file;
    }
    const rel = relativeTrackFile(track);
    if (isNativeApp() && rel && !offlineMode) {
        return `${MUSIC_CDN}/${rel}`;
    }
    return localTrackUrl(rel);
}

function applyOfflineFirstPlaylist() {
    const source = fullOnlinePlaylist.length ? fullOnlinePlaylist : playlist;
    const locals = source.filter((t) => t.local);
    if (!locals.length) return false;
    offlineMode = true;
    playlist = locals;
    cdnFailCount = 0;
    return true;
}

function switchToOfflinePlaylist() {
    if (!applyOfflineFirstPlaylist()) return false;
    shuffledPlaylist = isShuffle ? shuffleArray([...playlist]) : [...playlist];
    console.warn('CDN unavailable, playing', playlist.length, 'bundled tracks');
    return true;
}

function probeCdnAndUpgrade() {
    if (!isNativeApp() || !fullOnlinePlaylist.length) return;
    const sample =
        fullOnlinePlaylist.find((t) => t.local) ||
        fullOnlinePlaylist[0];
    const rel = relativeTrackFile(sample);
    if (!rel) return;
    const url = `${MUSIC_CDN}/${rel}`;

    const probe = new Audio();
    probe.preload = 'metadata';
    let settled = false;
    const done = (ok) => {
        if (settled) return;
        settled = true;
        try {
            probe.removeAttribute('src');
            probe.load();
        } catch (e) { /* ignore */ }
        if (!ok || !offlineMode) return;
        offlineMode = false;
        playlist = fullOnlinePlaylist.slice();
        const current = shuffledPlaylist[currentTrackIndex];
        rebuildQueue(false);
        if (current) {
            const idx = shuffledPlaylist.findIndex((t) => trackKey(t) === trackKey(current));
            if (idx >= 0) currentTrackIndex = idx;
        }
        createTracksList();
        updateTrackInfo();
        console.log('CDN reachable, restored full playlist:', playlist.length);
    };
    const timer = setTimeout(() => done(false), 4500);
    probe.addEventListener('loadedmetadata', () => {
        clearTimeout(timer);
        done(true);
    }, { once: true });
    probe.addEventListener('error', () => {
        clearTimeout(timer);
        done(false);
    }, { once: true });
    try {
        probe.src = url;
    } catch (e) {
        clearTimeout(timer);
        done(false);
    }
}

function revokeTrackBlob() {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
}

function needsBlobFetch(url) {
    if (!isNativeApp()) return false;
    if (!/^https?:\/\//i.test(url)) return false;
    try {
        const host = new URL(url).hostname;
        if (host === 'lofimusic.online' || host === 'www.lofimusic.online') return false;
        if (host === location.hostname) return false;
    } catch (e) {
        return false;
    }
    return true;
}

async function materializeTrackUrl(url, signal) {
    if (!needsBlobFetch(url)) return url;
    const res = await fetch(url, { mode: 'cors', signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const buf = await res.arrayBuffer();
    if (ct.includes('text/html') || buf.byteLength < 4000) {
        throw new Error('not audio');
    }
    revokeTrackBlob();
    currentBlobUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
    return currentBlobUrl;
}

function handleNativeTrackError(track) {
    if (!isNativeApp() || !track) return false;
    if (!usingLocalFallback && track.local) {
        loadTrack(currentTrackIndex, true, true);
        return true;
    }
    cdnFailCount += 1;
    const forceOffline = !navigator.onLine || offlineMode || cdnFailCount >= CDN_FAIL_LIMIT;
    if (forceOffline && switchToOfflinePlaylist()) {
        loadTrack(0, true, true);
        return true;
    }
    setTimeout(() => playNext(), 250);
    return true;
}

function tryAutoplay(token) {
    if (token !== loadToken) return;
    const play = () => {
        if (token !== loadToken) return;
        audioPlayer.play().then(() => {
            isPlaying = true;
            updateUI();
        }).catch((err) => {
            console.log('Автоплей заблокирован браузером (это нормально):', err.name);
            statusEl.classList.remove('loading');
            const lang = getLanguage();
            statusEl.textContent = translations[lang]?.status?.clickToStart || 'Нажмите для начала';
        });
    };
    if (audioPlayer.readyState >= 2) {
        play();
        return;
    }
    audioPlayer.addEventListener('canplay', play, { once: true });
}

function applyTrackSrc(src, track, autoPlay, token) {
    if (token !== loadToken) return;
    audioPlayer.src = src;
    console.log('Загрузка трека:', track.file, 'Track:', track.title);
    console.log('Полный путь к треку:', src, 'Текущий путь:', window.location.pathname);
    audioPlayer.load();
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
        if (token !== loadToken) return;
        if (audioPlayer.readyState < 2) {
            console.warn('Track stall', src);
            handleNativeTrackError(track);
        }
    }, isNativeApp() ? NATIVE_STALL_MS : WEB_STALL_MS);
    if (autoPlay || isPlaying) {
        setTimeout(() => tryAutoplay(token), 200);
    }
}

function loadTrack(index, autoPlay = false, preferLocal = false) {
    if (shuffledPlaylist.length === 0) {
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Playlist is empty' : 'Плейлист пуст';
        return;
    }

    const track = shuffledPlaylist[index];
    if (!track) {
        if (isRepeat) {
            currentTrackIndex = 0;
            loadTrack(0, autoPlay);
        }
        return;
    }

    currentTrackIndex = index;
    usingLocalFallback = !!(preferLocal || offlineMode) && !!track.local;
    const trackPath = resolveTrackUrl(track, usingLocalFallback || offlineMode);
    const token = ++loadToken;
    if (loadAbort) loadAbort.abort();
    loadAbort = new AbortController();
    if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
    }

    if (!audioContext && canvas) {
        initAudioVisualizer();
    }

    updateTrackInfo();
    createTracksList();

    if (needsBlobFetch(trackPath)) {
        const lang = getLanguage();
        statusEl.textContent = lang === 'en' ? 'Loading…' : 'Загрузка...';
        statusEl.classList.add('loading');
        materializeTrackUrl(trackPath, loadAbort.signal).then((src) => {
            applyTrackSrc(src, track, autoPlay, token);
        }).catch((err) => {
            if (err && err.name === 'AbortError') return;
            console.warn('Remote track fetch failed', trackPath, err);
            handleNativeTrackError(track);
        });
        return;
    }

    applyTrackSrc(trackPath, track, autoPlay, token);
}

// Инициализация визуализации звука
function initAudioVisualizer() {
    if (!audioPlayer) return;
    if (isNativeApp()) return;
    
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
        
        // Подключаем аудио через GainNode (иначе audio.volume не влияет на выход)
        gainNode = audioContext.createGain();
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);

        const currentVolume = volumeSlider
            ? volumeSlider.value / 100
            : getStoredVolume();
        applyVolume(currentVolume, false);
    } catch (e) {
        console.warn('Web Audio API не поддерживается:', e);
        gainNode = null;
    }
}

// Визуализация звука
function drawVisualization() {
    if (document.hidden) return;
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
    // Убираем все цифры в конце строки (включая пробелы перед ними)
    // Простая и единообразная логика: убираем числа в конце
    return title.replace(/\s*\d+\s*$/, '').trim();
}

// Создание списка треков для навигации
function createTracksList() {
    const tracksListEl = document.getElementById('tracksList');
    const heading = document.getElementById('tracksHeading');
    if (!tracksListEl || playlist.length === 0) return;

    const lang = getLanguage();
    const t = translations[lang] || translations.ru;
    if (heading) heading.textContent = favoritesOnly ? t.tracksFav : t.tracksAll;
    if (favoritesBtn) {
        favoritesBtn.classList.toggle('active', favoritesOnly);
        favoritesBtn.textContent = t.tracksFav;
        favoritesBtn.title = favoritesOnly ? t.favOff : t.favOn;
    }

    tracksListEl.innerHTML = '';
    const shown = favoritesOnly ? activeQueue() : playlist;
    const currentKey = trackKey(shuffledPlaylist[currentTrackIndex]);

    shown.forEach((track) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'track-chip';
        btn.textContent = cleanTrackTitle(track.title);
        if (isLikedTrack(track)) btn.classList.add('liked');
        if (trackKey(track) === currentKey) btn.classList.add('current');
        btn.addEventListener('click', () => {
            const idx = shuffledPlaylist.findIndex((item) => trackKey(item) === trackKey(track));
            if (idx >= 0) {
                loadTrack(idx, true);
            } else {
                shuffledPlaylist.unshift(track);
                loadTrack(0, true);
            }
            createTracksList();
        });
        tracksListEl.appendChild(btn);
    });
}

// Обновление информации о треке
function updateTrackInfo() {
    const track = shuffledPlaylist[currentTrackIndex];
    if (track) {
        const cleanTitle = cleanTrackTitle(track.title);
        
        // Определяем текущий язык для правильного формирования URL
        const lang = getLanguage();
        
        // Создаем slug для ссылки на страницу трека
        const trackSlug = cleanTitle.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
        
        // Добавляем префикс языка к URL трека
        const trackUrl = `${lang}/track/${trackSlug}.html`;
        
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
    
    const trackId = trackKey(track);
    const isLiked = isLikedTrack(track);
    
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
    
    const trackId = trackKey(track);
    
    if (isLikedTrack(track)) {
        likedTracks.delete(trackId);
        likedTracks.delete(track.id);
        likedTracks.delete(track.file);
    } else {
        likedTracks.add(trackId);
    }
    
    updateLikeButton();
    saveLikes();
    if (favoritesOnly && !isLikedTrack(track)) {
        rebuildQueue(false);
        if (shuffledPlaylist.length === 0) {
            favoritesOnly = false;
            rebuildQueue(false);
        }
        if (shuffledPlaylist.length) loadTrack(0, isPlaying);
    }
    createTracksList();
}

function toggleFavoritesOnly() {
    const lang = getLanguage();
    const t = translations[lang] || translations.ru;
    if (!favoritesOnly && playlist.filter(isLikedTrack).length === 0) {
        if (statusEl) statusEl.textContent = t.favEmpty;
        return;
    }
    favoritesOnly = !favoritesOnly;
    rebuildQueue(true);
    if (!shuffledPlaylist.length) {
        favoritesOnly = false;
        rebuildQueue(true);
        if (statusEl) statusEl.textContent = t.favEmpty;
        return;
    }
    loadTrack(currentTrackIndex, isPlaying);
    createTracksList();
}

// Следующий трек
function playNext() {
    if (shuffledPlaylist.length === 0) return;
    
    let nextIndex = currentTrackIndex + 1;
    
    if (nextIndex >= shuffledPlaylist.length) {
        if (isRepeat) {
            // Перемешиваем заново если включен shuffle
            if (isShuffle) {
                shuffledPlaylist = shuffleArray(activeQueue());
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
let sleepTimerId = null;
let sleepEndAt = 0;
let sleepActiveMinutes = 0;
let sleepBaseVolume = null;

function clearSleepTimer(restoreVol = false) {
    if (sleepTimerId) {
        clearInterval(sleepTimerId);
        sleepTimerId = null;
    }
    sleepEndAt = 0;
    sleepActiveMinutes = 0;
    if (restoreVol && sleepBaseVolume !== null) {
        applyVolume(sleepBaseVolume, false);
    }
    sleepBaseVolume = null;
    const countdownEl = document.getElementById('sleepCountdown');
    if (countdownEl) countdownEl.textContent = '';
    document.querySelectorAll('#sleepTimer .sleep-btn').forEach((b) => b.classList.remove('active'));
}

function initSleepTimer() {
    const container = document.getElementById('sleepTimer');
    const countdownEl = document.getElementById('sleepCountdown');
    if (!container || !countdownEl) return;

    const tick = () => {
        const remainingMs = sleepEndAt - Date.now();
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        if (remainingSec <= 0) {
            if (audioPlayer && !audioPlayer.paused) {
                audioPlayer.pause();
            }
            const volToRestore = sleepBaseVolume !== null ? sleepBaseVolume : getStoredVolume();
            clearSleepTimer(false);
            applyVolume(volToRestore, false);
            return;
        }
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        countdownEl.textContent = `${m}:${String(s).padStart(2, '0')}`;

        if (remainingSec <= 10) {
            if (sleepBaseVolume === null) {
                sleepBaseVolume = getStoredVolume();
            }
            applyVolume(sleepBaseVolume * (remainingSec / 10), false);
        }
    };

    container.querySelectorAll('.sleep-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const mins = parseInt(btn.dataset.minutes, 10);
            if (!mins) return;
            if (sleepActiveMinutes === mins && sleepTimerId) {
                clearSleepTimer(true);
                return;
            }
            clearSleepTimer(true);
            sleepActiveMinutes = mins;
            sleepBaseVolume = getStoredVolume();
            sleepEndAt = Date.now() + mins * 60 * 1000;
            btn.classList.add('active');
            tick();
            sleepTimerId = setInterval(tick, 1000);
        });
    });
}

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

// Cold start: always a random track. Do not resume the last index.

// Фейерверки для новогодних страниц
function initFireworks() {
    const fireworksContainer = document.getElementById('fireworks-container');
    if (!fireworksContainer) {
        console.warn('Fireworks container not found');
        return;
    }
    
    function createFirework() {
        const firework = document.createElement('div');
        firework.classList.add('firework');
        fireworksContainer.appendChild(firework);

        const colors = ['#FFD700', '#FF69B4', '#87CEEB', '#FFA07A', '#FF4500']; // Gold, Pink, SkyBlue, LightSalmon, OrangeRed
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        firework.style.background = randomColor;

        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight;
        const endY = Math.random() * window.innerHeight / 2;
        const endX = startX + (Math.random() - 0.5) * 200; // Slight horizontal drift

        firework.style.left = `${startX}px`;
        firework.style.top = `${startY}px`;

        const animation = firework.animate([
            { transform: `translateY(0) translateX(0) scale(0.5)`, opacity: 0.8 },
            { transform: `translateY(${endY - startY}px) translateX(${endX - startX}px) scale(1)`, opacity: 1 }
        ], {
            duration: 1000 + Math.random() * 1000, // 1-2 seconds
            easing: 'ease-out',
            fill: 'forwards'
        });

        animation.onfinish = () => {
            // Create sparks
            for (let i = 0; i < 30; i++) {
                const spark = document.createElement('div');
                spark.classList.add('spark');
                spark.style.background = randomColor;
                spark.style.left = `${firework.offsetLeft + firework.offsetWidth / 2}px`;
                spark.style.top = `${firework.offsetTop + firework.offsetHeight / 2}px`;
                fireworksContainer.appendChild(spark);

                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 80 + 20; // 20-100px
                const sparkX = firework.offsetLeft + Math.cos(angle) * distance;
                const sparkY = firework.offsetTop + Math.sin(angle) * distance;

                const sparkAnimation = spark.animate([
                    { transform: `translate(0,0) scale(1)`, opacity: 1 },
                    { transform: `translate(${sparkX - firework.offsetLeft}px, ${sparkY - firework.offsetTop}px) scale(0)`, opacity: 0 }
                ], {
                    duration: 500 + Math.random() * 500, // 0.5-1 second
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                sparkAnimation.onfinish = () => spark.remove();
            }
            firework.remove();
        };
    }

    // Launch fireworks periodically
    setInterval(createFirework, 2000 + Math.random() * 2000); // Every 2-4 seconds
    // Sometimes launch multiple at once
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance for extra fireworks
            setTimeout(createFirework, Math.random() * 300);
            setTimeout(createFirework, Math.random() * 300);
        }
    }, 5000);
}

function isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function nativeBackgroundAudio() {
    const cap = window.Capacitor;
    if (!cap || !isNativeApp()) return null;
    if (cap.Plugins && cap.Plugins.BackgroundAudio) return cap.Plugins.BackgroundAudio;
    if (typeof cap.registerPlugin === 'function') {
        try {
            return cap.registerPlugin('BackgroundAudio');
        } catch (e) {
            console.warn('registerPlugin BackgroundAudio', e);
        }
    }
    return null;
}

function currentNativeTrack() {
    const track = shuffledPlaylist[currentTrackIndex];
    return {
        title: track ? cleanTrackTitle(track.title) : 'Lofi Radio',
        artist: (track && track.artist) || 'Lofi Radio',
        playing: !!isPlaying
    };
}

function syncNativeBackgroundAudio(playing) {
    const plugin = nativeBackgroundAudio();
    if (!plugin) return;
    const info = currentNativeTrack();
    info.playing = playing;
    if (playing) {
        plugin.start(info).catch((err) => console.warn('BackgroundAudio.start', err));
    } else if (document.hidden) {
        plugin.update(info).catch((err) => console.warn('BackgroundAudio.update', err));
    } else {
        plugin.stop().catch((err) => console.warn('BackgroundAudio.stop', err));
    }
}

function initNativeShell() {
    if (!isNativeApp()) return;

    const path = window.location.pathname || '';
    if (path.includes('/en/') || path.endsWith('/en') || path.endsWith('/en/index.html')) {
        window.location.replace('../index.html');
        return;
    }

    document.documentElement.classList.add('capacitor-native');
    document.body.classList.add('capacitor-native');

    if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => reg.unregister());
        });
    }

    const App = window.Capacitor.Plugins?.App;
    const SplashScreen = window.Capacitor.Plugins?.SplashScreen;
    const StatusBar = window.Capacitor.Plugins?.StatusBar;
    const plugin = nativeBackgroundAudio();

    if (StatusBar?.setStyle) {
        StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#1a1a2e' }).catch(() => {});
    }
    if (SplashScreen?.hide) {
        SplashScreen.hide().catch(() => {});
    }

    if (App?.addListener) {
        App.addListener('backButton', (ev) => {
            if (ev.canGoBack) {
                window.history.back();
                return;
            }
            if (plugin?.minimize) plugin.minimize();
        });
    }

    if (plugin?.addListener) {
        plugin.addListener('control', (data) => {
            const action = data && data.action;
            if (action === 'play') {
                if (audioPlayer && audioPlayer.paused) audioPlayer.play().catch(() => {});
            } else if (action === 'pause') {
                if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();
            } else if (action === 'next') {
                playNext();
            } else if (action === 'prev') {
                playPrevious();
            }
        });
    }

    window.__lofiDebug = {
        isPlaying: () => isPlaying,
        paused: () => !audioPlayer || audioPlayer.paused,
        time: () => (audioPlayer ? audioPlayer.currentTime : 0),
        native: true
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('testPlay') === '1') {
        setTimeout(() => {
            if (!isPlaying) togglePlay();
        }, 1200);
    }
}


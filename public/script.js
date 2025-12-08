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

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
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
        statusEl.textContent = 'Ошибка загрузки трека';
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
        statusEl.textContent = 'Плейлист пуст. Добавьте треки в playlist.json';
        console.error('Плейлист не загружен. playlist.length:', playlist.length, 'shuffledPlaylist.length:', shuffledPlaylist.length);
    }
});

// Загрузка плейлиста
async function loadPlaylist() {
    try {
        const response = await fetch('playlist.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Загруженные данные:', data);
        
        playlist = data.tracks || [];
        isShuffle = data.shuffle !== false;
        isRepeat = data.repeat !== false;
        
        console.log(`Загружено треков: ${playlist.length}`);
        
        // Создаем перемешанный плейлист если включен shuffle
        if (isShuffle) {
            shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
        } else {
            shuffledPlaylist = [...playlist];
        }
        
        console.log(`Перемешанный плейлист: ${shuffledPlaylist.length} треков`);
    } catch (error) {
        console.error('Ошибка загрузки плейлиста:', error);
        statusEl.textContent = 'Ошибка загрузки плейлиста: ' + error.message;
    }
}

// Загрузка трека
function loadTrack(index) {
    if (shuffledPlaylist.length === 0) {
        statusEl.textContent = 'Плейлист пуст';
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
    audioPlayer.src = track.file;
    
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

// Обновление информации о треке
function updateTrackInfo() {
    const track = shuffledPlaylist[currentTrackIndex];
    if (track) {
        sourceInfoEl.textContent = `${track.title}${track.artist ? ' - ' + track.artist : ''}`;
        trackCounterEl.textContent = `${currentTrackIndex + 1} / ${shuffledPlaylist.length}`;
        
        // Обновляем состояние лайка
        updateLikeButton();
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
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
        statusEl.textContent = 'Плейлист пуст. Добавьте треки';
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
    if (isPlaying) {
        playBtn.classList.add('playing');
        playBtn.querySelector('.play-icon').style.display = 'none';
        playBtn.querySelector('.pause-icon').style.display = 'block';
        statusEl.textContent = 'Играет';
        visualizer.classList.add('active');
        updateTrackInfo();
    } else {
        playBtn.classList.remove('playing');
        playBtn.querySelector('.play-icon').style.display = 'block';
        playBtn.querySelector('.pause-icon').style.display = 'none';
        statusEl.textContent = 'Пауза';
        visualizer.classList.remove('active');
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

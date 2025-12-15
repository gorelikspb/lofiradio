// Мини-плеер для статей блога
class MiniPlayer {
    constructor(containerId, tracks, mainPlayerLink) {
        this.container = document.getElementById(containerId);
        this.tracks = tracks;
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.audio = null;
        this.mainPlayerLink = mainPlayerLink;
        this.init();
    }
    
    getLanguage() {
        const path = window.location.pathname;
        if (path.includes('/en/')) return 'en';
        return 'ru';
    }
    
    init() {
        if (!this.container) return;
        
        this.createPlayerHTML();
        this.setupAudio();
        this.setupEventListeners();
    }
    
    createPlayerHTML() {
        const currentTrack = this.tracks[this.currentTrackIndex];
        const cleanTitle = currentTrack.title.replace(/\s+\d+$/, '').trim();
        
        const lang = this.getLanguage();
        const titleText = lang === 'ru' ? '🎵 Слушайте пока читаете' : '🎵 Listen while reading';
        const linkText = lang === 'ru' ? 'Полный плеер →' : 'Full player →';
        
        this.container.innerHTML = `
            <div class="mini-player-header">
                <h3 class="mini-player-title">${titleText}</h3>
                <a href="${this.mainPlayerLink}" class="mini-player-link">${linkText}</a>
            </div>
            <div class="mini-player-controls">
                <button class="mini-play-btn" id="miniPlayBtn" aria-label="Play/Pause">
                    <svg class="mini-play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="5 3 19 12 5 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="mini-pause-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: none;">
                        <rect x="6" y="4" width="4" height="16" stroke-width="2"/>
                        <rect x="14" y="4" width="4" height="16" stroke-width="2"/>
                    </svg>
                </button>
                <div class="mini-track-info">
                    <div class="mini-track-name" id="miniTrackName">${cleanTitle}</div>
                    <div class="mini-track-artist" id="miniTrackArtist">${currentTrack.artist}</div>
                </div>
            </div>
            <div class="mini-progress-container" id="miniProgressContainer">
                <div class="mini-progress-bar" id="miniProgressBar"></div>
            </div>
            <div class="mini-time-info">
                <span id="miniCurrentTime">0:00</span>
                <span id="miniDuration">0:00</span>
            </div>
        `;
    }
    
    setupAudio() {
        const currentTrack = this.tracks[this.currentTrackIndex];
        const trackPath = currentTrack.file.startsWith('assets/') 
            ? `../../${currentTrack.file}` 
            : currentTrack.file;
        
        this.audio = new Audio(trackPath);
        this.audio.preload = 'metadata';
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audio.addEventListener('ended', () => {
            this.playNext();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Ошибка загрузки трека:', e);
        });
    }
    
    setupEventListeners() {
        const playBtn = this.container.querySelector('#miniPlayBtn');
        const progressContainer = this.container.querySelector('#miniProgressContainer');
        
        playBtn.addEventListener('click', () => {
            this.togglePlay();
        });
        
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seek(percent);
        });
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (!this.audio) {
            this.setupAudio();
        }
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
        }).catch(err => {
            console.error('Ошибка воспроизведения:', err);
        });
    }
    
    pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
            this.updatePlayButton();
        }
    }
    
    playNext() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.updateTrack();
        if (this.isPlaying) {
            this.play();
        }
    }
    
    updateTrack() {
        const currentTrack = this.tracks[this.currentTrackIndex];
        const cleanTitle = currentTrack.title.replace(/\s+\d+$/, '').trim();
        
        this.container.querySelector('#miniTrackName').textContent = cleanTitle;
        this.container.querySelector('#miniTrackArtist').textContent = currentTrack.artist;
        
        this.setupAudio();
    }
    
    updatePlayButton() {
        const playIcon = this.container.querySelector('.mini-play-icon');
        const pauseIcon = this.container.querySelector('.mini-pause-icon');
        
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }
    
    updateProgress() {
        if (!this.audio) return;
        
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.container.querySelector('#miniProgressBar').style.width = percent + '%';
        this.updateCurrentTime();
    }
    
    updateCurrentTime() {
        if (!this.audio) return;
        
        const currentTime = Math.floor(this.audio.currentTime);
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        this.container.querySelector('#miniCurrentTime').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateDuration() {
        if (!this.audio || !this.audio.duration) return;
        
        const duration = Math.floor(this.audio.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        this.container.querySelector('#miniDuration').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    seek(percent) {
        if (!this.audio || !this.audio.duration) return;
        
        this.audio.currentTime = this.audio.duration * percent;
    }
}

// Инициализация мини-плеера для статей
document.addEventListener('DOMContentLoaded', () => {
    const miniPlayerContainer = document.getElementById('miniPlayer');
    if (!miniPlayerContainer) return;
    
    const tracksData = miniPlayerContainer.getAttribute('data-tracks');
    const mainPlayerLink = miniPlayerContainer.getAttribute('data-main-link') || '../../ru/';
    
    if (!tracksData) return;
    
    try {
        const tracks = JSON.parse(tracksData);
        new MiniPlayer('miniPlayer', tracks, mainPlayerLink);
    } catch (e) {
        console.error('Ошибка парсинга треков:', e);
    }
});


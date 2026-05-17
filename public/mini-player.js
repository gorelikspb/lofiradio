// Мини-плеер для статей блога
const MINI_VOLUME_STORAGE_KEY = 'lofiradio-volume';

class MiniPlayer {
    constructor(options = {}) {
        this.containerId = options.containerId || 'miniPlayer';
        this.container = document.getElementById(this.containerId);
        this.tracks = options.tracks || [];
        this.playlistUrl = options.playlistUrl || '../../playlist.json';
        this.filterCategory = options.filterCategory || null;
        this.mainPlayerLink = options.mainPlayerLink || null;
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.audio = null;
        this.volumeBeforeMute = 0.75;
        this.isVolumeMuted = false;
        
        // Legacy support: old constructor signature
        if (typeof options === 'string' && arguments.length >= 2) {
            this.containerId = options;
            this.tracks = arguments[1] || [];
            this.mainPlayerLink = arguments[2] || null;
        }
        
        if (this.tracks.length === 0 && this.playlistUrl) {
            this.loadPlaylist();
        } else {
            this.init();
        }
    }
    
    async loadPlaylist() {
        try {
            const response = await fetch(this.playlistUrl);
            const data = await response.json();
            let tracks = data.tracks || [];
            
            // Filter by category if specified
            if (this.filterCategory) {
                tracks = tracks.filter(track => track.category === this.filterCategory);
            }
            
            if (tracks.length === 0) {
                console.warn('No tracks found for category:', this.filterCategory);
                // Fallback to all tracks if filter returns empty
                const allData = await fetch(this.playlistUrl).then(r => r.json());
                tracks = allData.tracks || [];
            }
            
            this.tracks = tracks;
            this.init();
        } catch (error) {
            console.error('Error loading playlist:', error);
        }
    }
    
    getLanguage() {
        const path = window.location.pathname;
        if (path.includes('/en/')) return 'en';
        return 'ru';
    }

    getVolumeTexts() {
        const lang = this.getLanguage();
        if (typeof translations !== 'undefined' && translations[lang]?.volume) {
            return translations[lang].volume;
        }
        return lang === 'en'
            ? { label: 'Volume', mute: 'Mute', unmute: 'Unmute' }
            : { label: 'Громкость', mute: 'Выключить звук', unmute: 'Включить звук' };
    }

    getStoredVolume() {
        const stored = localStorage.getItem(MINI_VOLUME_STORAGE_KEY);
        if (stored === null) return 0.75;
        const value = parseFloat(stored);
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.75;
    }

    updateVolumeIcon(volume) {
        const muteBtn = this.container?.querySelector('#miniMuteBtn');
        if (!muteBtn) return;

        const iconHigh = muteBtn.querySelector('.mini-volume-icon-high');
        const iconLow = muteBtn.querySelector('.mini-volume-icon-low');
        const iconMute = muteBtn.querySelector('.mini-volume-icon-mute');
        if (!iconHigh || !iconLow || !iconMute) return;

        iconHigh.style.display = 'none';
        iconLow.style.display = 'none';
        iconMute.style.display = 'none';

        if (volume === 0 || this.isVolumeMuted) {
            iconMute.style.display = 'block';
        } else if (volume < 0.35) {
            iconLow.style.display = 'block';
        } else {
            iconHigh.style.display = 'block';
        }
    }

    applyVolume(volume, save = true) {
        const clamped = Math.max(0, Math.min(1, volume));
        this.isVolumeMuted = clamped === 0;

        if (this.audio) {
            this.audio.volume = clamped;
        }

        const slider = this.container?.querySelector('#miniVolumeSlider');
        if (slider) {
            slider.value = Math.round(clamped * 100);
        }

        if (clamped > 0) {
            this.volumeBeforeMute = clamped;
        }

        this.updateVolumeIcon(clamped);

        const texts = this.getVolumeTexts();
        const muteBtn = this.container?.querySelector('#miniMuteBtn');
        if (muteBtn) {
            muteBtn.setAttribute(
                'aria-label',
                this.isVolumeMuted ? texts.unmute : texts.mute
            );
        }

        if (save) {
            localStorage.setItem(MINI_VOLUME_STORAGE_KEY, String(clamped));
        }
    }

    toggleMute() {
        if (this.isVolumeMuted || (this.audio && this.audio.volume === 0)) {
            this.applyVolume(this.volumeBeforeMute > 0 ? this.volumeBeforeMute : 0.75);
        } else {
            this.volumeBeforeMute = this.audio ? this.audio.volume : this.volumeBeforeMute;
            this.applyVolume(0);
        }
    }
    
    init() {
        if (!this.container) return;
        
        this.createPlayerHTML();
        this.setupAudio();
        this.setupEventListeners();
    }
    
    createPlayerHTML() {
        if (!this.container || this.tracks.length === 0) return;
        
        const currentTrack = this.tracks[this.currentTrackIndex];
        const cleanTitle = currentTrack.title.replace(/\s+\d+$/, '').trim();
        
        const lang = this.getLanguage();
        const mainLink = this.mainPlayerLink || (lang === 'en' ? '../../en/' : '../../ru/');
        const linkText = lang === 'ru' ? 'Полный плеер →' : 'Full player →';
        const volumeTexts = this.getVolumeTexts();
        
        // Get title from container if it exists, otherwise use default
        const existingTitle = this.container.querySelector('.mini-player-title');
        const titleText = existingTitle ? existingTitle.textContent : (lang === 'ru' ? '🎵 Слушайте пока читаете' : '🎵 Listen while reading');
        
        this.container.innerHTML = `
            <div class="mini-player-header">
                <span class="mini-player-title">${titleText}</span>
                <a href="${mainLink}" class="mini-player-link">${linkText}</a>
            </div>
            <div class="mini-player-controls">
                <button class="mini-play-btn" id="miniPlayBtn">▶</button>
                <div class="mini-track-info">
                    <div class="mini-track-title" id="miniTrackTitle">${cleanTitle}</div>
                    <div class="mini-progress-bar">
                        <div class="mini-progress" id="miniProgress"></div>
                    </div>
                    <div class="mini-time">
                        <span id="miniCurrentTime">0:00</span> / <span id="miniDuration">0:00</span>
                    </div>
                </div>
            </div>
            <div class="mini-volume-control">
                <button type="button" class="mini-volume-btn" id="miniMuteBtn" aria-label="${volumeTexts.mute}">
                    <svg class="mini-volume-icon-high" viewBox="0 0 24 24" aria-hidden="true">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-linecap="round"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-linecap="round"/>
                    </svg>
                    <svg class="mini-volume-icon-low" viewBox="0 0 24 24" aria-hidden="true" style="display: none;">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-linecap="round"/>
                    </svg>
                    <svg class="mini-volume-icon-mute" viewBox="0 0 24 24" aria-hidden="true" style="display: none;">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-linecap="round"/>
                        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-linecap="round"/>
                    </svg>
                </button>
                <input type="range" id="miniVolumeSlider" class="mini-volume-slider" min="0" max="100" value="75"
                    aria-label="${volumeTexts.label}" aria-valuemin="0" aria-valuemax="100">
            </div>
        `;
    }
    
    setupAudio() {
        if (!this.audio) {
            this.audio = new Audio();
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
        
        const currentTrack = this.tracks[this.currentTrackIndex];
        if (!currentTrack) return;
        
        const trackPath = currentTrack.file.startsWith('assets/') 
            ? `../../${currentTrack.file}` 
            : currentTrack.file;
        
        this.audio.src = trackPath;
        this.audio.load();
        this.applyVolume(this.getStoredVolume(), false);
    }
    
    setupEventListeners() {
        const playBtn = this.container.querySelector('#miniPlayBtn');
        const progressBar = this.container.querySelector('.mini-progress-bar');
        const volumeSlider = this.container.querySelector('#miniVolumeSlider');
        const muteBtn = this.container.querySelector('#miniMuteBtn');
        
        playBtn.addEventListener('click', () => {
            this.togglePlay();
        });
        
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.seek(percent);
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', () => {
                this.applyVolume(volumeSlider.value / 100);
            });
        }

        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        this.applyVolume(this.getStoredVolume(), false);
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
        if (!this.container || this.tracks.length === 0) return;
        
        const currentTrack = this.tracks[this.currentTrackIndex];
        if (!currentTrack) return;
        
        const cleanTitle = currentTrack.title.replace(/\s+\d+$/, '').trim();
        const titleEl = this.container.querySelector('#miniTrackTitle');
        if (titleEl) {
            titleEl.textContent = cleanTitle;
        }
        
        this.setupAudio();
    }
    
    updatePlayButton() {
        if (!this.container) return;
        const playBtn = this.container.querySelector('#miniPlayBtn');
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸' : '▶';
        }
    }
    
    updateProgress() {
        if (!this.audio || !this.container) return;
        
        const percent = this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0;
        const progressEl = this.container.querySelector('#miniProgress');
        if (progressEl) {
            progressEl.style.width = percent + '%';
        }
        this.updateCurrentTime();
    }
    
    updateCurrentTime() {
        if (!this.audio || !this.container) return;
        
        const currentTime = Math.floor(this.audio.currentTime || 0);
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        const timeEl = this.container.querySelector('#miniCurrentTime');
        if (timeEl) {
            timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    updateDuration() {
        if (!this.audio || !this.audio.duration || !this.container) return;
        
        const duration = Math.floor(this.audio.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationEl = this.container.querySelector('#miniDuration');
        if (durationEl) {
            durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    seek(percent) {
        if (!this.audio || !this.audio.duration) return;
        
        this.audio.currentTime = this.audio.duration * percent;
    }
}

// Инициализация мини-плеера для статей (legacy support)
document.addEventListener('DOMContentLoaded', () => {
    const miniPlayerContainer = document.getElementById('miniPlayer');
    if (!miniPlayerContainer) return;
    
    // Check if already initialized via new method
    if (window.miniPlayerInstance) return;
    
    // Legacy: support for data-tracks attribute
    const tracksData = miniPlayerContainer.getAttribute('data-tracks');
    const mainPlayerLink = miniPlayerContainer.getAttribute('data-main-link');
    const playlistUrl = miniPlayerContainer.getAttribute('data-playlist-url');
    const filterCategory = miniPlayerContainer.getAttribute('data-filter-category');
    
    if (tracksData) {
        try {
            const tracks = JSON.parse(tracksData);
            window.miniPlayerInstance = new MiniPlayer({
                containerId: 'miniPlayer',
                tracks: tracks,
                mainPlayerLink: mainPlayerLink
            });
        } catch (e) {
            console.error('Ошибка парсинга треков:', e);
        }
    } else if (playlistUrl || filterCategory) {
        // New method: load from playlist.json with optional filter
        window.miniPlayerInstance = new MiniPlayer({
            containerId: 'miniPlayer',
            playlistUrl: playlistUrl || '../../playlist.json',
            filterCategory: filterCategory,
            mainPlayerLink: mainPlayerLink
        });
    }
});


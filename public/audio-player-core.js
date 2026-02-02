// Общий модуль для работы с аудио плеером
class AudioPlayerCore {
    constructor(options = {}) {
        this.audio = null;
        this.tracks = options.tracks || [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isShuffle = options.shuffle || false;
        this.isRepeat = options.repeat || true;
        this.shuffledPlaylist = [];
        this.onTrackChange = options.onTrackChange || null;
        this.onPlayStateChange = options.onPlayStateChange || null;
        this.onTimeUpdate = options.onTimeUpdate || null;
        this.onProgressUpdate = options.onProgressUpdate || null;
        
        if (this.tracks.length > 0) {
            this.preparePlaylist();
        }
    }
    
    preparePlaylist() {
        if (this.isShuffle) {
            this.shuffledPlaylist = [...this.tracks].sort(() => Math.random() - 0.5);
        } else {
            this.shuffledPlaylist = [...this.tracks];
        }
    }
    
    loadTrack(index) {
        if (index < 0 || index >= this.shuffledPlaylist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.shuffledPlaylist[index];
        
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        
        const trackPath = track.file.startsWith('assets/') 
            ? (track.file.startsWith('../') ? track.file : `../${track.file}`)
            : track.file;
        
        this.audio = new Audio(trackPath);
        this.audio.preload = 'metadata';
        
        this.setupAudioEvents();
        
        if (this.onTrackChange) {
            this.onTrackChange(track, index);
        }
        
        return track;
    }
    
    setupAudioEvents() {
        if (!this.audio) return;
        
        this.audio.addEventListener('loadedmetadata', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate({
                    current: 0,
                    duration: this.audio.duration
                });
            }
        });
        
        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate({
                    current: this.audio.currentTime,
                    duration: this.audio.duration
                });
            }
            
            if (this.onProgressUpdate) {
                const percent = this.audio.duration 
                    ? (this.audio.currentTime / this.audio.duration) * 100 
                    : 0;
                this.onProgressUpdate(percent);
            }
        });
        
        this.audio.addEventListener('ended', () => {
            this.playNext();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
        });
    }
    
    play() {
        if (!this.audio) {
            if (this.shuffledPlaylist.length > 0) {
                this.loadTrack(0);
            } else {
                return Promise.reject(new Error('No tracks available'));
            }
        }
        
        return this.audio.play().then(() => {
            this.isPlaying = true;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(true);
            }
        }).catch(err => {
            console.error('Play error:', err);
            throw err;
        });
    }
    
    pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        }
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            return this.play();
        }
    }
    
    playNext() {
        if (this.shuffledPlaylist.length === 0) return;
        
        let nextIndex = this.currentTrackIndex + 1;
        
        if (nextIndex >= this.shuffledPlaylist.length) {
            if (this.isRepeat) {
                nextIndex = 0;
                if (this.isShuffle) {
                    this.preparePlaylist();
                }
            } else {
                this.pause();
                return;
            }
        }
        
        this.loadTrack(nextIndex);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    playPrev() {
        if (this.shuffledPlaylist.length === 0) return;
        
        let prevIndex = this.currentTrackIndex - 1;
        
        if (prevIndex < 0) {
            if (this.isRepeat) {
                prevIndex = this.shuffledPlaylist.length - 1;
            } else {
                return;
            }
        }
        
        this.loadTrack(prevIndex);
        if (this.isPlaying) {
            this.play();
        }
    }
    
    seek(percent) {
        if (!this.audio || !this.audio.duration) return;
        this.audio.currentTime = this.audio.duration * percent;
    }
    
    setVolume(volume) {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    getCurrentTrack() {
        if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.shuffledPlaylist.length) {
            return this.shuffledPlaylist[this.currentTrackIndex];
        }
        return null;
    }
    
    getCurrentTime() {
        return this.audio ? this.audio.currentTime : 0;
    }
    
    getDuration() {
        return this.audio ? this.audio.duration : 0;
    }
    
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    cleanTrackTitle(title) {
        if (!title) return title;
        return title.replace(/\s+\d+$/, '').trim();
    }
}







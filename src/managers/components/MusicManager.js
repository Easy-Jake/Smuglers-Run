export class MusicManager {
  constructor() {
    this.music = null;
    this.musicVolume = 0.3;
    this.isMuted = false;
    this.eventSystem = null;
  }

  /**
   * Set the event system for emitting music events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {MusicManager} This manager for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('MusicManager: Invalid event system provided');
      return this;
    }
    this.eventSystem = eventSystem;
    return this;
  }

  async loadMusic() {
    return new Promise((resolve, reject) => {
      try {
        this.music = new Audio();
        this.music.src = './sounds/background.mp3';
        this.music.loop = true;
        this.music.volume = this.musicVolume;

        this.music.addEventListener(
          'canplaythrough',
          () => {
            console.log('Music loaded and ready to play');
            
            // Emit music loaded event if event system is available
            if (this.eventSystem) {
              this.eventSystem.emit('audio:loaded', { 
                type: 'music', 
                name: 'background' 
              });
            }
            
            resolve();
          },
          { once: true }
        );

        this.music.addEventListener(
          'error',
          e => {
            // Emit music error event if event system is available
            if (this.eventSystem) {
              this.eventSystem.emit('audio:error', { 
                type: 'music', 
                name: 'background',
                error: e
              });
            }
            
            reject(new Error(`Failed to load music: ${e.target.error.message}`));
          },
          { once: true }
        );

        this.music.load();
      } catch (error) {
        // Emit music error event if event system is available
        if (this.eventSystem) {
          this.eventSystem.emit('audio:error', { 
            type: 'music', 
            name: 'background',
            error: error
          });
        }
        
        reject(error);
      }
    });
  }

  async play() {
    if (this.isMuted || !this.music) {
      console.log('Music blocked - Muted:', this.isMuted, 'Music exists:', !!this.music);
      return;
    }

    try {
      this.music.volume = 0;
      await this.music.play();
      console.log('Music playback started successfully');
      this.fadeIn(this.music, this.musicVolume, 2000);
    } catch (error) {
      console.error('Failed to play background music:', error);
      this.music.load();
    }
  }

  stop() {
    if (!this.music) return;

    this.fadeOut(this.music, 1000).then(() => {
      this.music.pause();
      this.music.currentTime = 0;
    });
  }

  fadeIn(audio, targetVolume, duration) {
    console.log('Starting fade in...');
    const steps = 20;
    const volumeStep = targetVolume / steps;
    const stepTime = duration / steps;

    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(targetVolume, volumeStep * currentStep);
      console.log('Fade step:', currentStep, 'Volume:', audio.volume);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        console.log('Fade in complete');
      }
    }, stepTime);
  }

  fadeOut(audio, duration) {
    return new Promise(resolve => {
      const startVolume = audio.volume;
      const steps = 20;
      const volumeStep = startVolume / steps;
      const stepTime = duration / steps;

      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(0, startVolume - volumeStep * currentStep);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, stepTime);
    });
  }

  setVolume(volume) {
    this.musicVolume = volume;
    if (this.music) {
      this.music.volume = volume * 0.6; // Music slightly quieter than effects
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    } else {
      this.play();
    }
  }

  dispose() {
    if (this.music) {
      this.music.pause();
      this.music.src = '';
      this.music = null;
    }
  }
} 
export class SoundEffectManager {
  constructor() {
    this.sounds = new Map();
    this.sfxVolume = 0.3;
    this.isMuted = false;
    this.eventSystem = null;
  }

  /**
   * Set the event system for emitting sound events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {SoundEffectManager} This manager for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('SoundEffectManager: Invalid event system provided');
      return this;
    }
    this.eventSystem = eventSystem;
    return this;
  }

  loadSoundEffect(name) {
    try {
      const audio = new Audio();
      audio.src = `./sounds/${name}.wav`;
      audio.preload = 'auto';

      this.sounds.set(name, audio);

      audio.addEventListener('error', e => {
        console.warn(
          `Sound file ${name}.wav not found. Game will continue without this sound effect.`
        );
        this.sounds.delete(name);
        
        // Emit sound loading error event if event system is available
        if (this.eventSystem) {
          this.eventSystem.emit('audio:error', { 
            type: 'sfx', 
            name: name, 
            error: e 
          });
        }
      });

      audio.load();
    } catch (error) {
      console.warn(`Error creating sound ${name}:`, error);
      
      // Emit sound loading error event if event system is available
      if (this.eventSystem) {
        this.eventSystem.emit('audio:error', { 
          type: 'sfx', 
          name: name, 
          error: error 
        });
      }
    }
  }

  async play(soundName, minInterval = 50) {
    if (this.isMuted || !this.sounds.has(soundName)) {
      return;
    }

    const sound = this.sounds.get(soundName);
    const now = Date.now();

    if (now - sound.lastPlayed < minInterval) return;

    try {
      const audioElement = sound.cloneNode();
      audioElement.volume = this.sfxVolume;
      await audioElement.play();
      sound.lastPlayed = now;
    } catch (error) {
      // Silently fail if sound playback fails
    }
  }

  setVolume(volume) {
    this.sfxVolume = volume;
    this.sounds.forEach(sound => {
      sound.volume = volume;
    });
  }

  setMuted(muted) {
    this.isMuted = muted;
  }

  dispose() {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.src = '';
    });
    this.sounds.clear();
  }
} 
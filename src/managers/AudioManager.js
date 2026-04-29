import { SoundEffectManager } from './components/SoundEffectManager.js';
import { MusicManager } from './components/MusicManager.js';

/**
 * Manages all audio in the game
 */
export class AudioManager {
  /**
   * Create a new AudioManager
   */
  constructor() {
    this.soundEffectManager = new SoundEffectManager();
    this.musicManager = new MusicManager();
    this.eventSystem = null;
    this.configManager = null;
    this.initialized = false;
  }

  /**
   * Set the event system for audio events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {AudioManager} This manager for chaining
   */
  setEventSystem(eventSystem) {
    this.eventSystem = eventSystem;
    this.soundEffectManager.setEventSystem(eventSystem);
    this.musicManager.setEventSystem(eventSystem);
    return this;
  }

  /**
   * Set the config manager for audio configuration
   * @param {ConfigManager} configManager - The config manager to use
   * @returns {AudioManager} This manager for chaining
   */
  setConfigManager(configManager) {
    this.configManager = configManager;
    return this;
  }

  /**
   * Initialize the audio manager
   * @returns {Promise<boolean>} Promise that resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Load audio configuration from ConfigManager
      if (this.configManager) {
        const soundVolume = this.configManager.get('audio.sfxVolume', 0.7);
        const musicVolume = this.configManager.get('audio.musicVolume', 0.5);
        
        this.soundEffectManager.setVolume(soundVolume);
        this.musicManager.setVolume(musicVolume);
      }
      
      // Initialize components
      await this.soundEffectManager.initialize();
      await this.musicManager.initialize();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
      throw error;
    }
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play
   * @param {Object} options - Options for playing the sound
   * @returns {boolean} Whether the sound was played successfully
   */
  play(soundName, options = {}) {
    return this.soundEffectManager.play(soundName, options);
  }

  /**
   * Play music
   * @param {string} musicName - Name of the music to play
   * @param {Object} options - Options for playing the music
   * @returns {boolean} Whether the music was played successfully
   */
  playMusic(musicName, options = {}) {
    return this.musicManager.play(musicName, options);
  }

  /**
   * Stop music
   * @param {string} musicName - Name of the music to stop (optional)
   */
  stopMusic(musicName) {
    this.musicManager.stop(musicName);
  }

  /**
   * Set the sound effect volume
   * @param {number} volume - Volume level (0-1)
   */
  setSFXVolume(volume) {
    this.soundEffectManager.setVolume(volume);
    
    // Update config if available
    if (this.configManager) {
      this.configManager.override('audio.sfxVolume', volume);
    }
  }

  /**
   * Set the music volume
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.musicManager.setVolume(volume);
    
    // Update config if available
    if (this.configManager) {
      this.configManager.override('audio.musicVolume', volume);
    }
  }

  /**
   * Toggle mute state for all audio
   * @returns {boolean} New mute state
   */
  toggleMute() {
    const currentMuteState = this.soundEffectManager.isMuted();
    const newMuteState = !currentMuteState;
    
    this.soundEffectManager.setMuted(newMuteState);
    this.musicManager.setMuted(newMuteState);
    
    return newMuteState;
  }

  /**
   * Dispose of audio resources
   */
  dispose() {
    this.soundEffectManager.dispose();
    this.musicManager.dispose();
    this.initialized = false;
  }
}

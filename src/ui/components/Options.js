export class Options {
  constructor() {
    this.screen = document.getElementById('optionsScreen');
    this.musicVolumeSlider = this.screen.querySelector('.music-volume-slider');
    this.sfxVolumeSlider = this.screen.querySelector('.sfx-volume-slider');
    this.difficultySelect = this.screen.querySelector('.difficulty-select');
    this.backButton = this.screen.querySelector('.back-button');
  }

  update(gameState) {
    // Update sliders with current values
    this.musicVolumeSlider.value = gameState.settings.musicVolume * 100;
    this.sfxVolumeSlider.value = gameState.settings.sfxVolume * 100;
    this.difficultySelect.value = gameState.settings.difficulty;
  }

  render() {
    // Options screen is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
  }

  hide() {
    this.screen.style.display = 'none';
  }

  addEventListeners(onBack, onSettingsChange) {
    // Music volume change
    this.musicVolumeSlider.addEventListener('input', e => {
      const volume = e.target.value / 100;
      onSettingsChange('musicVolume', volume);
    });

    // SFX volume change
    this.sfxVolumeSlider.addEventListener('input', e => {
      const volume = e.target.value / 100;
      onSettingsChange('sfxVolume', volume);
    });

    // Difficulty change
    this.difficultySelect.addEventListener('change', e => {
      onSettingsChange('difficulty', e.target.value);
    });

    // Back button
    this.backButton.addEventListener('click', () => {
      this.hide();
      onBack();
    });
  }
}

export class MainMenu {
  constructor() {
    this.screen = document.getElementById('mainMenuScreen');
    this.startButton = this.screen.querySelector('.start-button');
    this.optionsButton = this.screen.querySelector('.options-button');
    this.creditsButton = this.screen.querySelector('.credits-button');
    this.highScoreDisplay = this.screen.querySelector('.high-score-display');
  }

  update(gameState) {
    // Update high score display
    this.highScoreDisplay.textContent = `High Score: ${gameState.highScore}`;
  }

  render() {
    // Main menu is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
  }

  hide() {
    this.screen.style.display = 'none';
  }

  addEventListeners(onStart, onOptions, onCredits) {
    this.startButton.addEventListener('click', () => {
      this.hide();
      onStart();
    });

    this.optionsButton.addEventListener('click', () => {
      this.hide();
      onOptions();
    });

    this.creditsButton.addEventListener('click', () => {
      this.hide();
      onCredits();
    });
  }
}

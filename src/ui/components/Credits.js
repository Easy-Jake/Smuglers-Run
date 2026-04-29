export class Credits {
  constructor() {
    this.screen = document.getElementById('creditsScreen');
    this.backButton = this.screen.querySelector('.back-button');
    this.creditsContent = this.screen.querySelector('.credits-content');
  }

  update() {
    // Update credits content
    this.creditsContent.innerHTML = `
            <h2>Credits</h2>
            <div class="credits-section">
                <h3>Development Team</h3>
                <p>Game Design: Jake Anderton</p>
                <p>Programming: Jake Anderton</p>
                <p>Art: Jake Anderton</p>
                <p>Sound Design: Jake Anderton</p>
            </div>
            <div class="credits-section">
                <h3>Special Thanks</h3>
                <p>Thanks to all the playtesters who helped improve the game!</p>
                <p>Built with JavaScript and HTML5 Canvas</p>
            </div>
            <div class="credits-section">
                <h3>Version</h3>
                <p>Smuggler's Run v1.0.0</p>
            </div>
        `;
  }

  render() {
    // Credits screen is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
  }

  hide() {
    this.screen.style.display = 'none';
  }

  addEventListeners(onBack) {
    this.backButton.addEventListener('click', () => {
      this.hide();
      onBack();
    });
  }
}

export class LoadingScreen {
  constructor() {
    this.screen = document.getElementById('loadingScreen');
    this.progressBar = this.screen.querySelector('.progress-bar');
    this.statusText = this.screen.querySelector('.status-text');
    this.loadedAssets = 0;
    this.totalAssets = 0;
  }

  update(loaded, total) {
    this.loadedAssets = loaded;
    this.totalAssets = total;

    // Calculate progress percentage
    const progress = (loaded / total) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.statusText.textContent = `Loading... ${Math.round(progress)}%`;
  }

  render() {
    // Loading screen is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
    this.loadedAssets = 0;
    this.totalAssets = 0;
    this.update(0, 0);
  }

  hide() {
    this.screen.style.display = 'none';
  }

  setStatus(message) {
    this.statusText.textContent = message;
  }

  isComplete() {
    return this.loadedAssets >= this.totalAssets;
  }
}

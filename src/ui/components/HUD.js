export class HUD {
  constructor() {
    this.scoreElement = document.getElementById('score');
    this.healthElement = document.getElementById('health');
    this.fuelElement = document.getElementById('fuel');
    this.cargoElement = document.getElementById('cargo');
    this.creditsElement = document.getElementById('credits');
  }

  update(gameState) {
    if (gameState.gameOver) return;

    // Update score
    this.scoreElement.textContent = `Score: ${gameState.score}`;

    // Update health bar
    const healthPercent = (gameState.player.health / gameState.player.maxHealth) * 100;
    this.healthElement.style.width = `${healthPercent}%`;
    this.healthElement.textContent = `${gameState.player.health}/${gameState.player.maxHealth}`;

    // Update fuel bar
    const fuelPercent = (gameState.player.fuel / gameState.player.maxFuel) * 100;
    this.fuelElement.style.width = `${fuelPercent}%`;
    this.fuelElement.textContent = `${gameState.player.fuel}/${gameState.player.maxFuel}`;

    // Update cargo info
    this.cargoElement.textContent = `Cargo: ${gameState.player.cargoHold}/${gameState.player.maxCargoHold}`;

    // Update credits
    this.creditsElement.textContent = `Credits: ${gameState.credits}`;
  }

  render() {
    // HUD is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    // HUD is always visible during gameplay
  }

  hide() {
    // HUD is always visible during gameplay
  }
}

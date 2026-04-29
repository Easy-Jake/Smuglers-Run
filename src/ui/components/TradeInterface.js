export class TradeInterface {
  constructor() {
    this.screen = document.getElementById('loadScreen');
    this.header = this.screen.querySelector('h2');
    this.tradeInfo = this.screen.querySelector('.trade-info');
    this.tradeSections = this.screen.querySelector('.trade-sections-container');
    this.exitButton = document.getElementById('exitUpgrade');
  }

  update(gameState) {
    if (!gameState.tradingActive || !gameState.currentStation) return;

    // Set header based on station type
    this.header.textContent = gameState.currentStation.type.toUpperCase();

    // Show player info
    this.tradeInfo.innerHTML = `
            <div>Credits: ${gameState.credits}</div>
            <div>Cargo: ${gameState.player.cargoHold}/${gameState.player.maxCargoHold}</div>
            <div>Cargo Value: ${gameState.player.cargoValue}</div>
        `;

    // Clear previous sections
    this.tradeSections.innerHTML = '';

    // Add trade goods section if this is a trading station
    if (gameState.currentStation.type === 'trading' && gameState.currentStation.items.length > 0) {
      this.addTradeSection(gameState);
    }

    // Add services section
    if (gameState.currentStation.services.length > 0) {
      this.addServicesSection(gameState);
    }
  }

  addTradeSection(gameState) {
    const tradeSection = document.createElement('div');
    tradeSection.className = 'trade-section';
    tradeSection.innerHTML = `
            <h3>AVAILABLE GOODS</h3>
            <div class="trade-items"></div>
        `;

    const tradeItems = tradeSection.querySelector('.trade-items');

    // Add each trade item
    gameState.currentStation.items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'trade-item';
      itemElement.innerHTML = `
                <span>${item.name}</span>
                <div class="trade-buttons">
                    <button class="buy-button" data-item="${item.name}" data-price="${item.buyPrice}">
                        BUY (${item.buyPrice})
                    </button>
                    <button class="sell-button" data-item="${item.name}" data-price="${item.sellPrice}">
                        SELL (${item.sellPrice})
                    </button>
                </div>
            `;

      // Add event listeners
      const buyButton = itemElement.querySelector('.buy-button');
      buyButton.addEventListener('click', () => this.handleBuy(item, gameState));

      const sellButton = itemElement.querySelector('.sell-button');
      sellButton.addEventListener('click', () => this.handleSell(item, gameState));

      tradeItems.appendChild(itemElement);
    });

    // Add sell all cargo button
    const sellAllButton = document.createElement('button');
    sellAllButton.className = 'trade-button sell-all-button';
    sellAllButton.textContent = `SELL ALL CARGO (${gameState.player.cargoValue})`;
    sellAllButton.addEventListener('click', () => this.handleSellAll(gameState));

    tradeSection.appendChild(sellAllButton);
    this.tradeSections.appendChild(tradeSection);
  }

  addServicesSection(gameState) {
    const servicesSection = document.createElement('div');
    servicesSection.className = 'trade-section';
    servicesSection.innerHTML = `
            <h3>SERVICES</h3>
            <div class="service-items"></div>
        `;

    const serviceItems = servicesSection.querySelector('.service-items');

    gameState.currentStation.services.forEach(service => {
      const serviceElement = document.createElement('div');
      serviceElement.className = 'service-item';
      serviceElement.innerHTML = `
                <span>${service.name} (${service.price})</span>
                <button class="service-button" 
                        data-effect="${service.effect}" 
                        data-amount="${service.amount}" 
                        data-price="${service.price}">
                    PURCHASE
                </button>
            `;

      const button = serviceElement.querySelector('.service-button');
      button.addEventListener('click', () => this.handleService(service, gameState));

      serviceItems.appendChild(serviceElement);
    });

    this.tradeSections.appendChild(servicesSection);
  }

  handleBuy(item, gameState) {
    if (
      gameState.credits >= item.buyPrice &&
      gameState.player.cargoHold < gameState.player.maxCargoHold
    ) {
      gameState.credits -= item.buyPrice;
      gameState.player.cargoHold++;
      gameState.player.cargoValue += item.buyPrice * 0.8;
      this.update(gameState);
    }
  }

  handleSell(item, gameState) {
    if (gameState.player.cargoHold > 0) {
      gameState.credits += item.sellPrice;
      gameState.player.cargoHold--;
      gameState.player.cargoValue = Math.max(0, gameState.player.cargoValue - item.sellPrice);
      this.update(gameState);
    }
  }

  handleSellAll(gameState) {
    if (gameState.player.cargoHold > 0) {
      gameState.credits += gameState.player.cargoValue;
      gameState.player.cargoHold = 0;
      gameState.player.cargoValue = 0;
      this.update(gameState);
    }
  }

  handleService(service, gameState) {
    if (gameState.credits >= service.price) {
      gameState.credits -= service.price;

      // Apply effect
      switch (service.effect) {
        case 'health':
          gameState.player.health = Math.min(
            gameState.player.maxHealth,
            gameState.player.health + service.amount
          );
          break;
        case 'fuel':
          gameState.player.fuel = Math.min(
            gameState.player.maxFuel,
            gameState.player.fuel + service.amount
          );
          break;
        case 'maxCargoHold':
          gameState.player.maxCargoHold += service.amount;
          break;
        case 'maxSpeed':
          gameState.player.maxSpeed += service.amount;
          break;
        case 'weaponPower':
          gameState.player.weaponPower += service.amount;
          break;
      }

      this.update(gameState);
    }
  }

  render() {
    // Trade interface is rendered using DOM elements, no canvas rendering needed
  }

  show() {
    this.screen.style.display = 'block';
  }

  hide() {
    this.screen.style.display = 'none';
  }
}

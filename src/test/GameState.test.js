import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../core/GameState';

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  it('should initialize with default values', () => {
    expect(gameState.score).toBe(0);
    expect(gameState.health).toBe(100);
    expect(gameState.fuel).toBe(100);
    expect(gameState.cargo).toBe(0);
    expect(gameState.credits).toBe(1000);
  });

  it('should update score correctly', () => {
    gameState.updateScore(100);
    expect(gameState.score).toBe(100);
  });

  it('should update health correctly', () => {
    gameState.updateHealth(-20);
    expect(gameState.health).toBe(80);
  });

  it('should update fuel correctly', () => {
    gameState.updateFuel(-30);
    expect(gameState.fuel).toBe(70);
  });

  it('should update cargo correctly', () => {
    gameState.updateCargo(50);
    expect(gameState.cargo).toBe(50);
  });

  it('should update credits correctly', () => {
    gameState.updateCredits(500);
    expect(gameState.credits).toBe(1500);
  });

  it('should not allow health to go below 0', () => {
    gameState.updateHealth(-150);
    expect(gameState.health).toBe(0);
  });

  it('should not allow fuel to go below 0', () => {
    gameState.updateFuel(-150);
    expect(gameState.fuel).toBe(0);
  });
});

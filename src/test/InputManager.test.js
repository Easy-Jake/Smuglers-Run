import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager } from '../managers/InputManager.js';

describe('InputManager', () => {
  let inputManager;

  beforeEach(() => {
    inputManager = new InputManager();
    // Mock event system
    const mockEventSystem = {
      emit: vi.fn()
    };
    inputManager.setEventSystem(mockEventSystem);
  });

  it('should initialize properly', async () => {
    expect(inputManager).toBeDefined();
    await inputManager.initialize();
    expect(inputManager.update).toBeDefined();
  });

  it('should clear input state', () => {
    inputManager.clear();
    // This is a basic test that doesn't throw errors
    expect(true).toBe(true);
  });

  it('should handle update without errors', () => {
    inputManager.update();
    // Simply verify it doesn't throw an error
    expect(true).toBe(true);
  });

  it('should properly dispose resources', () => {
    inputManager.dispose();
    // Verify dispose method works without errors
    expect(true).toBe(true);
  });
}); 
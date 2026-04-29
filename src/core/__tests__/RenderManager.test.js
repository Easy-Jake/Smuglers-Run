import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderManager } from '../RenderManager.js';
import { CanvasManager } from '../../managers/CanvasManager.js';

describe('RenderManager', () => {
  let renderManager;
  let mockCanvasManager;

  beforeEach(() => {
    // Create a mock canvas manager that extends CanvasManager
    class MockCanvasManager extends CanvasManager {
      constructor() {
        super();
        this.initialized = true;
        this.context = {
          clearRect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
        };
      }

      initialize() {
        return Promise.resolve();
      }

      isInitialized() {
        return this.initialized;
      }

      getContext() {
        return this.context;
      }

      getWidth() {
        return 800;
      }

      getHeight() {
        return 600;
      }
    }

    mockCanvasManager = new MockCanvasManager();
    renderManager = new RenderManager({
      targetFPS: 60,
      debug: false,
    });
  });

  it('should initialize with required methods', () => {
    expect(renderManager.beginRender).toBeDefined();
    expect(renderManager.endRender).toBeDefined();
    expect(renderManager.setCanvasManager).toBeDefined();
    expect(renderManager.isActive).toBeDefined();
  });

  it('should properly set canvas manager', () => {
    renderManager.setCanvasManager(mockCanvasManager);
    expect(renderManager.getCanvasManager()).toBe(mockCanvasManager);
  });

  it('should handle beginRender and endRender correctly', () => {
    renderManager.setCanvasManager(mockCanvasManager);
    
    const context = renderManager.beginRender();
    expect(context).toBeDefined();
    expect(mockCanvasManager.getContext().clearRect).toHaveBeenCalled();
    expect(mockCanvasManager.getContext().save).toHaveBeenCalled();

    renderManager.endRender();
    expect(mockCanvasManager.getContext().restore).toHaveBeenCalled();
  });

  it('should handle missing canvas manager gracefully', () => {
    const context = renderManager.beginRender();
    expect(context).toBeNull();
    
    renderManager.endRender();
    // Should not throw error
  });
}); 
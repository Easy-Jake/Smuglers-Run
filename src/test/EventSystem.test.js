import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventSystem } from '../ecs/systems/EventSystem.js';

describe('EventSystem', () => {
  let eventSystem;
  
  beforeEach(() => {
    eventSystem = new EventSystem();
  });
  
  it('should register an event handler', () => {
    const handler = vi.fn();
    const eventType = 'test:event';
    
    eventSystem.on(eventType, handler);
    
    // Trigger the event
    eventSystem.emit(eventType, { test: true });
    
    // Verify handler was called at least once and contains the expected data
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toHaveProperty('detail');
    expect(handler.mock.calls[0][0].detail).toEqual({ test: true });
  });
  
  it('should unregister an event handler', () => {
    const handler = vi.fn();
    const eventType = 'test:event';
    
    // Register handler
    eventSystem.on(eventType, handler);
    
    // Unregister handler
    eventSystem.off(eventType, handler);
    
    // Trigger event
    eventSystem.emit(eventType, { test: true });
    
    // Verify handler was not called
    expect(handler).not.toHaveBeenCalled();
  });
  
  it('should allow multiple handlers for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const eventType = 'test:event';
    
    // Register handlers
    eventSystem.on(eventType, handler1);
    eventSystem.on(eventType, handler2);
    
    // Trigger event
    eventSystem.emit(eventType, { test: true });
    
    // Verify both handlers were called
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
  
  it('should handle events without handlers gracefully', () => {
    // This should not throw an error
    expect(() => {
      eventSystem.emit('nonexistent:event', { test: true });
    }).not.toThrow();
  });
}); 
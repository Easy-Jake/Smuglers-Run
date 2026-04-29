import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceRegistry } from '../core/ServiceRegistry.js';

describe('ServiceRegistry', () => {
  let serviceRegistry;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
  });

  it('should instantiate successfully', () => {
    expect(serviceRegistry).toBeDefined();
    expect(serviceRegistry.getServiceLocator()).toBeDefined();
  });

  it('should register core services', () => {
    serviceRegistry.registerCoreServices();
    const serviceLocator = serviceRegistry.getServiceLocator();
    
    // Check if core services were registered
    expect(serviceLocator.has('configManager')).toBe(true);
    expect(serviceLocator.has('eventSystem')).toBe(true);
    expect(serviceLocator.has('canvasManager')).toBe(true);
  });

  it('should provide access to registered services', () => {
    serviceRegistry.registerCoreServices();
    
    // Should be able to get a registered service
    const configManager = serviceRegistry.getService('configManager');
    expect(configManager).toBeDefined();
    expect(typeof configManager.get).toBe('function');
  });

  it('should initialize services with dependencies', async () => {
    // Mock service locator methods
    serviceRegistry.getServiceLocator().initializeAll = vi.fn();

    await serviceRegistry.initializeServices();
    
    // Verify that initialization was called
    expect(serviceRegistry.getServiceLocator().initializeAll).toHaveBeenCalled();
  });
}); 
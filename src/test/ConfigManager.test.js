import { describe, it, expect, beforeEach } from 'vitest';
import configManager from '../config/ConfigManager.js';

describe('ConfigManager', () => {
  beforeEach(() => {
    // Clear any overrides between tests
    configManager.clearAllOverrides();
  });

  it('should retrieve config values', () => {
    // Test retrieving a value that exists
    const value = configManager.get('state.historySize');
    expect(value).toBe(50);
  });

  it('should return default value when config path does not exist', () => {
    const defaultValue = 'default';
    const value = configManager.get('nonexistent.path', defaultValue);
    expect(value).toBe(defaultValue);
  });

  it('should handle overrides', () => {
    const testPath = 'test.override.path';
    const testValue = 'test-value';
    
    // Set override
    configManager.override(testPath, testValue);
    
    // Get the value
    const value = configManager.get(testPath);
    expect(value).toBe(testValue);
    
    // Clear the override
    configManager.clearOverride(testPath);
    const clearedValue = configManager.get(testPath, 'default');
    expect(clearedValue).toBe('default');
  });

  it('should clear all overrides', () => {
    // Set multiple overrides
    configManager.override('test.path1', 'value1');
    configManager.override('test.path2', 'value2');
    
    // Verify overrides work
    expect(configManager.get('test.path1')).toBe('value1');
    expect(configManager.get('test.path2')).toBe('value2');
    
    // Clear all overrides
    configManager.clearAllOverrides();
    
    // Verify overrides are cleared
    expect(configManager.get('test.path1', 'default')).toBe('default');
    expect(configManager.get('test.path2', 'default')).toBe('default');
  });
}); 
/**
 * Manages registration and information about supported asset types.
 */
export class AssetTypeRegistry {
  #assetTypes = new Map();

  constructor() {
    this.initializeDefaultTypes();
  }

  /**
   * Initialize supported asset types and their handlers
   */
  initializeDefaultTypes() {
    // Image assets
    this.registerType('image', {
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      load: async url => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      },
    });

    // Audio assets
    this.registerType('audio', {
      extensions: ['.mp3', '.wav', '.ogg', '.webm'],
      load: async url => {
        return new Promise((resolve, reject) => {
          const audio = new Audio();
          audio.oncanplaythrough = () => resolve(audio);
          audio.onerror = reject;
          audio.src = url;
        });
      },
    });

    // JSON assets
    this.registerType('json', {
      extensions: ['.json'],
      load: async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load JSON: ${url}`);
        return response.json();
      },
    });

    // Text assets
    this.registerType('text', {
      extensions: ['.txt', '.md', '.csv'],
      load: async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load text: ${url}`);
        return response.text();
      },
    });
  }

  /**
   * Register a new asset type
   * @param {string} typeName - Type name
   * @param {Object} typeInfo - Type information including extensions and load function
   */
  registerType(typeName, typeInfo) {
    this.#assetTypes.set(typeName, typeInfo);
  }

  /**
   * Get asset type handler
   * @param {string} type - Asset type
   * @returns {Object} Asset type handler
   */
  getTypeHandler(type) {
    const handler = this.#assetTypes.get(type);
    if (!handler) {
      throw new Error(`Unsupported asset type: ${type}`);
    }
    return handler;
  }

  /**
   * Determine asset type from URL based on extension
   * @param {string} url - Asset URL
   * @returns {string} Asset type
   */
  getTypeFromUrl(url) {
    const extension = url.split('.').pop().toLowerCase();
    
    for (const [type, info] of this.#assetTypes) {
      if (info.extensions.includes(`.${extension}`)) {
        return type;
      }
    }
    
    throw new Error(`Unsupported asset type for URL: ${url}`);
  }

  /**
   * Get all registered asset types
   * @returns {Array<string>} List of registered asset types
   */
  getRegisteredTypes() {
    return Array.from(this.#assetTypes.keys());
  }

  /**
   * Check if an asset type is supported
   * @param {string} type - Asset type to check
   * @returns {boolean} Whether the type is supported
   */
  isTypeSupported(type) {
    return this.#assetTypes.has(type);
  }
} 
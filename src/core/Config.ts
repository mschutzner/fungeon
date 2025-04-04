/**
 * Configuration interface
 */
interface ConfigData {
  resolution: {
    width: number;
    height: number;
  };
  tickRate: number;
  maxFPS: number;
  debug: boolean;
  startState: string;
  fonts: {
    [key: string]: {
      url: string;
      charWidth: number;
      charHeight: number;
      leading?: number; // Default leading (line spacing) for this font
      customWidths?: {
        [key: string]: number; // Single character string -> custom width
      };
    };
  };
  // Add more configuration properties as needed
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ConfigData = {
  resolution: {
    width: 224,
    height: 224
  },
  tickRate: 0.1, // 100ms per tick (10 updates per second)
  maxFPS: 60,    // 60 frames per second rendering
  debug: true,
  startState: 'TestState',
  fonts: {
    vga: {
      url: './assets/ascii/vga8x12.png',
      charWidth: 8,
      charHeight: 12
    },
    tiny: {
      url: './assets/ascii/tiny6x6.png',
      charWidth: 6,
      charHeight: 6,
      leading: 1
    },
    medium: {
      url: './assets/ascii/medium6x10.png',
      charWidth: 6,
      charHeight: 10,
      customWidths: {
        " ": 3,
        '!': 3,
        '"': 5,
        "'": 3,
        ',': 3,
        '.': 3,
        ':': 3,
        ';': 4,
      }
    }
  }
};

/**
 * Config class for loading and accessing game configuration
 * Uses singleton pattern for global access
 */
export class Config {
  private static instance: Config;
  private configData: ConfigData;
  private loaded: boolean = false;
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {
    this.configData = { ...DEFAULT_CONFIG };
  }
  
  /**
   * Get the Config instance
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
  
  /**
   * Load configuration from JSON file
   */
  public async loadFromFile(path: string): Promise<void> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load config file: ${response.statusText}`);
      }
      
      const loadedConfig = await response.json();
      this.mergeConfig(loadedConfig);
      this.loaded = true;
      
      console.log('Configuration loaded:', this.configData);
    } catch (error) {
      console.warn(`Error loading config: ${error}. Using default configuration.`);
    }
  }
  
  /**
   * Set configuration programmatically
   */
  public setConfig(config: Partial<ConfigData>): void {
    this.mergeConfig(config);
  }
  
  /**
   * Helper method to merge loaded config with defaults
   */
  private mergeConfig(config: Partial<ConfigData>): void {
    // Deep merge the configuration with defaults
    this.configData = this.deepMerge(this.configData, config);
  }
  
  /**
   * Deep merge helper
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(
              target[key],
              source[key]
            );
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * Check if value is an object
   */
  private isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  
  /**
   * Get the entire configuration
   */
  public get config(): ConfigData {
    return this.configData;
  }
  
  /**
   * Shorthand for getting resolution
   */
  public get resolution(): { width: number; height: number } {
    return this.configData.resolution;
  }
  
  /**
   * Shorthand for getting tick rate
   */
  public get tickRate(): number {
    return this.configData.tickRate;
  }
  
  /**
   * Shorthand for getting max FPS
   */
  public get maxFPS(): number {
    return this.configData.maxFPS;
  }
  
  /**
   * Shorthand for getting debug mode
   */
  public get debug(): boolean {
    return this.configData.debug;
  }
} 
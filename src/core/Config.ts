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
  mobileController?: {
    enabled: boolean;
    colors?: {
      background?: string;
      joystickBase?: string;
      joystickStick?: string;
      buttonA?: string;
      buttonB?: string;
      buttonPlus?: string;
      buttonMinus?: string;
      buttonStart?: string;
      buttonSelect?: string;
      buttonText?: string;
      dPad?: string;
    };
    keyBindings?: {
      [key: string]: string;
    };
  };
  input?: {
    keyBindings: {
      menu: string;
      inventory: string;
      move_up: string;
      move_down: string;
      move_left: string;
      move_right: string;
      d_up: string;
      d_down: string;
      d_left: string;
      d_right: string;
      minus: string;
      plus: string;
      interact: string;
      continue: string;
      [key: string]: string; // Allow for custom bindings
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
  debug: false,
  startState: 'TestState',
  fonts: {
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
  },
  mobileController: {
    enabled: true,
    colors: {
      background: '#b8a07d',
      joystickBase: '#8c7a5b',
      joystickStick: '#655640',
      buttonA: '#77603f',
      buttonB: '#77603f',
      buttonPlus: '#77603f',
      buttonMinus: '#77603f',
      buttonStart: '#77603f',
      buttonSelect: '#77603f',
      buttonText: '#ffffff',
      dPad: '#655640'
    }
  },
  input: {
    keyBindings: {
      menu: 'escape',
      inventory: 'i',
      move_up: 'w',
      move_down: 's',
      move_left: 'a',
      move_right: 'd',
      d_up: 'arrowup',
      d_down: 'arrowdown',
      d_left: 'arrowleft',
      d_right: 'arrowright',
      minus: 'q',
      plus: 'e',
      interact: 'shift',
      continue: ' ' // space
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
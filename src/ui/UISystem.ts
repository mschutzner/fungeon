import { Config } from '../core/Config';
import { UIElement } from './elements/UIElement';

/**
 * Font info interface
 */
export interface FontInfo {
  charWidth: number;
  charHeight: number;
  charsPerRow: number;
  rows: number;
  canvas: HTMLCanvasElement;
  customWidths?: Map<number, number>; // Maps character codes to custom widths
  leading?: number;
}

/**
 * UISystem class for managing and rendering UI elements
 */
export class UISystem {
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number;
  private height: number;
  private rootElements: UIElement[] = [];
  
  // Font assets
  private fontInfo: Map<string, FontInfo> = new Map();
  
  constructor() {
    const config = Config.getInstance();
    this.width = config.resolution.width;
    this.height = config.resolution.height;
  }
  
  /**
   * Initialize the UI system
   * @param ctx The 2D canvas context for UI rendering
   */
  async initialize(ctx: CanvasRenderingContext2D): Promise<void> {
    // Store the context
    this.ctx = ctx;
    
    // Ensure image smoothing is disabled for pixelated look
    this.ctx.imageSmoothingEnabled = false;
    
    // Load fonts
    await this.loadFonts();
    
    console.log('UI system initialized');
  }
  
  /**
   * Load all fonts
   */
  private async loadFonts(): Promise<void> {
    try {
      const config = Config.getInstance();
      
      // Load each font defined in the config
      for (const [name, fontConfig] of Object.entries(config.config.fonts)) {
        await this.loadFont(
          name,
          fontConfig.url,
          fontConfig.charWidth,
          fontConfig.charHeight
        );
      }
      
      console.log('All fonts loaded successfully');
    } catch (error) {
      console.error('Failed to load fonts:', error);
    }
  }
  
  /**
   * Load a specific font
   */
  private async loadFont(name: string, url: string, charWidth: number, charHeight: number): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Loading font from: ${url}`);
      const img = new Image();
      
      img.onload = () => {
        // Calculate font metrics
        const charsPerRow = Math.floor(img.width / charWidth);
        const rows = Math.floor(img.height / charHeight);
        
        // Create offscreen canvas for the font atlas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context for font canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        // Get font config
        const config = Config.getInstance();
        const fontConfig = config.config.fonts[name];
        
        // Create custom widths map if specified
        let customWidths: Map<number, number> | undefined;
        if (fontConfig.customWidths) {
          customWidths = new Map();
          for (const [char, width] of Object.entries(fontConfig.customWidths)) {
            if (char.length !== 1) {
              console.warn(`Invalid custom width key: "${char}". Must be a single character.`);
              continue;
            }
            const charCode = char.charCodeAt(0);
            customWidths.set(charCode, width);
          }
        }
        
        // Store the font info
        this.fontInfo.set(name, {
          charWidth,
          charHeight,
          charsPerRow,
          rows,
          canvas,
          customWidths,
          leading: fontConfig.leading || 0
        });
        
        console.log(`Font ${name} loaded successfully: ${img.width}x${img.height}, ${charWidth}x${charHeight} chars, ${charsPerRow} chars per row, ${rows} rows`);
        resolve();
      };
      
      img.onerror = (err) => {
        console.error(`Failed to load font image: ${url}`, err);
        reject(new Error(`Failed to load font image: ${url}`));
      };
      
      img.src = url;
    });
  }
  
  /**
   * Add a UI element to the root level
   */
  addElement(element: UIElement): void {
    this.rootElements.push(element);
  }
  
  /**
   * Remove a UI element from the root level
   */
  removeElement(element: UIElement): void {
    const index = this.rootElements.indexOf(element);
    if (index !== -1) {
      this.rootElements.splice(index, 1);
    }
  }
  
  /**
   * Remove all UI elements
   */
  removeAllElements(): void {
    this.rootElements = [];
  }
  
  /**
   * Update all UI elements
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    // Update all elements
    for (const element of this.rootElements) {
      element.update(deltaTime);
    }
  }
  
  /**
   * Render the UI
   */
  render(deltaTime: number): void {
    if (!this.ctx) return;
    
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Render all elements
    for (const element of this.rootElements) {
      element.render(this);
    }
  }
  
  /**
   * Get font information by name
   */
  getFontInfo(fontName: string): FontInfo | undefined {
    return this.fontInfo.get(fontName);
  }
  
  /**
   * Measure text width in pixels
   */
  measureText(fontName: string, text: string, scale: number = 1): number {
    const info = this.fontInfo.get(fontName);
    if (!info) return 0;
    
    return text.length * info.charWidth * scale;
  }
  
  /**
   * Get font character width
   */
  getCharWidth(fontName: string, charCode: number = 0, scale: number = 1): number {
    const info = this.fontInfo.get(fontName);
    if (!info) return 0;
    
    // Check for custom width first
    const customWidth = info.customWidths?.get(charCode);
    if (customWidth !== undefined) {
      return customWidth * scale;
    }
    
    // Use default width if no custom width defined
    return info.charWidth * scale;
  }
  
  /**
   * Get font character height
   */
  getCharHeight(fontName: string, scale: number = 1): number {
    const info = this.fontInfo.get(fontName);
    return info ? info.charHeight * scale : 0;
  }
  
  /**
   * Check if font is loaded
   */
  isFontLoaded(fontName: string): boolean {
    return this.fontInfo.has(fontName);
  }
  
  /**
   * Get the canvas context
   */
  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }
  
  /**
   * Get the canvas width
   */
  getWidth(): number {
    return this.width;
  }
  
  /**
   * Get the canvas height
   */
  getHeight(): number {
    return this.height;
  }
} 
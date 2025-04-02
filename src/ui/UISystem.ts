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
      // VGA font (8x12)
      await this.loadFont('vga', './assets/ascii/vga8x12.png', 8, 12);
      
      // Tiny font (6x6)
      await this.loadFont('tiny', './assets/ascii/tiny6x6.png', 6, 6);
      
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
        
        // Debug: check if font image has data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let hasData = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (imageData.data[i + 3] > 0) {
            hasData = true;
            break;
          }
        }
        console.log(`Font ${name} has visible pixels: ${hasData}`);
        
        // Store the font info
        this.fontInfo.set(name, {
          charWidth,
          charHeight,
          charsPerRow,
          rows,
          canvas
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
  getCharWidth(fontName: string, scale: number = 1): number {
    const info = this.fontInfo.get(fontName);
    return info ? info.charWidth * scale : 0;
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
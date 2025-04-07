import { Config } from '../core/Config';
import { UIElement } from './elements/UIElement';
import { AssetManager, FontLoadResult } from '../core/assets/AssetManager';

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
  
  // Asset manager instance
  private assetManager: AssetManager;
  
  constructor() {
    const config = Config.getInstance();
    this.width = config.resolution.width;
    this.height = config.resolution.height;
    this.assetManager = AssetManager.getInstance();
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
    
    console.log('UI system initialized');
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
    return this.assetManager.getFontInfo(fontName);
  }
  
  /**
   * Measure text width in pixels
   */
  measureText(fontName: string, text: string, scale: number = 1): number {
    const info = this.getFontInfo(fontName);
    if (!info) return 0;
    
    return text.length * info.charWidth * scale;
  }
  
  /**
   * Get font character width
   */
  getCharWidth(fontName: string, charCode: number = 0, scale: number = 1): number {
    const info = this.getFontInfo(fontName);
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
    const info = this.getFontInfo(fontName);
    return info ? info.charHeight * scale : 0;
  }
  
  /**
   * Check if font is loaded
   */
  isFontLoaded(fontName: string): boolean {
    return this.assetManager.isFontLoaded(fontName);
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
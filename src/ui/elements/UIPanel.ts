import { UIElement } from './UIElement';
import { UISystem } from '../UISystem';

/**
 * UIPanel - A container for other UI elements with optional background and border
 */
export class UIPanel extends UIElement {
  private backgroundColor: string;
  private borderColor: string;
  private borderWidth: number;
  
  /**
   * Create a new UIPanel
   * @param x X position in pixels
   * @param y Y position in pixels
   * @param width Width in pixels
   * @param height Height in pixels
   * @param backgroundColor Background color (or 'transparent')
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: string = 'transparent'
  ) {
    super(x, y, width, height);
    
    this.backgroundColor = backgroundColor;
    this.borderColor = 'transparent';
    this.borderWidth = 0;
  }
  
  /**
   * Set background color
   */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }
  
  /**
   * Set border properties
   */
  setBorder(color: string, width: number = 1): void {
    this.borderColor = color;
    this.borderWidth = Math.max(0, Math.floor(width));
  }
  
  /**
   * Render the panel
   */
  protected renderSelf(ui: UISystem): void {
    const ctx = ui.getContext();
    if (!ctx) return;
    
    const { x, y } = this.getWorldPosition();
    
    // Draw background if needed
    if (this.backgroundColor !== 'transparent') {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(x, y, this.width, this.height);
    }
    
    // Draw border if needed
    if (this.borderColor !== 'transparent' && this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      const halfBorder = this.borderWidth / 2;
      
      // Draw border inside the box
      ctx.strokeRect(
        x + halfBorder,
        y + halfBorder,
        this.width - this.borderWidth,
        this.height - this.borderWidth
      );
    }
  }
} 
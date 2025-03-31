import { UISystem } from '../UISystem';

/**
 * Base class for all UI elements
 */
export abstract class UIElement {
  // Position and dimensions
  protected x: number;
  protected y: number;
  protected width: number;
  protected height: number;
  
  // Visibility and state
  protected visible: boolean = true;
  protected active: boolean = true;
  
  // Parent-child relationships
  protected parent: UIElement | null = null;
  protected children: UIElement[] = [];
  
  /**
   * Create a new UI element
   * @param x X position in pixels
   * @param y Y position in pixels
   * @param width Width in pixels
   * @param height Height in pixels
   */
  constructor(x: number, y: number, width: number, height: number) {
    // Ensure integer coordinates
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.width = Math.floor(width);
    this.height = Math.floor(height);
  }
  
  /**
   * Update the element
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    // Update children
    if (this.active) {
      for (const child of this.children) {
        child.update(deltaTime);
      }
    }
  }
  
  /**
   * Render the element
   * @param ui The UI system
   */
  render(ui: UISystem): void {
    // Only render if visible
    if (!this.visible) return;
    
    // Render this element
    this.renderSelf(ui);
    
    // Render children
    for (const child of this.children) {
      child.render(ui);
    }
  }
  
  /**
   * Render this element (to be implemented by subclasses)
   */
  protected abstract renderSelf(ui: UISystem): void;
  
  /**
   * Add a child element
   */
  addChild(child: UIElement): void {
    child.parent = this;
    this.children.push(child);
  }
  
  /**
   * Remove a child element
   */
  removeChild(child: UIElement): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children[index].parent = null;
      this.children.splice(index, 1);
    }
  }
  
  /**
   * Remove all children
   */
  removeAllChildren(): void {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children = [];
  }
  
  /**
   * Check if point is inside this element
   */
  containsPoint(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }
  
  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.x = Math.floor(x);
    this.y = Math.floor(y);
  }
  
  /**
   * Set size
   */
  setSize(width: number, height: number): void {
    this.width = Math.floor(width);
    this.height = Math.floor(height);
  }
  
  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }
  
  /**
   * Set active state
   */
  setActive(active: boolean): void {
    this.active = active;
  }
  
  /**
   * Get position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
  
  /**
   * Get size
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
  
  /**
   * Get world position (accounting for parents)
   */
  getWorldPosition(): { x: number; y: number } {
    let worldX = this.x;
    let worldY = this.y;
    let currentParent = this.parent;
    
    while (currentParent) {
      worldX += currentParent.x;
      worldY += currentParent.y;
      currentParent = currentParent.parent;
    }
    
    return { x: worldX, y: worldY };
  }
} 
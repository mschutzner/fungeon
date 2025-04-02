import { UIElement } from './UIElement';
import { UISystem, FontInfo } from '../UISystem';
import { getFontIndex } from '../font/CharCodeMap';

/**
 * TextBox UI Element
 * Displays text with optional background and border
 */
export class TextBox extends UIElement {
  // Text properties
  private text: string;
  private fontName: string;
  private scale: number;
  private color: string;
  private alignment: 'left' | 'center' | 'right';
  private leading?: number; // Make leading optional
  
  // Box properties
  private backgroundColor: string;
  private borderColor: string;
  private borderWidth: number;
  private padding: number;
  
  // Overflow properties
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private visibleLines: number = 0;
  
  // Reusable offscreen canvas for colored text
  private colorCanvas: HTMLCanvasElement;
  private colorCtx: CanvasRenderingContext2D | null;
  
  // Add back lines property
  private lines: string[] = [];
  
  /**
   * Create a new TextBox
   * @param x X position in pixels
   * @param y Y position in pixels
   * @param width Width in pixels
   * @param height Height in pixels
   * @param text Initial text content
   * @param fontName Font name to use ('tiny', 'vga', etc.)
   * @param scale Integer scale factor (1, 2, 3, etc.)
   * @param color Text color (default: white)
   * @param alignment Text alignment (default: left)
   * @param leading Optional leading override (default: use font's default leading)
   */
  constructor(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    text: string = '',
    fontName: string = 'tiny',
    scale: number = 1,
    color: string = '#FFFFFF',
    alignment: 'left' | 'center' | 'right' = 'left',
    leading?: number
  ) {
    super(x, y, width, height);
    
    this.text = text;
    this.fontName = fontName;
    this.scale = Math.max(1, Math.floor(scale));
    this.color = color;
    this.alignment = alignment;
    this.leading = leading; // Store the leading value
    
    this.backgroundColor = 'transparent';
    this.borderColor = 'transparent';
    this.borderWidth = 0;
    this.padding = 0;
    
    // Create a reusable canvas for the colored text
    this.colorCanvas = document.createElement('canvas');
    this.colorCtx = this.colorCanvas.getContext('2d');
  }
  
  /**
   * Set the text content
   */
  setText(text: string): void {
    if (this.text !== text) {
      this.text = text;
    }
  }
  
  /**
   * Set the font name
   */
  setFont(fontName: string): void {
    this.fontName = fontName;
  }
  
  /**
   * Set the scale factor (integer)
   */
  setScale(scale: number): void {
    this.scale = Math.max(1, Math.floor(scale));
  }
  
  /**
   * Set text color
   */
  setTextColor(color: string): void {
    this.color = color;
  }
  
  /**
   * Set text alignment
   */
  setAlignment(alignment: 'left' | 'center' | 'right'): void {
    this.alignment = alignment;
  }
  
  /**
   * Set line spacing (leading)
   * @param leading Additional pixels between lines, or undefined to use font default
   */
  setLeading(leading?: number): void {
    this.leading = leading;
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
   * Set padding
   */
  setPadding(padding: number): void {
    this.padding = Math.max(0, Math.floor(padding));
  }
  
  /**
   * Split text into lines based on width constraints
   */
  private splitTextIntoLines(ui: UISystem): void {
    // Calculate available width
    const contentWidth = this.width - (this.padding * 2) - (this.borderWidth * 2);
    
    // Get font info
    const fontInfo = ui.getFontInfo(this.fontName);
    if (!fontInfo) {
      this.lines = [];
      return;
    }
    
    // First split by newlines
    const paragraphs = this.text.split('\n');
    this.lines = [];
    
    for (const paragraph of paragraphs) {
      // Calculate max chars per line based on character widths
      let currentLineWidth = 0;
      let maxLineWidth = 0;
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        // Calculate word width
        let wordWidth = 0;
        for (let i = 0; i < word.length; i++) {
          const charCode = word.charCodeAt(i);
          wordWidth += ui.getCharWidth(this.fontName, charCode, this.scale);
        }
        
        // Add space width if not first word
        if (currentLine.length > 0) {
          wordWidth += ui.getCharWidth(this.fontName, 0x0020, this.scale); // Space character
        }
        
        // Check if word fits
        if (currentLineWidth + wordWidth <= contentWidth) {
          // Add word to current line
          if (currentLine.length > 0) {
            currentLine += ' ' + word;
          } else {
            currentLine = word;
          }
          currentLineWidth += wordWidth;
          maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        } else {
          // Start new line
          if (currentLine.length > 0) {
            this.lines.push(currentLine);
          }
          currentLine = word;
          currentLineWidth = wordWidth;
          maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        }
      }
      
      // Add the last line of the paragraph
      if (currentLine.length > 0) {
        this.lines.push(currentLine);
      }
    }
    
    // Calculate max scroll and visible lines using font's leading if not overridden
    const baseLineHeight = fontInfo.charHeight * this.scale;
    const effectiveLeading = this.leading ?? fontInfo.leading ?? 0;
    const lineHeight = baseLineHeight + effectiveLeading;
    const contentHeight = this.height - (this.padding * 2) - (this.borderWidth * 2);
    this.visibleLines = Math.floor(contentHeight / lineHeight);
    this.maxScrollY = Math.max(0, this.lines.length - this.visibleLines);
  }
  
  /**
   * Scroll text up
   * @param amount Number of lines to scroll
   */
  scrollUp(amount: number = 1): void {
    this.scrollY = Math.max(0, this.scrollY - amount);
  }
  
  /**
   * Scroll text down
   * @param amount Number of lines to scroll
   */
  scrollDown(amount: number = 1): void {
    this.scrollY = Math.min(this.maxScrollY, this.scrollY + amount);
  }
  
  /**
   * Set scroll position
   * @param position Line index to scroll to
   */
  setScroll(position: number): void {
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, position));
  }
  
  /**
   * Render the text box
   */
  protected renderSelf(ui: UISystem): void {
    const ctx = ui.getContext();
    if (!ctx) return;
    
    // Split text into lines
    this.splitTextIntoLines(ui);
    
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
    
    // Get font info and make sure we have it
    const fontInfo = ui.getFontInfo(this.fontName);
    if (!fontInfo || !this.colorCtx) return;
    
    // Use font's default leading if not specified
    const effectiveLeading = this.leading ?? fontInfo.leading ?? 0;
    
    // Setup clipping region to prevent drawing outside the text box
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      x + this.borderWidth, 
      y + this.borderWidth, 
      this.width - (this.borderWidth * 2), 
      this.height - (this.borderWidth * 2)
    );
    ctx.clip();
    
    // Get line height from the font
    const baseLineHeight = fontInfo.charHeight * this.scale;
    const lineHeight = baseLineHeight + effectiveLeading;
    const contentX = x + this.padding + this.borderWidth;
    const contentY = y + this.padding + this.borderWidth;
    
    // Calculate visible range based on scroll position
    const startLine = Math.floor(this.scrollY);
    const endLine = Math.min(this.lines.length, startLine + this.visibleLines + 1);
    
    // Draw visible lines of text
    for (let i = startLine; i < endLine; i++) {
      const line = this.lines[i];
      if (line.length === 0) continue; // Skip empty lines
      
      let lineX = contentX;
      
      // Calculate total line width using custom character widths
      let lineWidth = 0;
      for (let j = 0; j < line.length; j++) {
        const charCode = line.charCodeAt(j);
        lineWidth += ui.getCharWidth(this.fontName, charCode, this.scale);
      }
      
      // Adjust position based on alignment
      if (this.alignment === 'center') {
        lineX = x + (this.width / 2) - (lineWidth / 2);
      } else if (this.alignment === 'right') {
        lineX = x + this.width - this.padding - this.borderWidth - lineWidth;
      }
      
      // Calculate vertical position, accounting for scroll offset
      const lineY = contentY + (i - startLine) * lineHeight;
      
      // Draw the line of text
      this.drawText(
        ctx,
        fontInfo,
        line,
        Math.floor(lineX),
        Math.floor(lineY)
      );
    }
    
    // Restore the original clipping region
    ctx.restore();
  }
  
  /**
   * Draw text using the pre-rendered font atlas
   */
  private drawText(
    ctx: CanvasRenderingContext2D,
    fontInfo: FontInfo,
    text: string,
    x: number,
    y: number
  ): void {
    if (!this.colorCtx) return;
    
    // Ensure integer scale
    const scale = Math.max(1, Math.floor(this.scale));
    
    // Get character dimensions
    const singleCharHeight = fontInfo.charHeight;
    
    // Resize color canvas to fit one character
    this.colorCanvas.height = singleCharHeight;
    
    // For each character in the text
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const fontIndex = getFontIndex(charCode);
      
      // Get character width
      const charWidth = fontInfo.customWidths?.get(charCode) ?? fontInfo.charWidth;
      this.colorCanvas.width = charWidth;
      
      // Get the source position in the font atlas
      const sourceX = (fontIndex % fontInfo.charsPerRow) * fontInfo.charWidth;
      const sourceY = Math.floor(fontIndex / fontInfo.charsPerRow) * singleCharHeight;
      
      // Clear the color canvas
      this.colorCtx.clearRect(0, 0, charWidth, singleCharHeight);
      
      // Fill with the text color
      this.colorCtx.fillStyle = this.color;
      this.colorCtx.fillRect(0, 0, charWidth, singleCharHeight);
      
      // Set composite operation to use the font as a mask
      this.colorCtx.globalCompositeOperation = 'destination-in';
      
      // Draw the character from the font atlas as a mask, sampling only the custom width
      this.colorCtx.drawImage(
        fontInfo.canvas,
        sourceX, sourceY, charWidth, singleCharHeight,
        0, 0, charWidth, singleCharHeight
      );
      
      // Reset composite operation for next iteration
      this.colorCtx.globalCompositeOperation = 'source-over';
      
      // Now draw the colored character to the main canvas with scaling
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.colorCanvas,
        0, 0, charWidth, singleCharHeight,
        currentX, y, charWidth * scale, singleCharHeight * scale
      );
      
      // Move to next character position
      currentX += charWidth * scale;
    }
  }
} 
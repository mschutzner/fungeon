import { EventSystem } from '../events/EventSystem';
import { InputMapper } from './InputMapper';

/**
 * Input events
 */
export enum InputEventType {
  KEY_DOWN = 'input.key.down',
  KEY_UP = 'input.key.up',
  KEY_PRESS = 'input.key.press',
  MOUSE_DOWN = 'input.mouse.down',
  MOUSE_UP = 'input.mouse.up',
  MOUSE_MOVE = 'input.mouse.move',
  MOUSE_WHEEL = 'input.mouse.wheel',
  TOUCH_START = 'input.touch.start',
  TOUCH_END = 'input.touch.end',
  TOUCH_MOVE = 'input.touch.move'
}

/**
 * Key state
 */
export interface KeyState {
  isDown: boolean;
  isPressed: boolean;
  pressedTime: number;
  releasedTime: number;
  repeat: boolean; // Track if this is a repeat event
}

/**
 * Button state for mouse or touch
 */
export interface ButtonState {
  isDown: boolean;
  downTime: number;
  upTime: number;
}

/**
 * Mouse state
 */
export interface MouseState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  deltaX: number;
  deltaY: number;
  buttons: Map<number, ButtonState>;
  wheel: number;
}

/**
 * Touch state
 */
export interface TouchState {
  touches: Map<number, TouchPoint>;
  changedTouches: Map<number, TouchPoint>;
  active: boolean;
}

/**
 * Touch point
 */
export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * InputManager - Handles keyboard, mouse, and touch input
 * Integrates with the EventSystem
 */
export class InputManager {
  private static instance: InputManager;
  private eventSystem: EventSystem;
  
  private keys: Map<string, KeyState>;
  private mouse: MouseState;
  private touch: TouchState;
  
  // Target element for input events
  private target: HTMLElement;
  
  // Input state
  private isEnabled: boolean = false;
  
  private inputMapper: InputMapper | null = null;
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.keys = new Map();
    this.mouse = {
      x: 0,
      y: 0,
      worldX: 0,
      worldY: 0,
      deltaX: 0,
      deltaY: 0,
      buttons: new Map(),
      wheel: 0
    };
    this.touch = {
      touches: new Map(),
      changedTouches: new Map(),
      active: false
    };
    this.target = document.body;
  }
  
  /**
   * Get the InputManager instance
   */
  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }
  
  /**
   * Initialize the input manager
   * @param target Target element for input events (default: document.body)
   */
  public initialize(target: HTMLElement = document.body): void {
    // Store target
    this.target = target;
    
    // Enable input
    this.enable();
    
    // Initialize input mapper
    this.inputMapper = InputMapper.getInstance();
    this.inputMapper.initialize();
    
    console.log('Input manager initialized');
  }
  
  /**
   * Enable input events
   */
  public enable(): void {
    if (this.isEnabled) return;
    
    // Add event listeners
    this.addEventListeners();
    
    this.isEnabled = true;
    console.log('Input events enabled');
  }
  
  /**
   * Disable input events
   */
  public disable(): void {
    if (!this.isEnabled) return;
    
    // Remove event listeners
    this.removeEventListeners();
    
    this.isEnabled = false;
    console.log('Input events disabled');
  }
  
  /**
   * Check if a key is currently down
   * @param key Key code or name
   * @returns True if key is down
   */
  public isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase()) && this.keys.get(key.toLowerCase())!.isDown;
  }
  
  /**
   * Check if a key was pressed this frame
   * @param key Key code or name
   * @returns True if key was pressed
   */
  public isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase()) && this.keys.get(key.toLowerCase())!.isPressed;
  }
  
  /**
   * Check if a mouse button is down
   * @param button Button index (0: left, 1: middle, 2: right)
   * @returns True if button is down
   */
  public isMouseButtonDown(button: number): boolean {
    return this.mouse.buttons.has(button) && this.mouse.buttons.get(button)!.isDown;
  }
  
  /**
   * Get mouse position
   * @returns Mouse position {x, y}
   */
  public getMousePosition(): {x: number, y: number} {
    return { x: this.mouse.x, y: this.mouse.y };
  }
  
  /**
   * Get current mouse coordinates
   * @returns Mouse position object
   */
  public getCurrentMousePosition(): {x: number, y: number} {
    return { x: this.mouse.x, y: this.mouse.y };
  }
  
  /**
   * Get mouse world position
   * @returns Mouse world position {x, y}
   */
  public getMouseWorldPosition(): {x: number, y: number} {
    return { x: this.mouse.worldX, y: this.mouse.worldY };
  }
  
  /**
   * Check if touch is active
   * @returns True if touch is active
   */
  public isTouchActive(): boolean {
    return this.touch.active;
  }
  
  /**
   * Get touch count
   * @returns Number of active touches
   */
  public getTouchCount(): number {
    return this.touch.touches.size;
  }
  
  /**
   * Get active touches
   * @returns Map of active touches
   */
  public getTouches(): Map<number, TouchPoint> {
    return this.touch.touches;
  }
  
  /**
   * Update input states for the current frame
   */
  public update(): void {
    // Reset key pressed states
    for (const [key, state] of this.keys) {
      state.isPressed = false;
    }
    
    // Reset mouse wheel
    this.mouse.wheel = 0;
    
    // Reset mouse delta
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    
    // Clear changed touches
    this.touch.changedTouches.clear();
    
    // Update the input mapper if it exists
    if (this.inputMapper) {
      this.inputMapper.update();
    }
  }
  
  /**
   * Add event listeners
   */
  private addEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    this.target.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.target.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.target.addEventListener('wheel', this.handleMouseWheel.bind(this));
    
    // Touch events
    this.target.addEventListener('touchstart', this.handleTouchStart.bind(this));
    window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.target.addEventListener('touchmove', this.handleTouchMove.bind(this));
  }
  
  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    // Keyboard events
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    this.target.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.target.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.target.removeEventListener('wheel', this.handleMouseWheel.bind(this));
    
    // Touch events
    this.target.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    window.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.target.removeEventListener('touchmove', this.handleTouchMove.bind(this));
  }
  
  /**
   * Handle key down event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    
    // Create key state if it doesn't exist
    if (!this.keys.has(key)) {
      this.keys.set(key, {
        isDown: false,
        isPressed: false,
        pressedTime: 0,
        releasedTime: 0,
        repeat: false
      });
    }
    
    const keyState = this.keys.get(key)!;
    
    // Check if this is a repeat event (browser auto-repeat)
    if (event.repeat) {
      keyState.repeat = true;
      // We'll publish a repeat event so consumers can handle it if needed,
      // but we won't treat it as a new press
      this.eventSystem.publish(InputEventType.KEY_DOWN, {
        key,
        event,
        repeat: true
      });
      return;
    }
    
    // Only trigger pressed once per key press
    if (!keyState.isDown) {
      keyState.isPressed = true;
      keyState.pressedTime = performance.now();
      keyState.repeat = false;
    }
    
    keyState.isDown = true;
    
    // Publish event
    this.eventSystem.publish(InputEventType.KEY_DOWN, {
      key,
      event,
      repeat: false
    });
    
    // Publish key press event
    if (keyState.isPressed) {
      this.eventSystem.publish(InputEventType.KEY_PRESS, {
        key,
        event,
        repeat: false
      });
    }
  }
  
  /**
   * Handle key up event
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    
    // Create key state if it doesn't exist
    if (!this.keys.has(key)) {
      this.keys.set(key, {
        isDown: false,
        isPressed: false,
        pressedTime: 0,
        releasedTime: 0,
        repeat: false
      });
    }
    
    const keyState = this.keys.get(key)!;
    
    keyState.isDown = false;
    keyState.isPressed = false;
    keyState.releasedTime = performance.now();
    
    // Publish event
    this.eventSystem.publish(InputEventType.KEY_UP, {
      key,
      event
    });
  }
  
  /**
   * Handle mouse down event
   */
  private handleMouseDown(event: MouseEvent): void {
    this.updateMousePosition(event);
    
    // Create button state if it doesn't exist
    if (!this.mouse.buttons.has(event.button)) {
      this.mouse.buttons.set(event.button, {
        isDown: false,
        downTime: 0,
        upTime: 0
      });
    }
    
    const buttonState = this.mouse.buttons.get(event.button)!;
    buttonState.isDown = true;
    buttonState.downTime = performance.now();
    
    // Publish event
    this.eventSystem.publish(InputEventType.MOUSE_DOWN, {
      x: this.mouse.x,
      y: this.mouse.y,
      worldX: this.mouse.worldX,
      worldY: this.mouse.worldY,
      button: event.button,
      event
    });
  }
  
  /**
   * Handle mouse up event
   */
  private handleMouseUp(event: MouseEvent): void {
    this.updateMousePosition(event);
    
    // Create button state if it doesn't exist
    if (!this.mouse.buttons.has(event.button)) {
      this.mouse.buttons.set(event.button, {
        isDown: false,
        downTime: 0,
        upTime: 0
      });
    }
    
    const buttonState = this.mouse.buttons.get(event.button)!;
    buttonState.isDown = false;
    buttonState.upTime = performance.now();
    
    // Publish event
    this.eventSystem.publish(InputEventType.MOUSE_UP, {
      x: this.mouse.x,
      y: this.mouse.y,
      worldX: this.mouse.worldX,
      worldY: this.mouse.worldY,
      button: event.button,
      event
    });
  }
  
  /**
   * Handle mouse move event
   */
  private handleMouseMove(event: MouseEvent): void {
    const oldX = this.mouse.x;
    const oldY = this.mouse.y;
    
    this.updateMousePosition(event);
    
    // Calculate delta
    this.mouse.deltaX = this.mouse.x - oldX;
    this.mouse.deltaY = this.mouse.y - oldY;
    
    // Publish event
    this.eventSystem.publish(InputEventType.MOUSE_MOVE, {
      x: this.mouse.x,
      y: this.mouse.y,
      worldX: this.mouse.worldX,
      worldY: this.mouse.worldY,
      deltaX: this.mouse.deltaX,
      deltaY: this.mouse.deltaY,
      event
    });
  }
  
  /**
   * Handle mouse wheel event
   */
  private handleMouseWheel(event: WheelEvent): void {
    this.updateMousePosition(event);
    
    // Store wheel delta
    this.mouse.wheel = Math.sign(event.deltaY);
    
    // Publish event
    this.eventSystem.publish(InputEventType.MOUSE_WHEEL, {
      x: this.mouse.x,
      y: this.mouse.y,
      worldX: this.mouse.worldX,
      worldY: this.mouse.worldY,
      deltaY: event.deltaY,
      delta: this.mouse.wheel,
      event
    });
  }
  
  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    this.touch.active = true;
    
    // Add new touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      const point = this.getTouchPosition(t);
      
      const touch: TouchPoint = {
        id: t.identifier,
        x: point.x,
        y: point.y,
        worldX: point.x,
        worldY: point.y,
        startX: point.x,
        startY: point.y,
        startTime: performance.now()
      };
      
      this.touch.touches.set(t.identifier, touch);
      this.touch.changedTouches.set(t.identifier, touch);
    }
    
    // Update mouse position from primary touch
    if (event.touches.length > 0) {
      const primary = event.touches[0];
      const point = this.getTouchPosition(primary);
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.worldX = point.x;
      this.mouse.worldY = point.y;
    }
    
    // Publish event
    this.eventSystem.publish(InputEventType.TOUCH_START, {
      touches: this.touch.touches,
      changedTouches: this.touch.changedTouches,
      event
    });
  }
  
  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Remove finished touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      if (this.touch.touches.has(t.identifier)) {
        const touch = this.touch.touches.get(t.identifier)!;
        this.touch.changedTouches.set(t.identifier, touch);
        this.touch.touches.delete(t.identifier);
      }
    }
    
    // Update touch active state
    this.touch.active = this.touch.touches.size > 0;
    
    // Publish event
    this.eventSystem.publish(InputEventType.TOUCH_END, {
      touches: this.touch.touches,
      changedTouches: this.touch.changedTouches,
      event
    });
  }
  
  /**
   * Handle touch move event
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    // Update touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      if (this.touch.touches.has(t.identifier)) {
        const touch = this.touch.touches.get(t.identifier)!;
        const point = this.getTouchPosition(t);
        
        touch.x = point.x;
        touch.y = point.y;
        touch.worldX = point.x;
        touch.worldY = point.y;
        
        this.touch.changedTouches.set(t.identifier, touch);
      }
    }
    
    // Update mouse position from primary touch
    if (event.touches.length > 0) {
      const primary = event.touches[0];
      const point = this.getTouchPosition(primary);
      
      // Calculate delta
      this.mouse.deltaX = point.x - this.mouse.x;
      this.mouse.deltaY = point.y - this.mouse.y;
      
      // Update position
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.worldX = point.x;
      this.mouse.worldY = point.y;
    }
    
    // Publish event
    this.eventSystem.publish(InputEventType.TOUCH_MOVE, {
      touches: this.touch.touches,
      changedTouches: this.touch.changedTouches,
      event
    });
  }
  
  /**
   * Update mouse position from event
   */
  private updateMousePosition(event: MouseEvent): void {
    const point = this.getMouseCoordinates(event);
    this.mouse.x = point.x;
    this.mouse.y = point.y;
    this.mouse.worldX = point.x;
    this.mouse.worldY = point.y;
  }
  
  /**
   * Get mouse coordinates relative to target element, accounting for CSS scaling
   */
  private getMouseCoordinates(event: MouseEvent): {x: number, y: number} {
    const rect = this.target.getBoundingClientRect();
    
    // Get the display size of the canvas
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Get the internal size of the canvas
    const internalWidth = this.target instanceof HTMLCanvasElement ? this.target.width : displayWidth;
    const internalHeight = this.target instanceof HTMLCanvasElement ? this.target.height : displayHeight;
    
    // Calculate the scaling ratio
    const scaleX = internalWidth / displayWidth;
    const scaleY = internalHeight / displayHeight;
    
    // Apply the scaling to the mouse position
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    return { x, y };
  }
  
  /**
   * Get touch position relative to target element, accounting for CSS scaling
   */
  private getTouchPosition(touch: Touch): {x: number, y: number} {
    const rect = this.target.getBoundingClientRect();
    
    // Get the display size of the canvas
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Get the internal size of the canvas
    const internalWidth = this.target instanceof HTMLCanvasElement ? this.target.width : displayWidth;
    const internalHeight = this.target instanceof HTMLCanvasElement ? this.target.height : displayHeight;
    
    // Calculate the scaling ratio
    const scaleX = internalWidth / displayWidth;
    const scaleY = internalHeight / displayHeight;
    
    // Apply the scaling to the touch position
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    
    return { x, y };
  }
  
  /**
   * Get the input mapper instance
   */
  public getInputMapper(): InputMapper | null {
    return this.inputMapper;
  }
} 
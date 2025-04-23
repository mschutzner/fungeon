import { Config } from '../core/Config';
import { MobileInputType } from '../core/input/InputMapper';
import { InputManager } from '../core/input/InputManager';

/**
 * Represents a state of a joystick
 */
export interface JoystickState {
  active: boolean;
  angle: number;
  distance: number;
  x: number; // -1 to 1
  y: number; // -1 to 1
}

interface TouchData {
  id: number;
  startX: number;
  startY: number;
  element: HTMLElement;
  type: 'joystick' | 'button';
  joystickHandle?: HTMLElement;
}

export class MobileController {
  private element: HTMLElement;
  private leftJoystick: HTMLElement;
  private rightJoystick: HTMLElement;
  private buttonA: HTMLElement;
  private buttonB: HTMLElement;
  private buttonX: HTMLElement;
  private buttonY: HTMLElement;
  private buttonStart: HTMLElement;
  private buttonSelect: HTMLElement;
  
  private leftJoystickHandle: HTMLElement;
  private rightJoystickHandle: HTMLElement;
  
  // Joystick states
  private leftJoystickState: JoystickState = {
    active: false,
    angle: 0,
    distance: 0,
    x: 0,
    y: 0
  };
  
  private rightJoystickState: JoystickState = {
    active: false,
    angle: 0,
    distance: 0,
    x: 0,
    y: 0
  };
  
  // Button states
  private buttonStates: Map<MobileInputType, boolean> = new Map();
  
  // Touch tracking
  private activeTouches: Map<number, TouchData> = new Map();
  
  // Joystick config
  private joystickRadius: number = 0;
  private joystickThreshold: number = 0.5; // Threshold for directional input
  private joystickMaxDistance: number = 0;
  
  // Input manager reference for dispatching events
  private inputManager: InputManager | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'mobile-controller';
    // Default to hidden
    this.element.style.display = 'none';
    
    this.leftJoystick = document.createElement('div');
    this.leftJoystick.className = 'joystick left-joystick';
    
    this.rightJoystick = document.createElement('div');
    this.rightJoystick.className = 'joystick right-joystick';
    
    this.leftJoystickHandle = document.createElement('div');
    this.leftJoystickHandle.className = 'joystick-handle';
    
    this.rightJoystickHandle = document.createElement('div');
    this.rightJoystickHandle.className = 'joystick-handle';
    
    this.buttonA = document.createElement('div');
    this.buttonA.className = 'button button-a';
    this.buttonA.dataset.button = MobileInputType.BUTTON_A;
    this.buttonA.textContent = 'A';
    
    this.buttonB = document.createElement('div');
    this.buttonB.className = 'button button-b';
    this.buttonB.dataset.button = MobileInputType.BUTTON_B;
    this.buttonB.textContent = 'B';
    
    this.buttonX = document.createElement('div');
    this.buttonX.className = 'button button-x';
    this.buttonX.dataset.button = MobileInputType.BUTTON_X;
    this.buttonX.textContent = 'X';
    
    this.buttonY = document.createElement('div');
    this.buttonY.className = 'button button-y';
    this.buttonY.dataset.button = MobileInputType.BUTTON_Y;
    this.buttonY.textContent = 'Y';
    
    this.buttonStart = document.createElement('div');
    this.buttonStart.className = 'button button-start';
    this.buttonStart.dataset.button = MobileInputType.BUTTON_START;
    this.buttonStart.textContent = 'START';
    
    this.buttonSelect = document.createElement('div');
    this.buttonSelect.className = 'button button-select';
    this.buttonSelect.dataset.button = MobileInputType.BUTTON_SELECT;
    this.buttonSelect.textContent = 'SELECT';
    
    // Initialize button states
    this.buttonStates.set(MobileInputType.BUTTON_A, false);
    this.buttonStates.set(MobileInputType.BUTTON_B, false);
    this.buttonStates.set(MobileInputType.BUTTON_X, false);
    this.buttonStates.set(MobileInputType.BUTTON_Y, false);
    this.buttonStates.set(MobileInputType.BUTTON_START, false);
    this.buttonStates.set(MobileInputType.BUTTON_SELECT, false);
  }

  /**
   * Initialize the mobile controller
   */
  public initialize(): void {
    const config = Config.getInstance();
    const controllerConfig = config.config.mobileController || { enabled: true };
    
    // Set up controller styles
    this.setupStyles(controllerConfig);
    
    // Build the controller DOM structure
    this.buildControllerDOM();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Get input manager
    this.inputManager = InputManager.getInstance();
  }

  /**
   * Set up controller styles based on config
   */
  private setupStyles(controllerConfig: any): void {
    const colors = controllerConfig.colors || {};
    
    // Create stylesheet for the controller
    const style = document.createElement('style');
    style.textContent = `
      #mobile-controller {
        width: min(66.66cqh, 100cqw);
        aspect-ratio: 2/1;
        position: relative;
        background: ${colors.background || '#b8a07d'};
        border-radius: 0 0 min(15cqh, 22.5cqw) min(15cqh, 22.5cqw);
        display: flex;
        justify-content: space-between;
        align-items: center;
        touch-action: none;
        user-select: none;
      }
      
      #game-container.has-mobile-controller #game-canvas {
        height: min(66.66cqh, 100cqw) !important;
      }
      
      .joystick {
        position: relative;
        width: 25%;
        aspect-ratio: 1;
        background: ${colors.joystickBase || '#8c7a5b'};
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        touch-action: none;
      }
      
      .joystick::before, .joystick::after {
        content: '';
        position: absolute;
        background: ${colors.joystickStick || '#655640'};
      }
      
      /* Cardinal direction markers */
      .joystick .caret {
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
      }
      
      .joystick .caret-up {
        top: 10%;
        border-width: 0 2.5cqw 2.5cqw 2.5cqw;
        border-color: transparent transparent ${colors.joystickStick || '#655640'} transparent;
      }
      
      .joystick .caret-down {
        bottom: 10%;
        border-width: 2.5cqw 2.5cqw 0 2.5cqw;
        border-color: ${colors.joystickStick || '#655640'} transparent transparent transparent;
      }
      
      .joystick .caret-left {
        left: 10%;
        border-width: 2.5cqw 2.5cqw 2.5cqw 0;
        border-color: transparent ${colors.joystickStick || '#655640'} transparent transparent;
      }
      
      .joystick .caret-right {
        right: 10%;
        border-width: 2.5cqw 0 2.5cqw 2.5cqw;
        border-color: transparent transparent transparent ${colors.joystickStick || '#655640'};
      }
      
      .joystick-handle {
        position: absolute;
        width: 50%;
        height: 50%;
        background: ${colors.joystickStick || '#655640'};
        border-radius: 50%;
        touch-action: none;
        transition: transform 0.02s linear;
        z-index: 2;
      }
      
      .left-joystick {
        margin-left: 7.5%;
      }
      
      .right-joystick {
        margin-right: 7.5%;
      }
      
      .button {
        position: absolute;
        width: 10%;
        aspect-ratio: 1;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: sans-serif;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        font-size: min(3cqh, 4.5cqw);
        touch-action: none;
        transition: transform 0.05s ease-in-out, filter 0.05s ease-in-out;
      }
      
      .button-start, .button-select {
        border-radius: 20px;
        width: 15%;
        aspect-ratio: 2.5/1;
        top: 33.33%;
        font-size: min(2cqh, 3cqw);
      }
      
      .button-start {
        right: 34%;
      }
      
      .button-select {
        left: 34%;
      }
      
      .button-a {
        background: ${colors.buttonA || '#dc7633'};
        top: 5%;
        right: 5%;
      }
      
      .button-b {
        background: ${colors.buttonB || '#c0392b'};
        top: 5%;
        right: 25%;
      }
      
      .button-x {
        background: ${colors.buttonX || '#3498db'};
        top: 5%;
        left: 25%;
      }
      
      .button-y {
        background: ${colors.buttonY || '#2ecc71'};
        top: 5%;
        left: 5%;
      }
      
      .button-start {
        background: ${colors.buttonStart || '#7d5d4e'};
      }
      
      .button-select {
        background: ${colors.buttonSelect || '#7d5d4e'};
      }
      
      .button.active {
        transform: scale(0.9);
        filter: brightness(0.9);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Build the controller DOM structure
   */
  private buildControllerDOM(): void {
    // Add directional carets to joysticks
    const leftCarets = this.createJoystickCarets();
    const rightCarets = this.createJoystickCarets();
    
    leftCarets.forEach(caret => this.leftJoystick.appendChild(caret));
    rightCarets.forEach(caret => this.rightJoystick.appendChild(caret));
    
    // Add joystick handles
    this.leftJoystick.appendChild(this.leftJoystickHandle);
    this.rightJoystick.appendChild(this.rightJoystickHandle);
    
    // Add all elements to the controller
    this.element.appendChild(this.leftJoystick);
    this.element.appendChild(this.rightJoystick);
    this.element.appendChild(this.buttonA);
    this.element.appendChild(this.buttonB);
    this.element.appendChild(this.buttonX);
    this.element.appendChild(this.buttonY);
    this.element.appendChild(this.buttonStart);
    this.element.appendChild(this.buttonSelect);
  }
  
  /**
   * Create directional caret elements for joysticks
   */
  private createJoystickCarets(): HTMLElement[] {
    const directions = ['up', 'down', 'left', 'right'];
    return directions.map(direction => {
      const caret = document.createElement('div');
      caret.className = `caret caret-${direction}`;
      return caret;
    });
  }

  /**
   * Set up event listeners for the controller
   */
  private setupEventListeners(): void {
    // Prevent default behavior for all touch events
    this.element.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.element.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.element.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    this.element.addEventListener('touchcancel', (e) => e.preventDefault(), { passive: false });
    
    // Joystick touch handling
    this.leftJoystick.addEventListener('touchstart', this.handleJoystickTouchStart.bind(this, 'left'), { passive: true });
    this.rightJoystick.addEventListener('touchstart', this.handleJoystickTouchStart.bind(this, 'right'), { passive: true });
    
    // Button touch handling
    const buttons = [
      this.buttonA, this.buttonB, this.buttonX, this.buttonY,
      this.buttonStart, this.buttonSelect
    ];
    
    buttons.forEach(button => {
      button.addEventListener('touchstart', this.handleButtonTouchStart.bind(this), { passive: true });
    });
    
    // Global touch move and end events for tracking all touches
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    document.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: true });
    
    // Calculate joystick dimensions when visible
    window.addEventListener('resize', this.updateJoystickDimensions.bind(this));
  }
  
  /**
   * Update joystick dimensions
   */
  private updateJoystickDimensions(): void {
    if (this.element.style.display !== 'none') {
      const leftRect = this.leftJoystick.getBoundingClientRect();
      this.joystickRadius = leftRect.width / 2;
      this.joystickMaxDistance = this.joystickRadius * 0.5; // 50% of joystick radius
    }
  }
  
  /**
   * Handle joystick touch start
   */
  private handleJoystickTouchStart(joystick: 'left' | 'right', event: TouchEvent): void {
    // Get the joystick elements
    const joystickElement = joystick === 'left' ? this.leftJoystick : this.rightJoystick;
    const handleElement = joystick === 'left' ? this.leftJoystickHandle : this.rightJoystickHandle;
    
    // Calculate joystick dimensions on first touch
    if (this.joystickRadius === 0) {
      this.updateJoystickDimensions();
    }
    
    // Get joystick rect
    const rect = joystickElement.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    // Store touch data for each touch within the joystick
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      // Store touch data
      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        startX: center.x,
        startY: center.y,
        element: joystickElement,
        type: 'joystick',
        joystickHandle: handleElement
      });
      
      // Set joystick to active state
      if (joystick === 'left') {
        this.leftJoystickState.active = true;
      } else {
        this.rightJoystickState.active = true;
      }
      
      // Process initial position
      this.processJoystickPosition(joystick, touch.clientX, touch.clientY);
    }
  }
  
  /**
   * Handle button touch start
   */
  private handleButtonTouchStart(event: TouchEvent): void {
    const button = event.currentTarget as HTMLElement;
    const buttonType = button.dataset.button as MobileInputType;
    
    if (!buttonType) return;
    
    // Store touch data for each touch
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      // Store touch data
      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        element: button,
        type: 'button'
      });
      
      // Set button to active state
      button.classList.add('active');
      this.buttonStates.set(buttonType, true);
      
      // Dispatch button press event
      this.dispatchButtonEvent(buttonType, true);
    }
  }
  
  /**
   * Handle touch move for all touches
   */
  private handleTouchMove(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchData = this.activeTouches.get(touch.identifier);
      
      if (touchData) {
        if (touchData.type === 'joystick') {
          // Process joystick movement
          const joystick = touchData.element === this.leftJoystick ? 'left' : 'right';
          this.processJoystickPosition(joystick, touch.clientX, touch.clientY);
        }
      }
    }
  }
  
  /**
   * Handle touch end for all touches
   */
  private handleTouchEnd(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchData = this.activeTouches.get(touch.identifier);
      
      if (touchData) {
        if (touchData.type === 'joystick') {
          // Reset joystick
          const joystick = touchData.element === this.leftJoystick ? 'left' : 'right';
          this.resetJoystick(joystick);
        } else if (touchData.type === 'button') {
          // Reset button
          touchData.element.classList.remove('active');
          const buttonType = touchData.element.dataset.button as MobileInputType;
          if (buttonType) {
            this.buttonStates.set(buttonType, false);
            this.dispatchButtonEvent(buttonType, false);
          }
        }
        
        // Remove touch data
        this.activeTouches.delete(touch.identifier);
      }
    }
  }
  
  /**
   * Process joystick position
   */
  private processJoystickPosition(joystick: 'left' | 'right', clientX: number, clientY: number): void {
    const joystickElement = joystick === 'left' ? this.leftJoystick : this.rightJoystick;
    const handleElement = joystick === 'left' ? this.leftJoystickHandle : this.rightJoystickHandle;
    const state = joystick === 'left' ? this.leftJoystickState : this.rightJoystickState;
    
    // Get joystick center position
    const rect = joystickElement.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    // Calculate distance from center
    const deltaX = clientX - center.x;
    const deltaY = clientY - center.y;
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), this.joystickMaxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    
    // Normalize to -1 to 1 range
    const normalizedDistance = distance / this.joystickMaxDistance;
    const x = Math.cos(angle) * normalizedDistance;
    const y = Math.sin(angle) * normalizedDistance;
    
    // Update joystick visual position
    const translateX = Math.cos(angle) * distance;
    const translateY = Math.sin(angle) * distance;
    handleElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
    // Skip if no change in position to avoid unnecessary event dispatches
    if (Math.abs(x - state.x) < 0.01 && Math.abs(y - state.y) < 0.01) {
      return;
    }
    
    // Update state
    state.x = x;
    state.y = y;
    state.angle = angle;
    state.distance = normalizedDistance;
    
    // Dispatch joystick events
    this.dispatchJoystickEvents(joystick, x, y);
  }
  
  /**
   * Reset joystick to center position
   */
  private resetJoystick(joystick: 'left' | 'right'): void {
    const handleElement = joystick === 'left' ? this.leftJoystickHandle : this.rightJoystickHandle;
    const state = joystick === 'left' ? this.leftJoystickState : this.rightJoystickState;
    
    // Reset handle position
    handleElement.style.transform = 'translate(0px, 0px)';
    
    // Reset state
    state.active = false;
    
    // Only dispatch new events if the joystick wasn't already centered
    const wasActive = state.x !== 0 || state.y !== 0;
    
    state.x = 0;
    state.y = 0;
    state.angle = 0;
    state.distance = 0;
    
    if (wasActive) {
      // Dispatch joystick events for reset position
      this.dispatchJoystickEvents(joystick, 0, 0);
    }
  }
  
  /**
   * Dispatch joystick events based on position
   */
  private dispatchJoystickEvents(joystick: 'left' | 'right', x: number, y: number): void {
    if (!this.inputManager) return;
    
    const mapper = this.inputManager.getInputMapper();
    if (!mapper) return;
    
    const threshold = this.joystickThreshold;
    
    if (joystick === 'left') {
      // Left joystick controls movement (WASD)
      const upActive = y < -threshold;
      const downActive = y > threshold;
      const leftActive = x < -threshold;
      const rightActive = x > threshold;
      
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_UP, upActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_DOWN, downActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_LEFT, leftActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_RIGHT, rightActive);
    } else {
      // Right joystick controls actions (arrow keys)
      const upActive = y < -threshold;
      const downActive = y > threshold;
      const leftActive = x < -threshold;
      const rightActive = x > threshold;
      
      mapper.handleMobileInput(MobileInputType.JOYSTICK_RIGHT_UP, upActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_RIGHT_DOWN, downActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_RIGHT_LEFT, leftActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_RIGHT_RIGHT, rightActive);
    }
  }
  
  /**
   * Dispatch button events
   */
  private dispatchButtonEvent(buttonType: MobileInputType, pressed: boolean): void {
    if (!this.inputManager) return;
    
    const mapper = this.inputManager.getInputMapper();
    if (!mapper) return;
    
    mapper.handleMobileInput(buttonType, pressed);
  }

  /**
   * Show the controller and apply mobile layout
   */
  public show(): void {
    this.element.style.display = 'flex';
    const container = document.getElementById('game-container');
    if (container) {
      container.classList.add('has-mobile-controller');
    }
    
    // Update joystick dimensions when shown
    setTimeout(() => {
      this.updateJoystickDimensions();
    }, 0);
  }

  /**
   * Hide the controller and remove mobile layout
   */
  public hide(): void {
    this.element.style.display = 'none';
    const container = document.getElementById('game-container');
    if (container) {
      container.classList.remove('has-mobile-controller');
    }
  }

  /**
   * Get the controller element
   */
  public getElement(): HTMLElement {
    return this.element;
  }
  
  /**
   * Get the current state of the left joystick
   */
  public getLeftJoystickState(): JoystickState {
    return { ...this.leftJoystickState };
  }
  
  /**
   * Get the current state of the right joystick
   */
  public getRightJoystickState(): JoystickState {
    return { ...this.rightJoystickState };
  }
  
  /**
   * Check if a button is pressed
   */
  public isButtonPressed(button: MobileInputType): boolean {
    return this.buttonStates.get(button) || false;
  }
  
  /**
   * Get all current button states
   */
  public getButtonStates(): Map<MobileInputType, boolean> {
    return new Map(this.buttonStates);
  }

  /**
   * Check if the device is a mobile device
   */
  public static isMobileDevice(): boolean {
    return !!(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
    );
  }
} 
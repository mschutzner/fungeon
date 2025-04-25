import { Config } from '../Config';
import { MobileInputType } from './InputMapper';
import { InputManager } from './InputManager';

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
  private dPadContainer: HTMLElement;
  private dUp: HTMLElement;
  private dDown: HTMLElement;
  private dLeft: HTMLElement;
  private dRight: HTMLElement;
  private buttonA: HTMLElement;
  private buttonB: HTMLElement;
  private buttonPlus: HTMLElement;
  private buttonMinus: HTMLElement;
  private buttonStart: HTMLElement;
  private buttonSelect: HTMLElement;
  
  private leftJoystickHandle: HTMLElement;
  
  // Joystick states
  private leftJoystickState: JoystickState = {
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
    
    this.dPadContainer = document.createElement('div');
    this.dPadContainer.className = 'd-pad-container';
    
    this.dUp = document.createElement('div');
    this.dUp.className = 'd-up';
    this.dUp.dataset.button = MobileInputType.D_UP;
    
    this.dDown = document.createElement('div');
    this.dDown.className = 'd-down';
    this.dDown.dataset.button = MobileInputType.D_DOWN;
    
    this.dLeft = document.createElement('div');
    this.dLeft.className = 'd-left';
    this.dLeft.dataset.button = MobileInputType.D_LEFT;
    
    this.dRight = document.createElement('div');
    this.dRight.className = 'd-right';
    this.dRight.dataset.button = MobileInputType.D_RIGHT;
    
    this.leftJoystickHandle = document.createElement('div');
    this.leftJoystickHandle.className = 'joystick-handle';
    
    this.buttonA = document.createElement('div');
    this.buttonA.className = 'button button-a';
    this.buttonA.dataset.button = MobileInputType.BUTTON_A;
    this.buttonA.textContent = 'A';
    
    this.buttonB = document.createElement('div');
    this.buttonB.className = 'button button-b';
    this.buttonB.dataset.button = MobileInputType.BUTTON_B;
    this.buttonB.textContent = 'B';
    
    this.buttonPlus = document.createElement('div');
    this.buttonPlus.className = 'button button-plus';
    this.buttonPlus.dataset.button = MobileInputType.BUTTON_PLUS;
    this.buttonPlus.textContent = '+';
    
    this.buttonMinus = document.createElement('div');
    this.buttonMinus.className = 'button button-minus';
    this.buttonMinus.dataset.button = MobileInputType.BUTTON_MINUS;
    this.buttonMinus.textContent = '–';
    
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
    this.buttonStates.set(MobileInputType.BUTTON_PLUS, false);
    this.buttonStates.set(MobileInputType.BUTTON_MINUS, false);
    this.buttonStates.set(MobileInputType.D_UP, false);
    this.buttonStates.set(MobileInputType.D_DOWN, false);
    this.buttonStates.set(MobileInputType.D_LEFT, false);
    this.buttonStates.set(MobileInputType.D_RIGHT, false);
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
        font-size: min(2cqh, 3cqw);
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
      
      .joystick:after{
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
        top: -0.25em;
        border-width: 1em;
        border-color: transparent transparent ${colors.joystickStick || '#655640'} transparent;
      }
      
      .joystick .caret-down {
        bottom: -0.25em;
        border-width: 1em;
        border-color: ${colors.joystickStick || '#655640'} transparent transparent transparent;
      }
      
      .joystick .caret-left {
        left: -0.25em;
        border-width: 1em;
        border-color: transparent ${colors.joystickStick || '#655640'} transparent transparent;
      }
      
      .joystick .caret-right {
        right: -0.25em;
        border-width: 1em;
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
      
      /* D-Pad Styling */
      .d-pad-container {
        position: relative;
        width: 25%;
        aspect-ratio: 1;
        border-radius: 50%;
        margin-right: 7.5%;
        touch-action: none;
      }
      
      .d-up, .d-down, .d-left, .d-right {
        position: absolute;
        background: ${colors.dPad || '#655640'};
        touch-action: none;
        z-index: 2;
      }
      
      .d-up, .d-down {
        width: 2.5em;
        height: 2.5em;
        left: 35%;
      }
      
      .d-left, .d-right {
        width: 2.5em;
        height: 2.5em;
        top: 35%;
      }
      
      .d-up {
        top: 0;
        border-radius: 0.5em 0.5em 0 0 ;
      }
      
      .d-down {
        bottom: 0;
        border-radius: 0 0 0.5em 0.5em;
      }
      
      .d-left {
        left: 0;
        border-radius: 0.5em 0 0 0.5em;
      }
      
      .d-right {
        right: 0;
        border-radius: 0 0.5em 0.5em 0;
      }
      
      .d-up:after, .d-down:after, .d-left:after, .d-right:after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
        pointer-events: none;
        border-width: 1.25em;
      }
      
      .d-up:after {
        top: 100%;
        border-color: ${colors.dPad || '#655640'} transparent transparent transparent;
      }
      
      .d-down:after {
        bottom: 100%;
        border-color: transparent transparent ${colors.dPad || '#655640'} transparent;
      }
      
      .d-left:after {
        left: 100%;
        border-color: transparent transparent transparent ${colors.dPad || '#655640'};
      }
      
      .d-right:after {
        right: 100%;
        border-color: transparent ${colors.dPad || '#655640'} transparent transparent;
      }
      
      .d-up.active, .d-down.active, .d-left.active, .d-right.active {
        filter: brightness(0.9);
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
        color: ${colors.buttonText || '#ffffff'};
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
      
      .button-plus {
        background: ${colors.buttonPlus || '#3498db'};
        top: 5%;
        left: 25%;
      }
      
      .button-minus {
        background: ${colors.buttonMinus || '#2ecc71'};
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
    
    leftCarets.forEach(caret => this.leftJoystick.appendChild(caret));
    
    // Add joystick handles
    this.leftJoystick.appendChild(this.leftJoystickHandle);
    
    // Add d-pad elements to the d-pad container
    this.dPadContainer.appendChild(this.dUp);
    this.dPadContainer.appendChild(this.dDown);
    this.dPadContainer.appendChild(this.dLeft);
    this.dPadContainer.appendChild(this.dRight);
    
    // Add all elements to the controller
    this.element.appendChild(this.leftJoystick);
    this.element.appendChild(this.dPadContainer);
    this.element.appendChild(this.buttonA);
    this.element.appendChild(this.buttonB);
    this.element.appendChild(this.buttonPlus);
    this.element.appendChild(this.buttonMinus);
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
    
    // D-pad touch handling
    const dPadButtons = [this.dUp, this.dDown, this.dLeft, this.dRight];
    dPadButtons.forEach(button => {
      button.addEventListener('touchstart', this.handleButtonTouchStart.bind(this), { passive: true });
    });
    
    // Button touch handling
    const buttons = [
      this.buttonA, this.buttonB, this.buttonPlus, this.buttonMinus,
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
    const joystickElement = joystick === 'left' ? this.leftJoystick : this.leftJoystick;
    const handleElement = joystick === 'left' ? this.leftJoystickHandle : this.leftJoystickHandle;
    
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
        this.leftJoystickState.active = true;
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
    const joystickElement = joystick === 'left' ? this.leftJoystick : this.leftJoystick;
    const handleElement = joystick === 'left' ? this.leftJoystickHandle : this.leftJoystickHandle;
    const state = joystick === 'left' ? this.leftJoystickState : this.leftJoystickState;
    
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
    const handleElement = joystick === 'left' ? this.leftJoystickHandle : this.leftJoystickHandle;
    const state = joystick === 'left' ? this.leftJoystickState : this.leftJoystickState;
    
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
      
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_UP, upActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_DOWN, downActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_LEFT, leftActive);
      mapper.handleMobileInput(MobileInputType.JOYSTICK_LEFT_RIGHT, rightActive);
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
    return { ...this.leftJoystickState };
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
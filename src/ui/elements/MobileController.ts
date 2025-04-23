import { Config } from '../../core/Config';
import { EventSystem } from '../../core/events/EventSystem';
import { InputManager } from '../../core/input/InputManager';

/**
 * MobileController configuration interface
 */
export interface MobileControllerConfig {
  enabled: boolean;
  colors: {
    background: string;
    joystickBase: string;
    joystickStick: string;
    buttonA: string;
    buttonB: string;
    buttonX: string;
    buttonY: string;
    buttonStart: string;
    buttonSelect: string;
  };
  keyBindings: {
    [key: string]: string;
  };
}

/**
 * Default mobile controller configuration
 */
const DEFAULT_CONTROLLER_CONFIG: MobileControllerConfig = {
  enabled: true,
  colors: {
    background: '#b8a07d',
    joystickBase: '#a89070',
    joystickStick: '#806850',
    buttonA: '#8a7860',
    buttonB: '#907c65',
    buttonX: '#968268',
    buttonY: '#9c876c',
    buttonStart: '#7d6b54',
    buttonSelect: '#75654f'
  },
  keyBindings: {
    start: 'menu',
    select: 'inventory',
    left_up: 'move_up',
    left_left: 'move_left',
    left_down: 'move_down',
    left_right: 'move_right',
    right_up: 'action_up',
    right_left: 'action_left',
    right_down: 'action_down',
    right_right: 'action_right',
    button_y: 'previous',
    button_x: 'next',
    button_b: 'interact',
    button_a: 'continue'
  }
};

/**
 * Input event type for both keyboard and touch events
 */
export enum PlayerInputEventType {
  INPUT_MENU = 'player.input.menu',
  INPUT_INVENTORY = 'player.input.inventory',
  INPUT_MOVE_UP = 'player.input.move_up',
  INPUT_MOVE_LEFT = 'player.input.move_left',
  INPUT_MOVE_DOWN = 'player.input.move_down',
  INPUT_MOVE_RIGHT = 'player.input.move_right',
  INPUT_ACTION_UP = 'player.input.action_up',
  INPUT_ACTION_LEFT = 'player.input.action_left',
  INPUT_ACTION_DOWN = 'player.input.action_down',
  INPUT_ACTION_RIGHT = 'player.input.action_right',
  INPUT_PREVIOUS = 'player.input.previous',
  INPUT_NEXT = 'player.input.next',
  INPUT_INTERACT = 'player.input.interact',
  INPUT_CONTINUE = 'player.input.continue'
}

/**
 * A mobile touch controller for on-screen controls
 */
export class MobileController {
  private static instance: MobileController;
  private eventSystem: EventSystem;
  private inputManager: InputManager;
  private config: Config;
  private controllerConfig: MobileControllerConfig;
  
  private controllerElement: HTMLDivElement | null = null;
  private leftJoystick: { base: HTMLDivElement, stick: HTMLDivElement } | null = null;
  private rightJoystick: { base: HTMLDivElement, stick: HTMLDivElement } | null = null;
  
  private isMobile: boolean = false;
  private isVisible: boolean = false;
  
  private canvasAspectRatio: number = 1;
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.inputManager = InputManager.getInstance();
    this.config = Config.getInstance();
    this.controllerConfig = { ...DEFAULT_CONTROLLER_CONFIG };
    
    // Detect mobile device
    this.detectMobileDevice();
  }
  
  /**
   * Get the MobileController instance
   */
  public static getInstance(): MobileController {
    if (!MobileController.instance) {
      MobileController.instance = new MobileController();
    }
    return MobileController.instance;
  }
  
  /**
   * Initialize the mobile controller
   */
  public initialize(): void {
    // If not on a mobile device, don't initialize
    if (!this.isMobile) return;
    
    // Get controller configuration from game config if available
    const gameConfig = this.config.config as any;
    if (gameConfig.mobileController) {
      this.controllerConfig = this.mergeConfig(this.controllerConfig, gameConfig.mobileController);
    }
    
    // Create controller element
    this.createControllerElement();
    
    // Add window resize listener to handle orientation changes
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log('Mobile controller initialized');
  }
  
  /**
   * Create the controller element and add it to the DOM
   */
  private createControllerElement(): void {
    // Find the game container
    const container = document.getElementById('game-container');
    if (!container) {
      console.error('Game container not found');
      return;
    }
    
    // Get game canvas
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Game canvas not found');
      return;
    }
    
    // Calculate canvas aspect ratio
    this.canvasAspectRatio = canvas.width / canvas.height;
    
    // Create controller element
    this.controllerElement = document.createElement('div');
    this.controllerElement.id = 'mobile-controller';
    
    // Set controller style
    const style = this.controllerElement.style;
    style.display = 'flex';
    style.flexDirection = 'row';
    style.justifyContent = 'space-between';
    style.alignItems = 'center';
    style.width = '100%';
    style.height = '33vh';
    style.backgroundColor = this.controllerConfig.colors.background;
    style.borderBottomLeftRadius = '16px';
    style.borderBottomRightRadius = '16px';
    style.padding = '10px';
    style.boxSizing = 'border-box';
    style.touchAction = 'none'; // Prevent default touch actions
    
    // Create controller sections
    const leftSection = document.createElement('div');
    leftSection.className = 'controller-section left';
    leftSection.style.position = 'relative';
    leftSection.style.width = '35%';
    leftSection.style.height = '100%';
    
    const centerSection = document.createElement('div');
    centerSection.className = 'controller-section center';
    centerSection.style.display = 'flex';
    centerSection.style.flexDirection = 'column';
    centerSection.style.justifyContent = 'center';
    centerSection.style.alignItems = 'center';
    centerSection.style.width = '30%';
    
    const rightSection = document.createElement('div');
    rightSection.className = 'controller-section right';
    rightSection.style.position = 'relative';
    rightSection.style.width = '35%';
    rightSection.style.height = '100%';
    
    // Create left joystick
    this.leftJoystick = this.createJoystick('left-joystick');
    leftSection.appendChild(this.leftJoystick.base);
    
    // Create Y and X buttons
    const buttonY = this.createButton('button-y', 'Y', this.controllerConfig.colors.buttonY);
    buttonY.style.position = 'absolute';
    buttonY.style.top = '10%';
    buttonY.style.left = '10%';
    leftSection.appendChild(buttonY);
    
    const buttonX = this.createButton('button-x', 'X', this.controllerConfig.colors.buttonX);
    buttonX.style.position = 'absolute';
    buttonX.style.top = '10%';
    buttonX.style.right = '10%';
    leftSection.appendChild(buttonX);
    
    // Create Start/Select buttons
    const buttonStart = this.createButton('button-start', 'START', this.controllerConfig.colors.buttonStart, true);
    const buttonSelect = this.createButton('button-select', 'SELECT', this.controllerConfig.colors.buttonSelect, true);
    
    centerSection.appendChild(buttonStart);
    centerSection.appendChild(document.createElement('div')).style.height = '10px';
    centerSection.appendChild(buttonSelect);
    
    // Create right joystick
    this.rightJoystick = this.createJoystick('right-joystick');
    rightSection.appendChild(this.rightJoystick.base);
    
    // Create B and A buttons
    const buttonB = this.createButton('button-b', 'B', this.controllerConfig.colors.buttonB);
    buttonB.style.position = 'absolute';
    buttonB.style.top = '10%';
    buttonB.style.left = '10%';
    rightSection.appendChild(buttonB);
    
    const buttonA = this.createButton('button-a', 'A', this.controllerConfig.colors.buttonA);
    buttonA.style.position = 'absolute';
    buttonA.style.top = '10%';
    buttonA.style.right = '10%';
    rightSection.appendChild(buttonA);
    
    // Add sections to controller
    this.controllerElement.appendChild(leftSection);
    this.controllerElement.appendChild(centerSection);
    this.controllerElement.appendChild(rightSection);
    
    // Add controller to container but keep it hidden initially
    container.appendChild(this.controllerElement);
    this.hide();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Update the canvas size to make room for controller
    this.updateCanvasSize();
  }
  
  /**
   * Create a joystick element
   */
  private createJoystick(id: string): { base: HTMLDivElement, stick: HTMLDivElement } {
    // Create base
    const base = document.createElement('div');
    base.id = id;
    base.className = 'joystick-base';
    
    // Set base style
    const baseStyle = base.style;
    baseStyle.position = 'absolute';
    baseStyle.top = '50%';
    baseStyle.left = '50%';
    baseStyle.transform = 'translate(-50%, -50%)';
    baseStyle.width = '80px';
    baseStyle.height = '80px';
    baseStyle.borderRadius = '50%';
    baseStyle.backgroundColor = this.controllerConfig.colors.joystickBase;
    baseStyle.border = '2px solid rgba(0,0,0,0.3)';
    
    // Create stick
    const stick = document.createElement('div');
    stick.className = 'joystick-stick';
    
    // Set stick style
    const stickStyle = stick.style;
    stickStyle.position = 'absolute';
    stickStyle.top = '50%';
    stickStyle.left = '50%';
    stickStyle.transform = 'translate(-50%, -50%)';
    stickStyle.width = '40px';
    stickStyle.height = '40px';
    stickStyle.borderRadius = '50%';
    stickStyle.backgroundColor = this.controllerConfig.colors.joystickStick;
    stickStyle.border = '2px solid rgba(0,0,0,0.3)';
    
    // Add stick to base
    base.appendChild(stick);
    
    return { base, stick };
  }
  
  /**
   * Create a button element
   */
  private createButton(id: string, label: string, color: string, isPill: boolean = false): HTMLDivElement {
    // Create button
    const button = document.createElement('div');
    button.id = id;
    button.className = 'controller-button';
    button.innerText = label;
    
    // Set button style
    const style = button.style;
    style.width = isPill ? '100px' : '44px';
    style.height = '44px';
    style.borderRadius = isPill ? '22px' : '50%';
    style.backgroundColor = color;
    style.color = 'white';
    style.display = 'flex';
    style.justifyContent = 'center';
    style.alignItems = 'center';
    style.fontFamily = 'Arial, sans-serif';
    style.fontSize = '14px';
    style.fontWeight = 'bold';
    style.textShadow = '1px 1px 1px rgba(0,0,0,0.5)';
    style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    style.border = '2px solid rgba(0,0,0,0.3)';
    style.userSelect = 'none';
    
    return button;
  }
  
  /**
   * Set up event handlers for the controller
   */
  private setupEventHandlers(): void {
    if (!this.controllerElement) return;
    
    // Set up joystick event handlers
    if (this.leftJoystick) {
      this.setupJoystickEvents(this.leftJoystick, 'left');
    }
    
    if (this.rightJoystick) {
      this.setupJoystickEvents(this.rightJoystick, 'right');
    }
    
    // Set up button event handlers
    const buttons = this.controllerElement.querySelectorAll('.controller-button');
    buttons.forEach(button => {
      button.addEventListener('touchstart', (event) => {
        event.preventDefault();
        this.handleButtonEvent(button.id, 'down');
        
        // Add active state
        (button as HTMLElement).style.transform = 'scale(0.95)';
        (button as HTMLElement).style.backgroundColor = this.darkenColor((button as HTMLElement).style.backgroundColor, 10);
      });
      
      button.addEventListener('touchend', (event) => {
        event.preventDefault();
        this.handleButtonEvent(button.id, 'up');
        
        // Remove active state
        (button as HTMLElement).style.transform = 'scale(1)';
        (button as HTMLElement).style.backgroundColor = this.getButtonDefaultColor(button.id);
      });
      
      // Prevent default on touchmove
      button.addEventListener('touchmove', (event) => {
        event.preventDefault();
      });
    });
  }
  
  /**
   * Set up joystick event handlers
   */
  private setupJoystickEvents(joystick: { base: HTMLDivElement, stick: HTMLDivElement }, type: string): void {
    const base = joystick.base;
    const stick = joystick.stick;
    
    let isActive = false;
    let touchId: number | null = null;
    let centerX: number;
    let centerY: number;
    let maxDistance: number;
    
    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      
      if (!isActive) {
        // Get the first touch on this joystick
        const touch = event.touches[0];
        touchId = touch.identifier;
        
        // Get base dimensions and position
        const rect = base.getBoundingClientRect();
        centerX = rect.width / 2;
        centerY = rect.height / 2;
        maxDistance = rect.width / 2 - stick.clientWidth / 2;
        
        isActive = true;
        
        // Update the joystick position
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        updateJoystickPosition(x, y);
      }
    };
    
    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      
      if (isActive && touchId !== null) {
        // Find the touch that started on this joystick
        let foundTouch = false;
        for (let i = 0; i < event.touches.length; i++) {
          const touch = event.touches[i];
          if (touch.identifier === touchId) {
            const rect = base.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            updateJoystickPosition(x, y);
            foundTouch = true;
            break;
          }
        }
        
        // If touch not found, reset joystick
        if (!foundTouch) {
          resetJoystick();
        }
      }
    };
    
    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      
      if (isActive && touchId !== null) {
        // Check if the touch that ended was the one for this joystick
        let touchEnded = true;
        for (let i = 0; i < event.touches.length; i++) {
          if (event.touches[i].identifier === touchId) {
            touchEnded = false;
            break;
          }
        }
        
        // If the touch ended, reset the joystick
        if (touchEnded) {
          resetJoystick();
        }
      }
    };
    
    const updateJoystickPosition = (x: number, y: number) => {
      // Calculate distance from center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Normalize if distance is greater than max
      const limitedDistance = Math.min(distance, maxDistance);
      const angle = Math.atan2(dy, dx);
      
      // Calculate new position
      const newX = centerX + limitedDistance * Math.cos(angle);
      const newY = centerY + limitedDistance * Math.sin(angle);
      
      // Update stick position
      stick.style.left = `${newX}px`;
      stick.style.top = `${newY}px`;
      
      // Trigger direction events based on angle
      this.handleJoystickDirection(type, angle, limitedDistance / maxDistance);
    };
    
    const resetJoystick = () => {
      // Reset stick position
      stick.style.left = '50%';
      stick.style.top = '50%';
      stick.style.transform = 'translate(-50%, -50%)';
      
      // Reset state
      isActive = false;
      touchId = null;
      
      // Trigger release events
      this.handleJoystickRelease(type);
    };
    
    // Add event listeners
    base.addEventListener('touchstart', handleTouchStart);
    base.addEventListener('touchmove', handleTouchMove);
    base.addEventListener('touchend', handleTouchEnd);
    base.addEventListener('touchcancel', handleTouchEnd);
  }
  
  /**
   * Handle joystick direction events
   */
  private handleJoystickDirection(type: string, angle: number, magnitude: number): void {
    // Only trigger events if magnitude is above threshold
    if (magnitude < 0.1) return;
    
    // Convert angle to degrees and normalize to 0-360 range
    let degrees = (angle * 180 / Math.PI + 360) % 360;
    
    // Define direction quadrants (up, right, down, left)
    const directions = ['right', 'down', 'left', 'up'];
    
    // Calculate direction index (0-3)
    const directionIndex = Math.floor(((degrees + 45) % 360) / 90);
    const direction = directions[directionIndex];
    
    // Trigger the corresponding direction event
    const eventType = `${type}_${direction}`;
    this.triggerControlEvent(eventType);
  }
  
  /**
   * Handle joystick release events
   */
  private handleJoystickRelease(type: string): void {
    // Trigger release events for all directions
    this.releaseControlEvent(`${type}_up`);
    this.releaseControlEvent(`${type}_right`);
    this.releaseControlEvent(`${type}_down`);
    this.releaseControlEvent(`${type}_left`);
  }
  
  /**
   * Handle button events
   */
  private handleButtonEvent(buttonId: string, state: string): void {
    // Map button ID to event type
    const buttonToEvent: { [key: string]: string } = {
      'button-a': 'button_a',
      'button-b': 'button_b',
      'button-x': 'button_x',
      'button-y': 'button_y',
      'button-start': 'start',
      'button-select': 'select'
    };
    
    const eventType = buttonToEvent[buttonId];
    if (!eventType) return;
    
    if (state === 'down') {
      this.triggerControlEvent(eventType);
    } else {
      this.releaseControlEvent(eventType);
    }
  }
  
  /**
   * Trigger a control event (for key down)
   */
  private triggerControlEvent(control: string): void {
    // Get action from key bindings
    const action = this.controllerConfig.keyBindings[control];
    if (!action) return;
    
    // Map action to player input event
    const actionToEvent: { [key: string]: PlayerInputEventType } = {
      'menu': PlayerInputEventType.INPUT_MENU,
      'inventory': PlayerInputEventType.INPUT_INVENTORY,
      'move_up': PlayerInputEventType.INPUT_MOVE_UP,
      'move_left': PlayerInputEventType.INPUT_MOVE_LEFT,
      'move_down': PlayerInputEventType.INPUT_MOVE_DOWN,
      'move_right': PlayerInputEventType.INPUT_MOVE_RIGHT,
      'action_up': PlayerInputEventType.INPUT_ACTION_UP,
      'action_left': PlayerInputEventType.INPUT_ACTION_LEFT,
      'action_down': PlayerInputEventType.INPUT_ACTION_DOWN,
      'action_right': PlayerInputEventType.INPUT_ACTION_RIGHT,
      'previous': PlayerInputEventType.INPUT_PREVIOUS,
      'next': PlayerInputEventType.INPUT_NEXT,
      'interact': PlayerInputEventType.INPUT_INTERACT,
      'continue': PlayerInputEventType.INPUT_CONTINUE
    };
    
    const eventType = actionToEvent[action];
    if (eventType) {
      this.eventSystem.publish(eventType, { source: 'touch', control });
    }
  }
  
  /**
   * Release a control event (for key up)
   */
  private releaseControlEvent(control: string): void {
    // Similar to triggerControlEvent but for key up
    // Could add specific release events in the future if needed
  }
  
  /**
   * Show the controller
   */
  public show(): void {
    if (!this.controllerElement || !this.isMobile) return;
    
    this.controllerElement.style.display = 'flex';
    this.isVisible = true;
    
    // Update canvas size
    this.updateCanvasSize();
  }
  
  /**
   * Hide the controller
   */
  public hide(): void {
    if (!this.controllerElement) return;
    
    this.controllerElement.style.display = 'none';
    this.isVisible = false;
    
    // Update canvas size
    this.updateCanvasSize();
  }
  
  /**
   * Toggle controller visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Update the canvas size to make room for controller
   */
  private updateCanvasSize(): void {
    // Find the game container and canvas
    const container = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    
    if (!container || !canvas) return;
    
    // If controller is visible, resize canvas
    if (this.isVisible) {
      // Make canvas take up 2/3 of container height
      canvas.style.height = '66vh';
      canvas.style.width = 'auto';
      
      // Ensure canvas maintains aspect ratio
      const canvasHeight = parseFloat(canvas.style.height);
      canvas.style.width = `${canvasHeight * this.canvasAspectRatio}px`;
    } else {
      // Reset canvas to original size
      canvas.style.height = 'min(100vw, 100vh)';
      canvas.style.width = 'min(100vw, 100vh)';
    }
  }
  
  /**
   * Handle window resize event
   */
  private handleResize(): void {
    if (this.isVisible) {
      this.updateCanvasSize();
    }
  }
  
  /**
   * Helper method to darken a color by a percentage
   */
  private darkenColor(color: string, percent: number): string {
    // Parse the color string to get RGB components
    let r, g, b;
    
    if (color.startsWith('#')) {
      // Handle hex color
      const hex = color.substring(1);
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      // Handle rgb(a) color
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (match) {
        r = parseInt(match[1]);
        g = parseInt(match[2]);
        b = parseInt(match[3]);
      } else {
        return color;
      }
    } else {
      return color;
    }
    
    // Darken the color
    r = Math.max(0, Math.floor(r * (100 - percent) / 100));
    g = Math.max(0, Math.floor(g * (100 - percent) / 100));
    b = Math.max(0, Math.floor(b * (100 - percent) / 100));
    
    // Convert back to hex
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  }
  
  /**
   * Get the default color for a button
   */
  private getButtonDefaultColor(buttonId: string): string {
    switch (buttonId) {
      case 'button-a': return this.controllerConfig.colors.buttonA;
      case 'button-b': return this.controllerConfig.colors.buttonB;
      case 'button-x': return this.controllerConfig.colors.buttonX;
      case 'button-y': return this.controllerConfig.colors.buttonY;
      case 'button-start': return this.controllerConfig.colors.buttonStart;
      case 'button-select': return this.controllerConfig.colors.buttonSelect;
      default: return '#806850';
    }
  }
  
  /**
   * Helper method to merge configurations
   */
  private mergeConfig(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeConfig(
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
   * Detect if the device is mobile
   */
  private detectMobileDevice(): void {
    // Simple mobile detection using regex
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    // Also check for touch capabilities
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.isMobile = true;
    }
    
    console.log('Mobile device detected:', this.isMobile);
  }
  
  /**
   * Check if the device is mobile
   */
  public isMobileDevice(): boolean {
    return this.isMobile;
  }
  
  /**
   * Is controller visible
   */
  public isControllerVisible(): boolean {
    return this.isVisible;
  }
} 
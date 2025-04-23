import { EventSystem } from '../events/EventSystem';
import { InputManager, InputEventType } from './InputManager';
import { GameInputEventType, GameInputEventData } from './GameInputEvents';
import { Config } from '../Config';

/**
 * Mobile controller input type
 */
export enum MobileInputType {
  JOYSTICK_LEFT_UP = 'joystick_left_up',
  JOYSTICK_LEFT_DOWN = 'joystick_left_down',
  JOYSTICK_LEFT_LEFT = 'joystick_left_left',
  JOYSTICK_LEFT_RIGHT = 'joystick_left_right',
  JOYSTICK_RIGHT_UP = 'joystick_right_up',
  JOYSTICK_RIGHT_DOWN = 'joystick_right_down',
  JOYSTICK_RIGHT_LEFT = 'joystick_right_left',
  JOYSTICK_RIGHT_RIGHT = 'joystick_right_right',
  BUTTON_A = 'button_a',
  BUTTON_B = 'button_b',
  BUTTON_X = 'button_x',
  BUTTON_Y = 'button_y',
  BUTTON_SELECT = 'button_select',
  BUTTON_START = 'button_start'
}

/**
 * Mapping between mobile controller inputs and game actions
 */
export const DEFAULT_MOBILE_MAPPING: Record<string, MobileInputType> = {
  menu: MobileInputType.BUTTON_START,
  inventory: MobileInputType.BUTTON_SELECT,
  move_up: MobileInputType.JOYSTICK_LEFT_UP,
  move_down: MobileInputType.JOYSTICK_LEFT_DOWN,
  move_left: MobileInputType.JOYSTICK_LEFT_LEFT,
  move_right: MobileInputType.JOYSTICK_LEFT_RIGHT,
  action_up: MobileInputType.JOYSTICK_RIGHT_UP,
  action_down: MobileInputType.JOYSTICK_RIGHT_DOWN,
  action_left: MobileInputType.JOYSTICK_RIGHT_LEFT,
  action_right: MobileInputType.JOYSTICK_RIGHT_RIGHT,
  previous: MobileInputType.BUTTON_Y,
  next: MobileInputType.BUTTON_X,
  interact: MobileInputType.BUTTON_B,
  continue: MobileInputType.BUTTON_A
};

/**
 * Mapping between game actions and event types
 */
const ACTION_TO_EVENT: Record<string, GameInputEventType> = {
  menu: GameInputEventType.MENU,
  inventory: GameInputEventType.INVENTORY,
  move_up: GameInputEventType.MOVE_UP,
  move_down: GameInputEventType.MOVE_DOWN,
  move_left: GameInputEventType.MOVE_LEFT,
  move_right: GameInputEventType.MOVE_RIGHT,
  action_up: GameInputEventType.ACTION_UP,
  action_down: GameInputEventType.ACTION_DOWN,
  action_left: GameInputEventType.ACTION_LEFT,
  action_right: GameInputEventType.ACTION_RIGHT,
  previous: GameInputEventType.PREVIOUS,
  next: GameInputEventType.NEXT,
  interact: GameInputEventType.INTERACT,
  continue: GameInputEventType.CONTINUE
};

/**
 * InputMapper - Maps keyboard and mobile controller inputs to game actions
 */
export class InputMapper {
  private static instance: InputMapper;
  private eventSystem: EventSystem;
  private inputManager: InputManager;
  
  // Map key names to actions
  private keyToAction: Map<string, string> = new Map();
  
  // Map mobile inputs to actions
  private mobileToAction: Map<MobileInputType, string> = new Map();
  
  // Track current state of actions (pressed or not)
  private actionState: Map<string, boolean> = new Map();
  
  // Previous state of keys to detect changes
  private previousKeyState: Map<string, boolean> = new Map();
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.inputManager = InputManager.getInstance();
  }
  
  /**
   * Get the InputMapper instance
   */
  public static getInstance(): InputMapper {
    if (!InputMapper.instance) {
      InputMapper.instance = new InputMapper();
    }
    return InputMapper.instance;
  }
  
  /**
   * Initialize the input mapper
   */
  public initialize(): void {
    this.loadKeyBindings();
    this.setupMobileBindings();
    this.setupKeyboardListeners();
    
    console.log('Input mapper initialized');
  }
  
  /**
   * Load key bindings from configuration
   */
  private loadKeyBindings(): void {
    const config = Config.getInstance();
    const keyBindings = config.config.input?.keyBindings;
    
    if (keyBindings) {
      // Clear existing bindings
      this.keyToAction.clear();
      
      // Load bindings from config
      Object.entries(keyBindings).forEach(([action, key]) => {
        this.keyToAction.set(key.toLowerCase(), action);
      });
      
      console.log('Key bindings loaded:', this.keyToAction);
    } else {
      console.warn('No key bindings found in config');
    }
  }
  
  /**
   * Setup mobile controller bindings
   */
  private setupMobileBindings(): void {
    // Clear existing bindings
    this.mobileToAction.clear();
    
    // Set up default mobile bindings
    Object.entries(DEFAULT_MOBILE_MAPPING).forEach(([action, mobileInput]) => {
      this.mobileToAction.set(mobileInput, action);
    });
    
    console.log('Mobile controller bindings configured');
  }
  
  /**
   * Set up keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    // Subscribe to key down and up events
    this.eventSystem.subscribe(InputEventType.KEY_DOWN, this.handleKeyDown.bind(this));
    this.eventSystem.subscribe(InputEventType.KEY_UP, this.handleKeyUp.bind(this));
    
    console.log('Keyboard listeners set up');
  }
  
  /**
   * Handle key down event
   */
  private handleKeyDown(data: { key: string, repeat: boolean }): void {
    const key = data.key.toLowerCase();
    const action = this.keyToAction.get(key);
    
    // Ignore auto-repeat key events
    if (data.repeat) {
      return;
    }
    
    if (action) {
      this.triggerGameAction(action, 'keyboard', true, data.repeat);
    }
  }
  
  /**
   * Handle key up event
   */
  private handleKeyUp(data: { key: string }): void {
    const key = data.key.toLowerCase();
    const action = this.keyToAction.get(key);
    
    if (action) {
      this.triggerGameAction(action, 'keyboard', false);
    }
  }
  
  /**
   * Handle mobile controller input
   * This will be implemented when the mobile controller is wired up
   */
  public handleMobileInput(inputType: MobileInputType, pressed: boolean): void {
    const action = this.mobileToAction.get(inputType);
    
    if (action) {
      this.triggerGameAction(action, 'mobile', pressed);
    }
  }
  
  /**
   * Trigger a game action event
   */
  private triggerGameAction(action: string, source: 'keyboard' | 'mobile', pressed: boolean, repeat: boolean = false): void {
    // Get the corresponding event type
    const eventType = ACTION_TO_EVENT[action];
    
    if (!eventType) {
      console.warn(`No event type found for action: ${action}`);
      return;
    }
    
    // Update action state
    this.actionState.set(action, pressed);
    
    // Create event data
    const eventData: GameInputEventData = {
      action,
      source,
      pressed,
      repeat
    };
    
    // Publish event
    this.eventSystem.publish(eventType, eventData);
    
    if (Config.getInstance().debug) {
      console.log(`Game action triggered: ${action}`, eventData);
    }
  }
  
  /**
   * Check if an action is currently active (pressed)
   */
  public isActionActive(action: string): boolean {
    return this.actionState.get(action) || false;
  }
  
  /**
   * Update method to be called each frame
   * This detects held keys and continuous inputs
   */
  public update(): void {
    // We're now handling key states via events rather than polling
    // to avoid auto-repeat, so this update loop is simplified
    
    // For continuous analog inputs like joysticks, we'd still
    // process those here, but we're not implementing that for keyboard
    
    // Mobile controller update will be implemented later
  }
} 
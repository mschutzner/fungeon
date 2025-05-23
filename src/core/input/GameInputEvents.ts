/**
 * Game input events
 */
export enum GameInputEventType {
  // Movement
  MOVE_UP = 'game.input.move.up',
  MOVE_DOWN = 'game.input.move.down',
  MOVE_LEFT = 'game.input.move.left',
  MOVE_RIGHT = 'game.input.move.right',
  
  // Actions
  D_UP = 'game.input.d_up',
  D_DOWN = 'game.input.d_down',
  D_LEFT = 'game.input.d_left',
  D_RIGHT = 'game.input.d_right',
  
  // Navigation
  MENU = 'game.input.menu',
  INVENTORY = 'game.input.inventory',
  MINUS = 'game.input.minus',
  PLUS = 'game.input.plus',
  
  // Interaction
  INTERACT = 'game.input.interact',
  CONTINUE = 'game.input.continue'
}

/**
 * Game action event data
 */
export interface GameInputEventData {
  action: string;
  source: 'keyboard' | 'mobile';
  pressed: boolean;
  repeat?: boolean; // Indicates if this is a repeat event from holding a key
  // Additional data like analog values for joysticks could be added here
} 
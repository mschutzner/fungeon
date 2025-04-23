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
  ACTION_UP = 'game.input.action.up',
  ACTION_DOWN = 'game.input.action.down',
  ACTION_LEFT = 'game.input.action.left',
  ACTION_RIGHT = 'game.input.action.right',
  
  // Navigation
  MENU = 'game.input.menu',
  INVENTORY = 'game.input.inventory',
  PREVIOUS = 'game.input.previous',
  NEXT = 'game.input.next',
  
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
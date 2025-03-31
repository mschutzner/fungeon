import { Renderer } from '../../rendering/Renderer';

/**
 * Base State class for all game states
 */
export abstract class State {
  protected name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  /**
   * Called when the state is entered
   */
  abstract enter(): Promise<void>;
  
  /**
   * Called when the state is exited
   */
  abstract exit(): Promise<void>;
  
  /**
   * Update state logic
   * @param deltaTime Time since last frame in seconds
   */
  abstract update(deltaTime: number): void;
  
  /**
   * Setup any rendering related data (scenes, UI, etc)
   * @param renderer The renderer instance
   */
  abstract setupRenderingData(renderer: Renderer): void;
  
  /**
   * Get the state name
   */
  getName(): string {
    return this.name;
  }
} 
import { System } from '../System';
import { AnimationComponent } from '../components/AnimationComponent';

/**
 * System that updates all animation components
 * Uses the render callback to ensure smooth animations at display refresh rate
 */
export class AnimationSystem extends System {
  /**
   * Constructor
   * @param priority System priority (higher priority systems are updated first)
   */
  constructor(priority: number = 0) {
    super(priority);
  }

  /**
   * Update all animation components at fixed timestep
   * This is intentionally empty as animations are updated in the render method
   * @param deltaTime Time elapsed since last update in seconds
   */
  protected override onUpdate(deltaTime: number): void {
    // Animation updates are handled in onRender for smoother animations
  }
  
  /**
   * Update all animation components at display refresh rate
   * Using the render callback ensures smoother animations
   * @param deltaTime Time elapsed since last render in seconds
   */
  protected override onRender(deltaTime: number): void {
    // Query for all entities with animation components
    const entities = this.query(AnimationComponent);
    
    // Update each animation
    for (const entity of entities) {
      const animation = entity.getComponent(AnimationComponent);
      if (animation) {
        animation.update(deltaTime);
      }
    }
  }
  
  /**
   * Clean up when system is removed
   */
  protected override onCleanup(): void {
    // No specific cleanup needed for now
  }
} 
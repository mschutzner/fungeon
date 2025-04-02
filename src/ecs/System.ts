import { Component, ComponentClass, IEntity, ISystem, IWorld } from './types';

/**
 * Base class for all systems
 * Systems contain the logic that operates on entities with specific components
 */
export abstract class System implements ISystem {
  /**
   * Unique identifier for this system
   */
  public readonly id: number;
  
  /**
   * Priority of this system (higher priority systems are updated first)
   */
  public readonly priority: number;
  
  /**
   * Whether this system is enabled
   */
  public enabled: boolean = true;
  
  /**
   * World this system belongs to
   */
  protected world: IWorld | null = null;
  
  /**
   * Static counter for system IDs
   */
  private static nextId: number = 1;
  
  /**
   * Constructor
   * @param priority Priority of this system (higher priority systems are updated first)
   */
  constructor(priority: number = 0) {
    this.id = System.nextId++;
    this.priority = priority;
  }
  
  /**
   * Initialize the system
   * @param world The world this system belongs to
   */
  public initialize(world: IWorld): void {
    this.world = world;
    this.onInitialize();
  }
  
  /**
   * Called when the system is initialized
   * Override this in derived systems
   */
  protected onInitialize(): void {
    // Base implementation does nothing
  }
  
  /**
   * Update the system
   * @param deltaTime Time since the last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.enabled || !this.world) return;
    this.onUpdate(deltaTime);
  }
  
  /**
   * Called when the system is updated
   * Override this in derived systems
   * @param deltaTime Time since the last update in seconds
   */
  protected abstract onUpdate(deltaTime: number): void;
  
  /**
   * Clean up the system when it's removed from the world
   */
  public cleanup(): void {
    this.onCleanup();
    this.world = null;
  }
  
  /**
   * Called when the system is cleaned up
   * Override this in derived systems
   */
  protected onCleanup(): void {
    // Base implementation does nothing
  }
  
  /**
   * Query for entities with specific components
   * @param componentClasses The component classes to query for
   * @returns An array of entities with all the specified components
   */
  protected query<T extends Component>(...componentClasses: ComponentClass<T>[]): IEntity[] {
    if (!this.world) return [];
    return this.world.query(...componentClasses);
  }
} 
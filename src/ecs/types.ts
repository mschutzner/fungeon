/**
 * Type for component constructors
 */
export interface ComponentClass<T = Component> {
  new (...args: any[]): T;
  
  /**
   * Static method to define required component dependencies
   * @returns Array of component classes that are required
   */
  getRequirements?(): ComponentClass<Component>[];
}

/**
 * Interface for unique identifiers
 */
export interface IUniqueId {
  readonly id: number;
}

/**
 * Interface for serializable objects
 */
export interface ISerializable {
  serialize(): unknown;
  deserialize(data: unknown): void;
}

/**
 * Base Component interface
 * Components are pure data containers
 */
export interface Component extends ISerializable {
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  onAttach?(entity: IEntity): void;
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  onDetach?(entity: IEntity): void;
  
  /**
   * Called when the component's entity is activated
   */
  onActivate?(): void;
  
  /**
   * Called when the component's entity is deactivated
   */
  onDeactivate?(): void;
}

/**
 * Entity interface
 */
export interface IEntity extends IUniqueId, ISerializable {
  /**
   * Whether the entity is active
   */
  active: boolean;
  
  /**
   * Name of the entity (optional)
   */
  name?: string;
  
  /**
   * Get the world this entity belongs to
   */
  readonly world: IWorld;
  
  /**
   * Check if the entity has a component of the given type
   * @param componentClass The component class to check for
   */
  hasComponent<T extends Component>(componentClass: ComponentClass<T>): boolean;
  
  /**
   * Get a component of the given type
   * @param componentClass The component class to get
   */
  getComponent<T extends Component>(componentClass: ComponentClass<T>): T | null;
  
  /**
   * Get all components of the given type
   * @param componentClass The component class to get
   */
  getComponents<T extends Component>(componentClass: ComponentClass<T>): T[];
  
  /**
   * Get all components on this entity
   */
  getAllComponents(): Component[];
  
  /**
   * Add a component to this entity
   * @param component The component to add
   */
  addComponent<T extends Component>(component: T): this;
  
  /**
   * Add multiple components to this entity
   * @param components The components to add
   */
  addComponents(components: Component[]): this;
  
  /**
   * Remove a component of the given type
   * @param componentClass The component class to remove
   */
  removeComponent<T extends Component>(componentClass: ComponentClass<T>): boolean;
  
  /**
   * Remove all components of the given type
   * @param componentClass The component class to remove
   */
  removeComponents<T extends Component>(componentClass: ComponentClass<T>): number;
  
  /**
   * Remove all components from this entity
   */
  removeAllComponents(): void;
  
  /**
   * Activate this entity
   */
  activate(): void;
  
  /**
   * Deactivate this entity
   */
  deactivate(): void;
  
  /**
   * Destroy this entity, removing it from the world
   */
  destroy(): void;
}

/**
 * System interface
 * Systems contain the logic that operates on entities with specific components
 */
export interface ISystem extends IUniqueId {
  /**
   * Priority of this system (higher priority systems are updated first)
   */
  readonly priority: number;
  
  /**
   * Whether this system is enabled
   */
  enabled: boolean;
  
  /**
   * Initialize the system
   * @param world The world this system belongs to
   */
  initialize(world: IWorld): void;
  
  /**
   * Update the system
   * @param deltaTime Time since the last update in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Clean up the system when it's removed from the world
   */
  cleanup(): void;
}

/**
 * World interface
 * The World manages entities, components, and systems
 */
export interface IWorld extends ISerializable {
  /**
   * Create a new entity
   * @param name Optional name for the entity
   */
  createEntity(name?: string): IEntity;
  
  /**
   * Get an entity by ID
   * @param id The entity ID
   */
  getEntity(id: number): IEntity | null;
  
  /**
   * Get an entity by name
   * @param name The entity name
   */
  getEntityByName(name: string): IEntity | null;
  
  /**
   * Get all entities
   */
  getAllEntities(): IEntity[];
  
  /**
   * Get all active entities
   */
  getActiveEntities(): IEntity[];
  
  /**
   * Destroy an entity
   * @param entity The entity to destroy
   */
  destroyEntity(entity: IEntity | number): boolean;
  
  /**
   * Register a system
   * @param system The system to register
   */
  registerSystem(system: ISystem): this;
  
  /**
   * Unregister a system
   * @param system The system to unregister
   */
  unregisterSystem(system: ISystem | number): boolean;
  
  /**
   * Get a system by type
   * @param systemClass The system class to get
   */
  getSystem<T extends ISystem>(systemClass: new (...args: any[]) => T): T | null;
  
  /**
   * Update all systems
   * @param deltaTime Time since the last update in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Query for entities with specific components
   * @param componentClasses The component classes to query for
   */
  query<T extends Component>(...componentClasses: ComponentClass<T>[]): IEntity[];
  
  /**
   * Clear all entities and systems
   */
  clear(): void;
}

/**
 * Interface for prefab templates 
 */
export interface IPrefab extends ISerializable {
  /**
   * Name of the prefab
   */
  readonly name: string;
  
  /**
   * Create an entity from this prefab
   * @param world The world to create the entity in
   */
  instantiate(world: IWorld): IEntity;
}

/**
 * Interface for prefab libraries
 */
export interface IPrefabLibrary {
  /**
   * Register a prefab
   * @param prefab The prefab to register
   */
  registerPrefab(prefab: IPrefab): void;
  
  /**
   * Get a prefab by name
   * @param name The prefab name
   */
  getPrefab(name: string): IPrefab | null;
  
  /**
   * Create an entity from a prefab
   * @param prefabName The prefab name
   * @param world The world to create the entity in
   */
  instantiate(prefabName: string, world: IWorld): IEntity | null;
} 
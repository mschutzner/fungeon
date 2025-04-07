import { BaseComponent } from './Component';
import { Component, ComponentClass, IEntity, IWorld } from './types';

/**
 * Entity implementation
 * An entity is a container for components
 */
export class Entity implements IEntity {
  /**
   * Unique identifier for this entity
   */
  public readonly id: number;
  
  /**
   * Whether this entity is active
   */
  private _active: boolean = true;
  
  /**
   * Name of this entity (optional)
   */
  public name?: string;
  
  /**
   * Components on this entity
   */
  private components: Map<Function, Component[]> = new Map();
  
  /**
   * World this entity belongs to
   */
  private _world: IWorld | null;
  
  /**
   * Static counter for entity IDs
   */
  private static nextId: number = 1;
  
  /**
   * Constructor
   * @param world The world this entity belongs to
   * @param name Optional name for the entity
   */
  constructor(world: IWorld | null, name?: string) {
    this.id = Entity.nextId++;
    this._world = world;
    this.name = name;
  }
  
  /**
   * Get the world this entity belongs to
   */
  public get world(): IWorld | null {
    return this._world;
  }
  
  /**
   * Set the world this entity belongs to
   * @param world The world this entity should belong to
   * @internal Used by World.addEntity and World.removeEntity
   */
  public _setWorld(world: IWorld | null): void {
    this._world = world;
  }
  
  /**
   * Get whether this entity is active
   */
  public get active(): boolean {
    return this._active;
  }
  
  /**
   * Set whether this entity is active
   */
  public set active(value: boolean) {
    if (this._active === value) return;
    
    this._active = value;
    
    // Call lifecycle hooks on components
    if (value) {
      this.getAllComponents().forEach(component => {
        if (component.onActivate) {
          component.onActivate();
        }
      });
    } else {
      this.getAllComponents().forEach(component => {
        if (component.onDeactivate) {
          component.onDeactivate();
        }
      });
    }
  }
  
  /**
   * Check if this entity has a component of the given type
   * @param componentClass The component class to check for
   */
  public hasComponent<T extends Component>(componentClass: ComponentClass<T>): boolean {
    const components = this.components.get(componentClass);
    return !!components && components.length > 0;
  }
  
  /**
   * Get a component of the given type
   * @param componentClass The component class to get
   * @returns The first component of the given type, or null if none exists
   */
  public getComponent<T extends Component>(componentClass: ComponentClass<T>): T | null {
    const components = this.components.get(componentClass);
    return (components && components.length > 0) ? components[0] as T : null;
  }
  
  /**
   * Get all components of the given type
   * @param componentClass The component class to get
   * @returns An array of components of the given type
   */
  public getComponents<T extends Component>(componentClass: ComponentClass<T>): T[] {
    const components = this.components.get(componentClass);
    return components ? components.map(c => c as T) : [];
  }
  
  /**
   * Get all components on this entity
   * @returns An array of all components
   */
  public getAllComponents(): Component[] {
    const result: Component[] = [];
    this.components.forEach(componentArray => {
      result.push(...componentArray);
    });
    return result;
  }
  
  /**
   * Add a component to this entity
   * @param component The component to add
   * @returns This entity for method chaining
   * @throws Error if required components are missing and strict mode is enabled
   */
  public addComponent<T extends Component>(component: T): this {
    const componentClass = component.constructor as ComponentClass;
    
    // Check for component requirements if it's a BaseComponent
    if (component instanceof BaseComponent) {
      // Validate component dependencies (warning only for now)
      if (!component.validateRequirements(this)) {
        // In Phase 3, we only log warnings but don't enforce yet
        const missingComponents = component.getMissingRequirements(this);
        console.warn(`Entity is missing required components for ${componentClass.name}: ${missingComponents.join(', ')}`);
        // In a future phase, we'll enable strict validation:
        // throw new Error(`Cannot add ${componentClass.name} to entity - missing required components: ${missingComponents.join(', ')}`);
      }
    }
    
    // Get or create the component array for this type
    let components = this.components.get(componentClass);
    if (!components) {
      components = [];
      this.components.set(componentClass, components);
    }
    
    // Add the component
    components.push(component);
    
    // Set the entity reference if it's a BaseComponent
    if (component instanceof BaseComponent) {
      component._setEntity(this);
    }
    
    // Call the onAttach lifecycle hook
    if (component.onAttach) {
      component.onAttach(this);
    }
    
    // If the entity is active, call the onActivate lifecycle hook
    if (this._active && component.onActivate) {
      component.onActivate();
    }
    
    return this;
  }
  
  /**
   * Add multiple components to this entity
   * @param components The components to add
   * @returns This entity for method chaining
   */
  public addComponents(components: Component[]): this {
    components.forEach(component => this.addComponent(component));
    return this;
  }
  
  /**
   * Remove a component of the given type
   * @param componentClass The component class to remove
   * @returns True if a component was removed, false otherwise
   */
  public removeComponent<T extends Component>(componentClass: ComponentClass<T>): boolean {
    const components = this.components.get(componentClass);
    if (!components || components.length === 0) return false;
    
    // Get the first component
    const component = components[0];
    
    // Call the onDetach lifecycle hook
    if (component.onDetach) {
      component.onDetach(this);
    }
    
    // Remove the entity reference if it's a BaseComponent
    if (component instanceof BaseComponent) {
      component._setEntity(null);
    }
    
    // Remove the component
    components.splice(0, 1);
    
    // If there are no more components of this type, remove the array
    if (components.length === 0) {
      this.components.delete(componentClass);
    }
    
    return true;
  }
  
  /**
   * Remove all components of the given type
   * @param componentClass The component class to remove
   * @returns The number of components removed
   */
  public removeComponents<T extends Component>(componentClass: ComponentClass<T>): number {
    const components = this.components.get(componentClass);
    if (!components || components.length === 0) return 0;
    
    const count = components.length;
    
    // Call lifecycle hooks and clean up
    components.forEach(component => {
      if (component.onDetach) {
        component.onDetach(this);
      }
      
      if (component instanceof BaseComponent) {
        component._setEntity(null);
      }
    });
    
    // Remove the components
    this.components.delete(componentClass);
    
    return count;
  }
  
  /**
   * Remove all components from this entity
   */
  public removeAllComponents(): void {
    // Call lifecycle hooks and clean up for all components
    this.getAllComponents().forEach(component => {
      if (component.onDetach) {
        component.onDetach(this);
      }
      
      if (component instanceof BaseComponent) {
        component._setEntity(null);
      }
    });
    
    // Clear the components map
    this.components.clear();
  }
  
  /**
   * Activate this entity
   */
  public activate(): void {
    this.active = true;
  }
  
  /**
   * Deactivate this entity
   */
  public deactivate(): void {
    this.active = false;
  }
  
  /**
   * Destroy this entity, removing it from the world
   */
  public destroy(): void {
    if (this._world) {
      this._world.destroyEntity(this);
    } else {
      console.warn(`Cannot destroy entity ${this.id} - not in a world`);
    }
  }
  
  /**
   * Serialize this entity to a plain object
   * @returns A plain object representation of this entity
   */
  public serialize(): unknown {
    const componentData: Record<string, unknown> = {};
    
    // Serialize each component
    this.components.forEach((components, componentClass) => {
      const className = componentClass.name;
      
      if (!componentData[className]) {
        componentData[className] = [];
      }
      
      // Serialize each component of this type
      components.forEach(component => {
        (componentData[className] as unknown[]).push(component.serialize());
      });
    });
    
    return {
      id: this.id,
      name: this.name,
      active: this._active,
      components: componentData
    };
  }
  
  /**
   * Deserialize this entity from a plain object
   * @param data The data to deserialize from
   */
  public deserialize(data: unknown): void {
    // Clear existing components
    this.removeAllComponents();
    
    if (typeof data !== 'object' || data === null) return;
    
    const entityData = data as Record<string, unknown>;
    
    // Set properties
    if (typeof entityData.name === 'string') {
      this.name = entityData.name;
    }
    
    if (typeof entityData.active === 'boolean') {
      this._active = entityData.active;
    }
    
    // Components will be added by the World after deserialization
  }
} 
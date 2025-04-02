import { Component, ComponentClass, IEntity } from './types';

/**
 * Base class for all components
 * Components are pure data containers with optional lifecycle hooks
 */
export abstract class BaseComponent implements Component {
  /**
   * Entity this component is attached to
   * @internal Set by Entity.addComponent
   */
  private _entity: IEntity | null = null;
  
  /**
   * Get the entity this component is attached to
   */
  public get entity(): IEntity | null {
    return this._entity;
  }
  
  /**
   * Set the entity this component is attached to
   * @internal Used by Entity.addComponent
   */
  public _setEntity(entity: IEntity | null): void {
    this._entity = entity;
  }
  
  /**
   * Static method to define required component dependencies
   * @returns Array of component classes that are required
   */
  public static getRequirements(): ComponentClass[] {
    return [];
  }
  
  /**
   * Check if this component has all its dependencies
   * @param entity The entity to check against
   * @returns Whether all dependencies are met
   */
  public validateRequirements(entity: IEntity): boolean {
    // Get the constructor of this component instance
    const componentClass = this.constructor as ComponentClass;
    
    // Get required components
    const requirements = (componentClass.getRequirements && typeof componentClass.getRequirements === 'function')
      ? componentClass.getRequirements()
      : [];
    
    // Check if all requirements are met
    for (const requiredComponent of requirements) {
      if (!entity.hasComponent(requiredComponent)) {
        console.warn(`Entity is missing required component: ${requiredComponent.name} for ${componentClass.name}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get missing requirements
   * @param entity The entity to check against
   * @returns Array of missing component class names
   */
  public getMissingRequirements(entity: IEntity): string[] {
    const componentClass = this.constructor as ComponentClass;
    const requirements = (componentClass.getRequirements && typeof componentClass.getRequirements === 'function')
      ? componentClass.getRequirements()
      : [];
    
    return requirements
      .filter(req => !entity.hasComponent(req))
      .map(req => req.name);
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public onAttach?(entity: IEntity): void;
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  public onDetach?(entity: IEntity): void;
  
  /**
   * Called when the component's entity is activated
   */
  public onActivate?(): void;
  
  /**
   * Called when the component's entity is deactivated
   */
  public onDeactivate?(): void;
  
  /**
   * Serialize this component to a plain object
   * Override this in derived components
   */
  public serialize(): unknown {
    return {};
  }
  
  /**
   * Deserialize this component from a plain object
   * Override this in derived components
   * @param data The data to deserialize from
   */
  public deserialize(data: unknown): void {
    // Base implementation does nothing
  }
} 
import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { Transform } from './Transform';

/**
 * Component that links an entity to a Three.js Object3D
 * This component is responsible for managing the Three.js object
 * and its lifecycle in the scene
 */
export class ThreeObject extends BaseComponent {
  /**
   * The Three.js object
   */
  public object: THREE.Object3D;
  
  /**
   * Whether the parent relationship has changed
   * @internal Used by ThreeSceneSystem
   */
  private parentChanged: boolean = false;
  
  /**
   * Constructor
   * @param object Optional Three.js object to use (creates a new Object3D if not provided)
   */
  constructor(object?: THREE.Object3D) {
    super();
    this.object = object || new THREE.Object3D();
  }
  
  /**
   * In Phase 4, Transform is an optional dependency
   * In later phases, it will be required
   */
  public static override getRequirements(): ComponentClass[] {
    // Start with empty requirements in Phase 4
    return [];
    
    // In Phase 8, we'll update this to:
    // return [Transform];
  }
  
  /**
   * Set the Three.js object
   * @param object The Three.js object to use
   * @returns This component for method chaining
   */
  public setObject(object: THREE.Object3D): this {
    // Remove the old object from its parent if it exists
    if (this.object && this.object.parent) {
      this.object.parent.remove(this.object);
    }
    
    this.object = object;
    this.parentChanged = true;
    return this;
  }
  
  /**
   * Set the parent entity for this object
   * @param parentEntity The parent entity (or null to remove parent)
   */
  public setParent(parentEntity: IEntity | null): void {
    this.parentChanged = true;
    // Parent-child relationship is managed by the ThreeScene system
  }
  
  /**
   * Flag that parent has changed
   * @internal Used by ThreeSceneSystem
   */
  public flagParentChanged(): void {
    this.parentChanged = true;
  }
  
  /**
   * Check if parent has changed
   * @internal Used by ThreeSceneSystem
   */
  public hasParentChanged(): boolean {
    return this.parentChanged;
  }
  
  /**
   * Clear the parent changed flag
   * @internal Used by ThreeSceneSystem
   */
  public clearParentChanged(): void {
    this.parentChanged = false;
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    // Initialize object name with entity name or ID
    this.object.name = entity.name || `entity_${entity.id}`;
    
    // Set up basic connection with Transform component if it exists
    const transform = entity.getComponent(Transform);
    if (transform) {
      // Copy initial transform values to the Three.js object
      const { position, rotation, scale } = transform;
      
      this.object.position.set(position.x, position.y, position.z);
      
      // Convert degrees to radians for Three.js
      const toRad = (deg: number) => deg * (Math.PI / 180);
      this.object.rotation.set(
        toRad(rotation.x),
        toRad(rotation.y),
        toRad(rotation.z)
      );
      
      this.object.scale.set(scale.x, scale.y, scale.z);
    }
  }
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  public override onDetach(entity: IEntity): void {
    // Remove from parent
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    // Only serialize minimal information
    // Actual Three.js objects cannot be serialized directly
    return {
      name: this.object.name,
      visible: this.object.visible,
      type: this.object.type,
      // We don't serialize position/rotation/scale here because that's
      // handled by the Transform component
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const objData = data as Record<string, any>;
    
    // Restore basic properties
    if (objData.name) this.object.name = objData.name;
    if (typeof objData.visible === 'boolean') this.object.visible = objData.visible;
    
    // Note: We don't restore position/rotation/scale here because that's
    // handled by the Transform component
  }
} 
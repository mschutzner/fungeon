import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { Entity } from '../Entity';
import { World } from '../World';
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
   * Child entities (for entity hierarchy)
   */
  public children: Entity[] = [];
  
  /**
   * Constructor
   * @param position The position of the object
   * @param object Optional Three.js object to use (creates a new Object3D if not provided)
   */
  constructor(position: THREE.Vector3, object?: THREE.Object3D) {
    super();
    this.object = object || new THREE.Object3D();
    this.object.position.set(position.x, position.y, position.z);
  }
  
  /**
   * ThreeObject has no requirements as it is the base component for all 3D objects
   * Other components should list ThreeObject as a requirement
   */
  public static override getRequirements(): ComponentClass[] {
    // ThreeObject has no requirements as it is the foundation component
    return [];
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
    
    // Re-establish parent-child relationships for all children
    for (const childEntity of this.children) {
      const childThreeObj = childEntity.getComponent(ThreeObject);
      if (childThreeObj) {
        this.object.add(childThreeObj.object);
      }
    }
    
    return this;
  }
  
  /**
   * Set the parent entity for this object
   * @param parentEntity The parent entity (or null to remove parent)
   */
  public setParent(parentEntity: IEntity | null): void {
    // Remove from current parent's THREE.js object first
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
    
    if (parentEntity) {
      const parentThreeObj = parentEntity.getComponent(ThreeObject);
      if (parentThreeObj) {
        // Add this object as a child in the THREE.js scene graph
        parentThreeObj.object.add(this.object);
        
        // Add this entity to parent's children array if not already there
        if (!parentThreeObj.children.includes(this.entity as Entity)) {
          parentThreeObj.children.push(this.entity as Entity);
        }
      }
    }
  }
  
  /**
   * Add a child entity
   * @param childEntity The child entity to add
   */
  public addChild(childEntity: Entity): void {
    if (!this.children.includes(childEntity)) {
      this.children.push(childEntity);
      
      // Update THREE.js hierarchy
      const childThreeObj = childEntity.getComponent(ThreeObject);
      if (childThreeObj) {
        this.object.add(childThreeObj.object);
      }
    }
  }
  
  /**
   * Remove a child entity
   * @param childEntity The child entity to remove
   * @returns True if the child was removed
   */
  public removeChild(childEntity: Entity): boolean {
    const index = this.children.indexOf(childEntity);
    if (index !== -1) {
      this.children.splice(index, 1);
      
      // Update THREE.js hierarchy
      const childThreeObj = childEntity.getComponent(ThreeObject);
      if (childThreeObj && this.object.children.includes(childThreeObj.object)) {
        this.object.remove(childThreeObj.object);
      }
      
      return true;
    }
    return false;
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    // Initialize object name with entity name or ID
    this.object.name = entity.name || `entity_${entity.id}`;
    
    // Scene attachment is now handled by SceneSystem
  }
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  public override onDetach(entity: IEntity): void {
    // Remove from parent in THREE.js scene graph
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
    
    // Also remove all children from this object
    for (const child of this.children) {
      const childThreeObj = child.getComponent(ThreeObject);
      if (childThreeObj) {
        this.object.remove(childThreeObj.object);
      }
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
      childrenIds: this.children.map(child => child.id)
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
    
    // Note: Child entity references will be restored by the World deserializer
  }
} 
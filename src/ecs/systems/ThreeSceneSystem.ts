import * as THREE from 'three';
import { ComponentClass, IEntity, ISystem, IWorld } from '../types';
import { ThreeObject } from '../components/ThreeObject';
import { Transform } from '../components/Transform';
import { World } from '../World';

/**
 * System that manages Three.js objects and scene
 * Handles synchronization between ECS and Three.js
 */
export class ThreeSceneSystem implements ISystem {
  /**
   * Unique ID for this system
   */
  readonly id: number = Math.floor(Math.random() * 1000000);
  
  /**
   * Priority of this system (higher priority = updated earlier)
   */
  readonly priority: number = 100; // High priority to update objects before rendering
  
  /**
   * Whether this system is enabled
   */
  enabled: boolean = true;
  
  /**
   * Reference to the world
   */
  private world!: IWorld;
  
  /**
   * Map of entity ID to parent entity ID
   */
  private entityToParentMap: Map<number, number> = new Map();
  
  /**
   * Initialize the system
   * @param world The world this system belongs to
   */
  initialize(world: IWorld): void {
    this.world = world;
    console.log('ThreeSceneSystem initialized');
  }
  
  /**
   * Update the system
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Only process entities with both ThreeObject and Transform components
    // Use any to bypass type checking for now - we know these components exist
    const entities = this.world.query(ThreeObject as any, Transform as any);
    
    // First pass: Update transforms
    this.updateTransforms(entities);
    
    // Second pass: Update parent-child relationships
    this.updateHierarchy(entities);
  }
  
  /**
   * Update transforms for all entities with ThreeObject and Transform components
   * @param entities Entities to update
   */
  private updateTransforms(entities: IEntity[]): void {
    for (const entity of entities) {
      const threeObj = entity.getComponent(ThreeObject)!;
      const transform = entity.getComponent(Transform)!;
      
      const obj = threeObj.object;
      
      // Update position
      obj.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
      
      // Update rotation (convert degrees to radians)
      const toRadians = (deg: number) => deg * (Math.PI / 180);
      obj.rotation.set(
        toRadians(transform.rotation.x),
        toRadians(transform.rotation.y),
        toRadians(transform.rotation.z)
      );
      
      // Update scale
      obj.scale.set(
        transform.scale.x,
        transform.scale.y,
        transform.scale.z
      );
    }
  }
  
  /**
   * Update parent-child relationships for all entities with ThreeObject component
   * @param entities Entities to update
   */
  private updateHierarchy(entities: IEntity[]): void {
    // Cast to World to access the getScene method
    const worldWithScene = this.world as World;
    const scene = worldWithScene.getScene();
    
    for (const entity of entities) {
      const threeObj = entity.getComponent(ThreeObject)!;
      const obj = threeObj.object;
      
      // Skip objects that haven't changed parent
      if (!threeObj.hasParentChanged()) continue;
      
      // Check if this entity has a parent in our map
      const parentId = this.entityToParentMap.get(entity.id);
      
      if (parentId) {
        // Get the parent entity
        const parentEntity = this.world.getEntity(parentId);
        if (!parentEntity) {
          // Parent entity no longer exists, add to scene
          if (obj.parent !== scene) {
            if (obj.parent) {
              obj.parent.remove(obj);
            }
            scene.add(obj);
          }
          // Remove from parent map
          this.entityToParentMap.delete(entity.id);
        } else {
          // Get the parent's ThreeObject component
          const parentThreeObj = parentEntity.getComponent(ThreeObject);
          if (!parentThreeObj) {
            // Parent entity doesn't have a ThreeObject, add to scene
            if (obj.parent !== scene) {
              if (obj.parent) {
                obj.parent.remove(obj);
              }
              scene.add(obj);
            }
            // Remove from parent map
            this.entityToParentMap.delete(entity.id);
          } else {
            // Update the Three.js parent-child relationship if needed
            if (obj.parent !== parentThreeObj.object) {
              if (obj.parent) {
                obj.parent.remove(obj);
              }
              parentThreeObj.object.add(obj);
            }
          }
        }
      } else {
        // Check if this entity is a child in the entity hierarchy
        let isChild = false;
        
        // Check all entities to see if any have this as a child in their ThreeObject
        for (const potentialParent of entities) {
          if (potentialParent.id === entity.id) continue; // Skip self
          
          const parentThreeObj = potentialParent.getComponent(ThreeObject);
          if (parentThreeObj && parentThreeObj.children.some(child => child.id === entity.id)) {
            isChild = true;
            
            // Update Three.js parent-child relationship if needed
            if (obj.parent !== parentThreeObj.object) {
              if (obj.parent) {
                obj.parent.remove(obj);
              }
              parentThreeObj.object.add(obj);
              
              // Store in parent map for quick lookups
              this.entityToParentMap.set(entity.id, potentialParent.id);
            }
            break;
          }
        }
        
        // If not a child of any entity, make sure it's in the scene
        if (!isChild) {
          if (!obj.parent) {
            scene.add(obj);
          } else if (obj.parent !== scene) {
            // If it has a parent but it's not the scene, and it's not a child in our entity hierarchy
            // it means it was previously parented in Three.js directly, not through our system
            // We'll respect that and not change it
          }
        }
      }
      
      // Clear the parent changed flag
      threeObj.clearParentChanged();
    }
  }
  
  /**
   * Set the parent-child relationship between two entities
   * @param childEntity The child entity
   * @param parentEntity The parent entity (or null to remove parent)
   */
  setParent(childEntity: IEntity, parentEntity: IEntity | null): void {
    const childObj = childEntity.getComponent(ThreeObject);
    if (!childObj) {
      console.warn('Child entity does not have a ThreeObject component');
      return;
    }
    
    // Remove old parent mapping
    this.entityToParentMap.delete(childEntity.id);
    
    // Flag that the parent has changed
    childObj.flagParentChanged();
    
    // Remove from previous parent's children list if it exists
    for (const entity of this.world.getAllEntities()) {
      const threeObj = entity.getComponent(ThreeObject);
      if (threeObj) {
        threeObj.removeChild(childEntity as any);
      }
    }
    
    if (parentEntity) {
      const parentObj = parentEntity.getComponent(ThreeObject);
      if (parentObj) {
        // Store parent mapping
        this.entityToParentMap.set(childEntity.id, parentEntity.id);
        
        // Add to parent's children list
        parentObj.addChild(childEntity as any);
      } else {
        console.warn('Parent entity does not have a ThreeObject component');
      }
    }
    
    // The actual Three.js hierarchy update will happen in the update method
  }
  
  /**
   * Clean up the system when it's removed from the world
   */
  cleanup(): void {
    this.entityToParentMap.clear();
    console.log('ThreeSceneSystem cleaned up');
  }
} 
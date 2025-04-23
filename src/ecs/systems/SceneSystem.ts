import * as THREE from 'three';
import { System } from '../System';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from '../components/ThreeObject';
import { World } from '../World';
import { BaseComponent } from '../Component';

/**
 * System responsible for managing the attachment of THREE.js objects to the scene or their parents
 * This system ensures that objects are properly added to the scene when they don't have a parent
 * and ensures the THREE.js hierarchy matches the entity hierarchy
 */
export class SceneSystem extends System {
  /**
   * Set a higher priority to ensure this system runs early in the update cycle
   */
  constructor() {
    super(800); // High priority to ensure scene hierarchy is updated early
  }
  
  /**
   * Initialize the system
   */
  protected override onInitialize(): void {
    console.log('SceneSystem initialized');
    
    // Enforce component requirements for all entities in the world
    if (this.world) {
      // Get all entities
      const entities = this.world.getAllEntities();
      
      // Check each entity for components that require ThreeObject
      for (const entity of entities) {
        this.enforceComponentRequirements(entity);
      }
    }
  }
  
  /**
   * Update the system
   * Updates the scene graph with any changed entities
   * @param deltaTime Time since the last update
   */
  protected override onUpdate(deltaTime: number): void {
    // Get all entities with ThreeObject components
    const entities = this.query(ThreeObject as unknown as ComponentClass);
    
    // Process each entity with a ThreeObject component
    for (const entity of entities) {
      this.processEntity(entity);
    }
  }
  
  /**
   * Process an entity to ensure its object is properly attached to the scene or parent
   * @param entity The entity to process
   */
  private processEntity(entity: IEntity): void {
    const threeObj = entity.getComponent(ThreeObject);
    if (!threeObj) return;
    
    // If the object doesn't have a parent in the THREE.js hierarchy
    if (!threeObj.object.parent) {
      // Check if it should be attached to a parent entity
      let shouldAddToScene = true;
      
      // Check if this entity belongs to a parent with a ThreeObject
      for (const potentialParent of this.query(ThreeObject as unknown as ComponentClass)) {
        const parentThreeObj = potentialParent.getComponent(ThreeObject);
        if (parentThreeObj && parentThreeObj.children.includes(entity as any)) {
          // Found a parent - add to parent instead of scene
          if (!parentThreeObj.object.children.includes(threeObj.object)) {
            parentThreeObj.object.add(threeObj.object);
          }
          shouldAddToScene = false;
          break;
        }
      }
      
      // If no parent was found, add to the scene
      if (shouldAddToScene) {
        const worldRef = this.world;
        if (worldRef && worldRef instanceof World) {
          const scene = worldRef.getScene();
          if (!scene.children.includes(threeObj.object)) {
            console.log('Adding object to scene from SceneSystem:', threeObj.object);
            scene.add(threeObj.object);
          }
        }
      }
    }
  }
  
  /**
   * Enforce component requirements for an entity
   * This ensures that components requiring ThreeObject are added after ThreeObject
   * @param entity The entity to check
   */
  public enforceComponentRequirements(entity: IEntity): void {
    // Get all components on the entity
    const components = entity.getAllComponents();
    
    // Check if any components require ThreeObject but the entity doesn't have it
    const hasThreeObject = entity.hasComponent(ThreeObject);
    
    if (!hasThreeObject) {
      // Check if any component requires ThreeObject
      for (const component of components) {
        // Get the constructor of the component
        const componentClass = component.constructor as ComponentClass;
        
        // Check if it has requirements
        if (componentClass.getRequirements && typeof componentClass.getRequirements === 'function') {
          const requirements = componentClass.getRequirements();
          
          // If it requires ThreeObject, log a warning
          if (requirements.includes(ThreeObject)) {
            console.warn(`Entity ${entity.name || entity.id} has a component that requires ThreeObject, but ThreeObject is missing. Add ThreeObject first.`);
            break;
          }
        }
      }
    }
  }
  
  /**
   * Called when the system is cleaned up
   */
  protected override onCleanup(): void {
    console.log('SceneSystem cleaned up');
  }
} 
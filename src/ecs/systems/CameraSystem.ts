import * as THREE from 'three';
import { IEntity, ISystem, IWorld, ComponentClass } from '../types';
import { CameraComponent, CameraType } from '../components/CameraComponent';
import { Transform } from '../components/Transform';
import { ThreeObject } from '../components/ThreeObject';

/**
 * System that manages cameras in the ECS
 */
export class CameraSystem implements ISystem {
  /**
   * Unique ID for this system
   */
  readonly id: number = Math.floor(Math.random() * 1000000);
  
  /**
   * Priority of this system (higher priority = updated earlier)
   * Should be higher than most systems to ensure camera is updated before rendering
   */
  readonly priority: number = 900;
  
  /**
   * Whether this system is enabled
   */
  enabled: boolean = true;
  
  /**
   * Reference to the world
   */
  private world!: IWorld;
  
  /**
   * Active camera component
   */
  private activeCamera: CameraComponent | null = null;
  
  /**
   * Initialize the system
   * @param world The world this system belongs to
   */
  initialize(world: IWorld): void {
    this.world = world;
    console.log('CameraSystem initialized');
  }
  
  /**
   * Update the system
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Query for entities with both Camera and Transform components
    // TypeScript doesn't allow passing different component types directly to query,
    // but the implementation accepts any ComponentClass, so we need to cast
    const CameraComponentClass = CameraComponent as unknown as ComponentClass;
    const TransformClass = Transform as unknown as ComponentClass;
    
    const entities = this.world.query(CameraComponentClass, TransformClass);
    
    // Update all cameras based on their transforms
    this.updateCameras(entities);
    
    // Find active camera
    this.findActiveCamera(entities);
  }
  
  /**
   * Update camera transforms
   * @param entities Entities with camera components
   */
  private updateCameras(entities: IEntity[]): void {
    for (const entity of entities) {
      const camera = entity.getComponent(CameraComponent)!;
      const transform = entity.getComponent(Transform)!;
      
      // Update camera transform from entity transform
      camera.updateFromTransform(transform);
    }
  }
  
  /**
   * Find the active camera
   * @param entities Entities with camera components
   */
  private findActiveCamera(entities: IEntity[]): void {
    // Look for a camera marked as active
    for (const entity of entities) {
      const camera = entity.getComponent(CameraComponent)!;
      
      if (camera.getIsActive()) {
        this.activeCamera = camera;
        return;
      }
    }
    
    // If no active camera was found, use the first one if available
    if (entities.length > 0 && !this.activeCamera) {
      const firstCamera = entities[0].getComponent(CameraComponent)!;
      firstCamera.setActive(true);
      this.activeCamera = firstCamera;
    }
  }
  
  /**
   * Get the active camera
   * @returns The active camera or null if none found
   */
  getActiveCamera(): CameraComponent | null {
    return this.activeCamera;
  }
  
  /**
   * Get the active camera's clear color
   * @returns The clear color, defaulting to black if no active camera
   */
  getActiveClearColor(): THREE.Color {
    if (this.activeCamera) {
      return this.activeCamera.getClearColor();
    }
    return new THREE.Color(0x000000); // Default to black
  }
  
  /**
   * Set a camera as active
   * @param camera The camera component to set as active
   */
  setActiveCamera(camera: CameraComponent): void {
    // Deactivate current active camera if there is one
    if (this.activeCamera && this.activeCamera !== camera) {
      this.activeCamera.setActive(false);
    }
    
    // Set the new camera as active
    camera.setActive(true);
    this.activeCamera = camera;
  }
  
  /**
   * Set a camera entity as active
   * @param entity The entity with a camera component
   * @returns True if successful, false if entity has no camera
   */
  setActiveCameraEntity(entity: IEntity): boolean {
    const camera = entity.getComponent(CameraComponent);
    if (!camera) return false;
    
    this.setActiveCamera(camera);
    return true;
  }
  
  /**
   * Create a new camera entity
   * @param name Optional name for the entity
   * @param type Camera type
   * @param position Initial position
   * @param rotation Initial rotation
   * @param isActive Whether this camera should be active
   * @returns The created entity
   */
  createCamera(
    name: string = 'Camera',
    type: CameraType = CameraType.PERSPECTIVE,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 5),
    rotation: THREE.Euler = new THREE.Euler(0, 0, 0),
    isActive: boolean = false
  ): IEntity {
    // Create the entity
    const entity = this.world.createEntity(name);
    
    // Add transform
    const transform = new Transform(position.x, position.y, position.z);
    
    // Safely set rotation if the rotation property exists
    if (transform.rotation && typeof transform.rotation.set === 'function') {
      transform.rotation.set(
        rotation.x * (180 / Math.PI), // Convert from radians to degrees
        rotation.y * (180 / Math.PI),
        rotation.z * (180 / Math.PI)
      );
    }
    
    entity.addComponent(transform);
    
    // Create camera
    const camera = new CameraComponent(type, isActive);
    
    // Add ThreeObject component to ensure the camera is added to the scene graph
    const threeObj = new ThreeObject(camera.getCamera());
    entity.addComponent(threeObj);
    
    // Add camera component after ThreeObject to ensure proper setup
    entity.addComponent(camera);
    
    // If this camera should be active, set it as active
    if (isActive) {
      this.setActiveCamera(camera);
    }
    
    return entity;
  }
  
  /**
   * Clean up the system when it's removed from the world
   */
  cleanup(): void {
    this.activeCamera = null;
    console.log('CameraSystem cleaned up');
  }
} 
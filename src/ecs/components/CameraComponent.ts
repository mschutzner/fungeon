import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass } from '../types';
import { Transform } from './Transform';

/**
 * Enum for camera types
 */
export enum CameraType {
  PERSPECTIVE = 'perspective',
  ORTHOGRAPHIC = 'orthographic'
}

/**
 * Component that manages a Three.js camera
 */
export class CameraComponent extends BaseComponent {
  /**
   * The camera type (perspective or orthographic)
   */
  private type: CameraType;
  
  /**
   * The Three.js camera object
   */
  private camera: THREE.Camera;
  
  /**
   * Field of view (in degrees, for perspective camera only)
   */
  private fov: number = 75;
  
  /**
   * Aspect ratio
   */
  private aspect: number = 1;
  
  /**
   * Near clipping plane
   */
  private near: number = 0.1;
  
  /**
   * Far clipping plane
   */
  private far: number = 1000;
  
  /**
   * Size for orthographic camera
   */
  private size: number = 10;
  
  /**
   * Whether this is the active camera
   */
  private isActive: boolean = false;
  
  /**
   * Constructor
   * @param type Type of camera to create
   * @param isActive Whether this is the active camera
   */
  constructor(type: CameraType = CameraType.PERSPECTIVE, isActive: boolean = false) {
    super();
    this.type = type;
    this.isActive = isActive;
    
    // Create the appropriate camera
    if (this.type === CameraType.PERSPECTIVE) {
      this.camera = new THREE.PerspectiveCamera(this.fov, this.aspect, this.near, this.far);
    } else {
      // Orthographic - we'll set left, right, top, bottom based on size and aspect
      const halfSize = this.size / 2;
      const halfWidth = halfSize * this.aspect;
      this.camera = new THREE.OrthographicCamera(
        -halfWidth, halfWidth, 
        halfSize, -halfSize, 
        this.near, this.far
      );
    }
  }
  
  /**
   * Get required components
   */
  public static override getRequirements(): ComponentClass[] {
    return [Transform];
  }
  
  /**
   * Get the camera object
   */
  public getCamera(): THREE.Camera {
    return this.camera;
  }
  
  /**
   * Get camera type
   */
  public getType(): CameraType {
    return this.type;
  }
  
  /**
   * Check if this is the active camera
   */
  public getIsActive(): boolean {
    return this.isActive;
  }
  
  /**
   * Set whether this is the active camera
   * @param isActive Whether this is the active camera
   */
  public setActive(isActive: boolean): void {
    this.isActive = isActive;
  }
  
  /**
   * Set the aspect ratio
   * @param aspect The new aspect ratio
   */
  public setAspect(aspect: number): void {
    this.aspect = aspect;
    
    if (this.type === CameraType.PERSPECTIVE) {
      const perspCamera = this.camera as THREE.PerspectiveCamera;
      perspCamera.aspect = aspect;
      perspCamera.updateProjectionMatrix();
    } else {
      const orthoCamera = this.camera as THREE.OrthographicCamera;
      const halfSize = this.size / 2;
      const halfWidth = halfSize * aspect;
      
      orthoCamera.left = -halfWidth;
      orthoCamera.right = halfWidth;
      orthoCamera.updateProjectionMatrix();
    }
  }
  
  /**
   * Set field of view (perspective only)
   * @param fov The new field of view in degrees
   */
  public setFov(fov: number): void {
    this.fov = fov;
    
    if (this.type === CameraType.PERSPECTIVE) {
      const perspCamera = this.camera as THREE.PerspectiveCamera;
      perspCamera.fov = fov;
      perspCamera.updateProjectionMatrix();
    }
  }
  
  /**
   * Set size (orthographic only)
   * @param size The new size
   */
  public setSize(size: number): void {
    this.size = size;
    
    if (this.type === CameraType.ORTHOGRAPHIC) {
      const orthoCamera = this.camera as THREE.OrthographicCamera;
      const halfSize = size / 2;
      const halfWidth = halfSize * this.aspect;
      
      orthoCamera.top = halfSize;
      orthoCamera.bottom = -halfSize;
      orthoCamera.left = -halfWidth;
      orthoCamera.right = halfWidth;
      orthoCamera.updateProjectionMatrix();
    }
  }
  
  /**
   * Set near and far clipping planes
   * @param near The near clipping plane
   * @param far The far clipping plane
   */
  public setClippingPlanes(near: number, far: number): void {
    this.near = near;
    this.far = far;
    
    if (this.type === CameraType.PERSPECTIVE) {
      const perspCamera = this.camera as THREE.PerspectiveCamera;
      perspCamera.near = near;
      perspCamera.far = far;
      perspCamera.updateProjectionMatrix();
    } else {
      const orthoCamera = this.camera as THREE.OrthographicCamera;
      orthoCamera.near = near;
      orthoCamera.far = far;
      orthoCamera.updateProjectionMatrix();
    }
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: any): void {
    // Get the entity's transform component
    const transform = entity.getComponent(Transform);
    if (transform) {
      // Set initial position and rotation from transform
      const position = transform.position;
      const rotation = transform.rotation;
      
      this.camera.position.set(position.x, position.y, position.z);
      
      // Convert rotation from degrees to radians
      const toRad = (deg: number) => deg * (Math.PI / 180);
      this.camera.rotation.set(
        toRad(rotation.x),
        toRad(rotation.y),
        toRad(rotation.z)
      );
    }
  }
  
  /**
   * Called when the entity's transform changes
   * This will be called by the CameraSystem
   */
  public updateFromTransform(transform: Transform): void {
    // Update position
    const position = transform.position;
    this.camera.position.set(position.x, position.y, position.z);
    
    // Update rotation
    const rotation = transform.rotation;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    this.camera.rotation.set(
      toRad(rotation.x),
      toRad(rotation.y),
      toRad(rotation.z)
    );
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      type: this.type,
      isActive: this.isActive,
      fov: this.fov,
      aspect: this.aspect,
      near: this.near,
      far: this.far,
      size: this.size
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const cameraData = data as Record<string, any>;
    
    // Restore camera type if specified
    if (cameraData.type && 
        (cameraData.type === CameraType.PERSPECTIVE || 
         cameraData.type === CameraType.ORTHOGRAPHIC)) {
      
      // Only recreate camera if type has changed
      if (this.type !== cameraData.type) {
        this.type = cameraData.type;
        
        // Create the appropriate camera
        if (this.type === CameraType.PERSPECTIVE) {
          this.camera = new THREE.PerspectiveCamera(this.fov, this.aspect, this.near, this.far);
        } else {
          const halfSize = this.size / 2;
          const halfWidth = halfSize * this.aspect;
          this.camera = new THREE.OrthographicCamera(
            -halfWidth, halfWidth, 
            halfSize, -halfSize, 
            this.near, this.far
          );
        }
      }
    }
    
    // Restore properties
    if (typeof cameraData.isActive === 'boolean') this.isActive = cameraData.isActive;
    if (typeof cameraData.fov === 'number') this.fov = cameraData.fov;
    if (typeof cameraData.aspect === 'number') this.aspect = cameraData.aspect;
    if (typeof cameraData.near === 'number') this.near = cameraData.near;
    if (typeof cameraData.far === 'number') this.far = cameraData.far;
    if (typeof cameraData.size === 'number') this.size = cameraData.size;
    
    // Update camera properties
    if (this.type === CameraType.PERSPECTIVE) {
      const perspCamera = this.camera as THREE.PerspectiveCamera;
      perspCamera.fov = this.fov;
      perspCamera.aspect = this.aspect;
      perspCamera.near = this.near;
      perspCamera.far = this.far;
      perspCamera.updateProjectionMatrix();
    } else {
      const orthoCamera = this.camera as THREE.OrthographicCamera;
      const halfSize = this.size / 2;
      const halfWidth = halfSize * this.aspect;
      
      orthoCamera.top = halfSize;
      orthoCamera.bottom = -halfSize;
      orthoCamera.left = -halfWidth;
      orthoCamera.right = halfWidth;
      orthoCamera.near = this.near;
      orthoCamera.far = this.far;
      orthoCamera.updateProjectionMatrix();
    }
  }
} 
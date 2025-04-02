import * as THREE from 'three';
import { ConstraintDemoState } from './ConstraintDemoState';
import { Engine } from '../Engine';
import { InputEventType } from '../input/InputManager';
import {
  Entity,
  Transform,
  ThreeObject,
  MeshComponent,
  GeometryType,
  ConstraintComponent,
  ConstraintType,
  Vector3,
  Rotation
} from '../../ecs';

/**
 * Demo state for the Lock constraint
 */
export class LockDemo extends ConstraintDemoState {
  // Entities for this demo
  private entityId: number = -1;
  
  // For UI status
  private lockEnabled: boolean = true;
  private lockX: boolean = false;
  private lockY: boolean = false;
  private lockZ: boolean = false;
  private lockRotX: boolean = false;
  private lockRotY: boolean = false;
  private lockRotZ: boolean = false;
  
  // Visual helpers
  private axisHelper: THREE.AxesHelper | null = null;
  
  constructor(engine: Engine) {
    super(
      'lockDemo',
      engine,
      ConstraintType.LOCK,
      'The Lock constraint prevents specific transform axes from being modified.',
      'X/Y/Z: Toggle position lock\nR/T/F: Toggle rotation lock\nL: Toggle constraint\nWASD/QE: Move entity\nArrows: Rotate entity\nESC: Return to Menu'
    );
  }
  
  /**
   * Set up the demo-specific entities and constraints
   */
  protected setupDemo(): void {
    // Create a grid to help with spatial orientation
    this.createGrid();
    
    // Create a ground plane
    this.createGround();
    
    // Create the entity with Lock constraint
    this.createLockedEntity();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create the entity with Lock constraint
   */
  private createLockedEntity(): void {
    if (!this.world || !this.scene) return;
    
    // Create a new entity
    const entity = this.world.createEntity('locked');
    
    // Store the entity ID for later reference (do this early so updateLockConstraint can use it)
    this.entityId = entity.id;
    
    // Add transform component with position
    entity.addComponent(new Transform(0, 2, 0));
    
    // Add ThreeObject component
    entity.addComponent(new ThreeObject());
    
    // Add a cube mesh
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.color = 0x3366cc; // Blue
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    entity.addComponent(meshComponent);
    
    // Add the Lock constraint
    console.log('Setting up Lock constraint');
    
    const constraintComponent = new ConstraintComponent();
    this.updateLockConstraint(constraintComponent);
    
    entity.addComponent(constraintComponent);
    console.log('Lock constraint added to entity');
    
    // Add axis helper
    this.axisHelper = new THREE.AxesHelper(2);
    this.scene.add(this.axisHelper);
    
    console.log('Locked entity created with ID:', this.entityId);
  }
  
  /**
   * Update the lock constraint with current settings
   */
  private updateLockConstraint(constraintComponent: ConstraintComponent): void {
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Get the entity's current transform for initial locking values
    if (this.world && this.entityId !== -1) {
      const entity = this.world.getEntity(this.entityId);
      
      if (entity) {
        const transform = entity.getComponent(Transform);
        
        if (transform) {
          // Add the Lock constraint with current settings and current transform values
          constraintComponent.addLock({
            position: [this.lockX, this.lockY, this.lockZ],
            rotation: [this.lockRotX, this.lockRotY, this.lockRotZ],
            initialPosition: new Vector3(transform.position.x, transform.position.y, transform.position.z),
            initialRotation: new Rotation(transform.rotation.x, transform.rotation.y, transform.rotation.z),
            initialScale: new Vector3(transform.scale.x, transform.scale.y, transform.scale.z),
            influence: 1.0,
            enabled: this.lockEnabled
          });
          return;
        }
      }
    }
    
    // Fallback if entity or transform not found
    constraintComponent.addLock({
      position: [this.lockX, this.lockY, this.lockZ],
      rotation: [this.lockRotX, this.lockRotY, this.lockRotZ],
      influence: 1.0,
      enabled: this.lockEnabled
    });
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the entity position and rotation based on keyboard input
    this.updateEntityTransform(deltaTime);
    
    // Update the axis helper position to match the entity
    this.updateAxisHelper();
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the entity's transform based on keyboard input
   */
  private updateEntityTransform(deltaTime: number): void {
    if (!this.world || this.entityId === -1) return;
    
    // Get the entity
    const entity = this.world.getEntity(this.entityId);
    if (!entity) return;
    
    // Get the transform component
    const transform = entity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 3 * deltaTime; // Faster to demonstrate locking
    const rotateSpeed = 90 * deltaTime; // Degrees per second
    
    // Use WASD + QE for 3D movement
    if (this.inputManager.isKeyDown('w')) {
      transform.position.z -= moveSpeed;
    }
    if (this.inputManager.isKeyDown('s')) {
      transform.position.z += moveSpeed;
    }
    if (this.inputManager.isKeyDown('a')) {
      transform.position.x -= moveSpeed;
    }
    if (this.inputManager.isKeyDown('d')) {
      transform.position.x += moveSpeed;
    }
    if (this.inputManager.isKeyDown('q')) {
      transform.position.y += moveSpeed;
    }
    if (this.inputManager.isKeyDown('e')) {
      transform.position.y -= moveSpeed;
    }
    
    // Use arrow keys for rotation
    if (this.inputManager.isKeyDown('arrowleft')) {
      transform.rotation.y -= rotateSpeed;
    }
    if (this.inputManager.isKeyDown('arrowright')) {
      transform.rotation.y += rotateSpeed;
    }
    if (this.inputManager.isKeyDown('arrowup')) {
      transform.rotation.x -= rotateSpeed;
    }
    if (this.inputManager.isKeyDown('arrowdown')) {
      transform.rotation.x += rotateSpeed;
    }
  }
  
  /**
   * Update the axis helper position to match the entity
   */
  private updateAxisHelper(): void {
    if (!this.world || !this.axisHelper || this.entityId === -1) return;
    
    // Get the entity
    const entity = this.world.getEntity(this.entityId);
    if (!entity) return;
    
    // Get the transform component
    const transform = entity.getComponent(Transform);
    if (!transform) return;
    
    // Update axis helper position
    this.axisHelper.position.set(transform.position.x, transform.position.y, transform.position.z);
    
    // Update rotation (convert from degrees to radians)
    this.axisHelper.rotation.set(
      transform.rotation.x * (Math.PI / 180),
      transform.rotation.y * (Math.PI / 180),
      transform.rotation.z * (Math.PI / 180)
    );
  }
  
  /**
   * Subscribe to keyboard events for constraint toggling and configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 'l':
          this.toggleLock();
          break;
        case 'x':
          this.toggleLockPositionX();
          break;
        case 'y':
          this.toggleLockPositionY();
          break;
        case 'z':
          this.toggleLockPositionZ();
          break;
        case 'r':
          this.toggleLockRotationX();
          break;
        case 't':
          this.toggleLockRotationY();
          break;
        case 'f':
          this.toggleLockRotationZ();
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the lock constraint on/off
   */
  private toggleLock(): void {
    if (!this.world || this.entityId === -1) return;
    
    const entity = this.world.getEntity(this.entityId);
    if (!entity) return;
    
    const constraintComponent = entity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.lockEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.lockEnabled);
      
      console.log(`Lock constraint ${this.lockEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Toggle locking of X position
   */
  private toggleLockPositionX(): void {
    this.lockX = !this.lockX;
    this.updateConstraint();
    console.log(`Position X lock ${this.lockX ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle locking of Y position
   */
  private toggleLockPositionY(): void {
    this.lockY = !this.lockY;
    this.updateConstraint();
    console.log(`Position Y lock ${this.lockY ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle locking of Z position
   */
  private toggleLockPositionZ(): void {
    this.lockZ = !this.lockZ;
    this.updateConstraint();
    console.log(`Position Z lock ${this.lockZ ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle locking of X rotation
   */
  private toggleLockRotationX(): void {
    this.lockRotX = !this.lockRotX;
    this.updateConstraint();
    console.log(`Rotation X lock ${this.lockRotX ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle locking of Y rotation
   */
  private toggleLockRotationY(): void {
    this.lockRotY = !this.lockRotY;
    this.updateConstraint();
    console.log(`Rotation Y lock ${this.lockRotY ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle locking of Z rotation
   */
  private toggleLockRotationZ(): void {
    this.lockRotZ = !this.lockRotZ;
    this.updateConstraint();
    console.log(`Rotation Z lock ${this.lockRotZ ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.entityId === -1) return;
    
    const entity = this.world.getEntity(this.entityId);
    if (!entity) return;
    
    const constraintComponent = entity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Update the constraint
    this.updateLockConstraint(constraintComponent);
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      if (!this.world || this.entityId === -1) return;
      
      const entity = this.world.getEntity(this.entityId);
      if (!entity) return;
      
      const transform = entity.getComponent(Transform);
      if (!transform) return;
      
      // Format position and rotation to 1 decimal place
      const pos = `(${transform.position.x.toFixed(1)}, ${transform.position.y.toFixed(1)}, ${transform.position.z.toFixed(1)})`;
      const rot = `(${transform.rotation.x.toFixed(1)}°, ${transform.rotation.y.toFixed(1)}°, ${transform.rotation.z.toFixed(1)}°)`;
      
      // Create lock status strings
      const posLock = `Pos: ${this.lockX ? 'X ' : ''}${this.lockY ? 'Y ' : ''}${this.lockZ ? 'Z' : ''}`;
      const rotLock = `Rot: ${this.lockRotX ? 'X ' : ''}${this.lockRotY ? 'Y ' : ''}${this.lockRotZ ? 'Z' : ''}`;
      
      this.statusText.setText(
        `Lock: ${this.lockEnabled ? 'Enabled' : 'Disabled'}\n` +
        `${posLock} | ${rotLock}\n` +
        `Pos: ${pos}\n` +
        `Rot: ${rot}`
      );
    }
  }
} 
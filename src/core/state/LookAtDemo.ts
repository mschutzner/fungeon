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
  Axis
} from '../../ecs';

/**
 * Demo state for the LookAt constraint
 */
export class LookAtDemo extends ConstraintDemoState {
  // Entities for this demo
  private targetEntityId: number = -1;
  private observerEntityId: number = -1;
  
  // For UI status
  private lookAtEnabled: boolean = true;
  private upAxis: Axis = Axis.POSITIVE_Y;
  
  constructor(engine: Engine) {
    super(
      'lookAtDemo',
      engine,
      ConstraintType.LOOK_AT,
      'The LookAt constraint makes an entity orient its -Z axis towards another entity with a defined up axis.',
      'WASD/QE: Move target\nT: Toggle LookAt\nY/U: Change up axis\nESC: Return to Menu'
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
    
    // Create the target
    this.createTarget();
    
    // Create the observer with the LookAt constraint
    this.createObserver();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create the target entity
   */
  private createTarget(): void {
    if (!this.world) return;
    
    // Create a new entity for the target
    const targetEntity = this.world.createEntity('target');
    
    // Add transform component with position
    targetEntity.addComponent(new Transform(0, 2, 0));
    
    // Add ThreeObject component
    targetEntity.addComponent(new ThreeObject());
    
    // Add mesh component - sphere for the target
    const meshComponent = new MeshComponent(GeometryType.SPHERE);
    meshComponent.wireframe = true;
    meshComponent.color = 0xff0000; // Red
    meshComponent.radius = 0.5;
    targetEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.targetEntityId = targetEntity.id;
    
    console.log('Target entity created with ID:', this.targetEntityId);
  }
  
  /**
   * Create the observer entity with LookAt constraint
   */
  private createObserver(): void {
    if (!this.world) return;
    
    // Create a new entity for the observer
    const observerEntity = this.world.createEntity('observer');
    
    // Add transform component - position away from the target
    observerEntity.addComponent(new Transform(-2, 2, 0));
    
    // Add ThreeObject component
    observerEntity.addComponent(new ThreeObject());
    
    // Add a camera-like mesh to visualize the looking direction
    const meshComponent = new MeshComponent(GeometryType.CONE);
    meshComponent.color = 0x00ffff; // Cyan
    meshComponent.radius = 0.5;
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    meshComponent.segments = 8;
    observerEntity.addComponent(meshComponent);
    
    // Add the LookAt constraint
    if (this.targetEntityId !== -1) {
      console.log(`Setting up LookAt constraint targeting entity ${this.targetEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      constraintComponent.addLookAt(this.targetEntityId, {
        offset: new THREE.Euler(0, 0, 0),
        influence: 1.0
      });
      
      observerEntity.addComponent(constraintComponent);
      console.log('LookAt constraint added to observer entity');
    }
    
    // Store the entity ID for later reference
    this.observerEntityId = observerEntity.id;
    
    console.log('Observer entity created with ID:', this.observerEntityId);
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the target position based on keyboard input
    this.updateTargetPosition(deltaTime);
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the target's position based on keyboard input
   */
  private updateTargetPosition(deltaTime: number): void {
    if (!this.world || this.targetEntityId === -1) return;
    
    // Get the target entity
    const targetEntity = this.world.getEntity(this.targetEntityId);
    if (!targetEntity) return;
    
    // Get the transform component
    const transform = targetEntity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 2 * deltaTime;
    
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
  }
  
  /**
   * Subscribe to keyboard events for constraint toggling and configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 't':
          this.toggleLookAt();
          break;
        case 'y':
          this.setUpAxis(Axis.POSITIVE_Y);
          break;
        case 'u':
          this.setUpAxis(Axis.POSITIVE_Z);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the LookAt constraint on/off
   */
  private toggleLookAt(): void {
    if (!this.world || this.observerEntityId === -1) return;
    
    const observerEntity = this.world.getEntity(this.observerEntityId);
    if (!observerEntity) return;
    
    const constraintComponent = observerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.lookAtEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.lookAtEnabled);
      
      console.log(`LookAt ${this.lookAtEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Set the up axis for LookAt constraint
   */
  private setUpAxis(axis: Axis): void {
    if (!this.world || this.observerEntityId === -1) return;
    
    const observerEntity = this.world.getEntity(this.observerEntityId);
    if (!observerEntity) return;
    
    const constraintComponent = observerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove existing constraint at index 0 (if any)
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      constraintComponent.removeConstraint(0);
    }
    
    // Add new constraint with updated axis
    this.upAxis = axis;
    constraintComponent.addLookAt(this.targetEntityId, {
      offset: new THREE.Euler(0, 0, 0),
      influence: 1.0
    });
    
    console.log(`Up axis set to ${this.upAxis}`);
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      this.statusText.setText(
        `LookAt: ${this.lookAtEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Up Axis: ${this.upAxis}`
      );
    }
  }
} 
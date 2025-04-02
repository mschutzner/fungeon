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
 * Demo state for the Limit constraint
 */
export class LimitDemo extends ConstraintDemoState {
  // Entities for this demo
  private limitedEntityId: number = -1;
  
  // For UI status
  private limitEnabled: boolean = true;
  private showBounds: boolean = true;
  
  // Boundaries
  private minPosition: Vector3 = new Vector3(-3, 0, -3);
  private maxPosition: Vector3 = new Vector3(3, 5, 3);
  private minRotation: Rotation = new Rotation(0, 0, 0);
  private maxRotation: Rotation = new Rotation(45, 360, 45);
  
  // Visual helpers
  private boundingBox: THREE.Box3Helper | null = null;
  
  constructor(engine: Engine) {
    super(
      'limitDemo',
      engine,
      ConstraintType.LIMIT,
      'The Limit constraint restricts an entity\'s transform values within set boundaries.',
      'WASD/QE: Move entity\nR: Rotate entity\nT: Toggle constraint\nB: Toggle bounding box\nESC: Return to Menu'
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
    
    // Create visual bounds
    this.createBoundingBox();
    
    // Create the limited entity
    this.createLimitedEntity();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create a visual representation of the limits
   */
  private createBoundingBox(): void {
    if (!this.scene) return;
    
    // Create a Three.js box3 from our min/max positions
    const box = new THREE.Box3(
      new THREE.Vector3(this.minPosition.x, this.minPosition.y, this.minPosition.z),
      new THREE.Vector3(this.maxPosition.x, this.maxPosition.y, this.maxPosition.z)
    );
    
    // Create a helper to visualize it
    this.boundingBox = new THREE.Box3Helper(box, 0xffff00);
    this.scene.add(this.boundingBox);
    
    // Set visibility based on showBounds flag
    this.boundingBox.visible = this.showBounds;
  }
  
  /**
   * Create the entity with Limit constraint
   */
  private createLimitedEntity(): void {
    if (!this.world) return;
    
    // Create a new entity
    const limitedEntity = this.world.createEntity('limited');
    
    // Add transform component with position
    limitedEntity.addComponent(new Transform(0, 2, 0));
    
    // Add ThreeObject component
    limitedEntity.addComponent(new ThreeObject());
    
    // Add a box mesh
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.color = 0x00ff00; // Green
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    limitedEntity.addComponent(meshComponent);
    
    // Add the Limit constraint
    console.log('Setting up Limit constraint');
    
    const constraintComponent = new ConstraintComponent();
    constraintComponent.addLimit({
      position: {
        min: this.minPosition,
        max: this.maxPosition
      },
      rotation: {
        min: this.minRotation,
        max: this.maxRotation
      },
      influence: 1.0
    });
    
    limitedEntity.addComponent(constraintComponent);
    console.log('Limit constraint added to entity');
    
    // Store the entity ID for later reference
    this.limitedEntityId = limitedEntity.id;
    
    console.log('Limited entity created with ID:', this.limitedEntityId);
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the entity position and rotation based on keyboard input
    this.updateEntityTransform(deltaTime);
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the entity's transform based on keyboard input
   */
  private updateEntityTransform(deltaTime: number): void {
    if (!this.world || this.limitedEntityId === -1) return;
    
    // Get the entity
    const entity = this.world.getEntity(this.limitedEntityId);
    if (!entity) return;
    
    // Get the transform component
    const transform = entity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 5 * deltaTime; // Faster to test limits
    const rotateSpeed = 90 * deltaTime; // Degrees per second
    
    // Original position for constraint visualization
    const originalPosition = new Vector3(transform.position.x, transform.position.y, transform.position.z);
    
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
    
    // Use R for rotation
    if (this.inputManager.isKeyDown('r')) {
      transform.rotation.y += rotateSpeed;
    }
  }
  
  /**
   * Subscribe to keyboard events for constraint toggling and configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 't':
          this.toggleConstraint();
          break;
        case 'b':
          this.toggleBoundingBox();
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the limit constraint on/off
   */
  private toggleConstraint(): void {
    if (!this.world || this.limitedEntityId === -1) return;
    
    const entity = this.world.getEntity(this.limitedEntityId);
    if (!entity) return;
    
    const constraintComponent = entity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.limitEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.limitEnabled);
      
      console.log(`Limit constraint ${this.limitEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Toggle the visibility of the bounding box
   */
  private toggleBoundingBox(): void {
    this.showBounds = !this.showBounds;
    
    if (this.boundingBox) {
      this.boundingBox.visible = this.showBounds;
    }
    
    console.log(`Bounding box ${this.showBounds ? 'visible' : 'hidden'}`);
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      if (!this.world || this.limitedEntityId === -1) return;
      
      const entity = this.world.getEntity(this.limitedEntityId);
      if (!entity) return;
      
      const transform = entity.getComponent(Transform);
      if (!transform) return;
      
      // Format position to 1 decimal place
      const pos = `(${transform.position.x.toFixed(1)}, ${transform.position.y.toFixed(1)}, ${transform.position.z.toFixed(1)})`;
      const rot = `(${transform.rotation.x.toFixed(1)}°, ${transform.rotation.y.toFixed(1)}°, ${transform.rotation.z.toFixed(1)}°)`;
      
      this.statusText.setText(
        `Limit: ${this.limitEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Position: ${pos}\n` +
        `Rotation: ${rot}`
      );
    }
  }
} 
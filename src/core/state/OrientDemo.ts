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
  Rotation
} from '../../ecs';

/**
 * Demo state for the Orient constraint
 */
export class OrientDemo extends ConstraintDemoState {
  // Entities for this demo
  private targetEntityId: number = -1;
  private orientedEntityId: number = -1;
  
  // For UI status
  private orientEnabled: boolean = true;
  private mixWeight: number = 1.0;
  
  // Offset rotation
  private offsetRotation: Rotation = new Rotation(0, 0, 0);
  
  constructor(engine: Engine) {
    super(
      'orientDemo',
      engine,
      ConstraintType.ORIENT,
      'The Orient constraint makes an entity match the orientation of another entity.',
      'Arrows: Rotate target\nO: Toggle orient\nM/N: Dec/Incr mix weight\nX/Y/Z: Adjust offset\nESC: Return to Menu'
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
    
    // Create the oriented entity
    this.createOrientedEntity();
    
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
    targetEntity.addComponent(new Transform(-1, 2, 0));
    
    // Add ThreeObject component
    targetEntity.addComponent(new ThreeObject());
    
    // Add mesh component - box with axis coloring
    const meshComponent = new MeshComponent(GeometryType.DEBUG_AXIS);
    meshComponent.size = { width: 1.5, height: 1.5, depth: 1.5 };
    targetEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.targetEntityId = targetEntity.id;
    
    console.log('Target entity created with ID:', this.targetEntityId);
  }
  
  /**
   * Create the entity with Orient constraint
   */
  private createOrientedEntity(): void {
    if (!this.world) return;
    
    // Create a new entity
    const orientedEntity = this.world.createEntity('oriented');
    
    // Add transform component - position away from the target
    orientedEntity.addComponent(new Transform(1, 2, 0));
    
    // Add ThreeObject component
    orientedEntity.addComponent(new ThreeObject());
    
    // Add mesh component - arrow to show orientation
    const meshComponent = new MeshComponent(GeometryType.DEBUG_AXIS);
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    orientedEntity.addComponent(meshComponent);
    
    // Add the Orient constraint
    if (this.targetEntityId !== -1) {
      console.log(`Setting up Orient constraint targeting entity ${this.targetEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      this.updateOrientConstraint(constraintComponent);
      
      orientedEntity.addComponent(constraintComponent);
      console.log('Orient constraint added to entity');
    }
    
    // Store the entity ID for later reference
    this.orientedEntityId = orientedEntity.id;
    
    console.log('Oriented entity created with ID:', this.orientedEntityId);
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the target position and rotation based on keyboard input
    this.updateTargetTransform(deltaTime);
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the target's transform based on keyboard input
   */
  private updateTargetTransform(deltaTime: number): void {
    if (!this.world || this.targetEntityId === -1) return;
    
    // Get the target entity
    const targetEntity = this.world.getEntity(this.targetEntityId);
    if (!targetEntity) return;
    
    // Get the transform component
    const transform = targetEntity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 3 * deltaTime;
    const rotateSpeed = 90 * deltaTime; // Degrees per second
    
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
   * Subscribe to keyboard events for constraint toggling and configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 'o':
          this.toggleOrient();
          break;
        case 'm':
          this.adjustMixWeight(-0.1);
          break;
        case 'n':
          this.adjustMixWeight(0.1);
          break;
        case 'x':
          this.adjustOffsetRotation('x', 15);
          break;
        case 'y':
          this.adjustOffsetRotation('y', 15);
          break;
        case 'z':
          this.adjustOffsetRotation('z', 15);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the orient constraint on/off
   */
  private toggleOrient(): void {
    if (!this.world || this.orientedEntityId === -1) return;
    
    const orientedEntity = this.world.getEntity(this.orientedEntityId);
    if (!orientedEntity) return;
    
    const constraintComponent = orientedEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.orientEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.orientEnabled);
      
      console.log(`Orient constraint ${this.orientEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Adjust the mix weight value
   */
  private adjustMixWeight(delta: number): void {
    this.mixWeight = Math.max(0.0, Math.min(1.0, this.mixWeight + delta));
    this.updateConstraint();
    console.log(`Mix weight: ${this.mixWeight.toFixed(1)}`);
  }
  
  /**
   * Adjust the offset rotation
   */
  private adjustOffsetRotation(axis: 'x' | 'y' | 'z', delta: number): void {
    // Update the offset rotation for the specified axis
    this.offsetRotation[axis] = (this.offsetRotation[axis] + delta) % 360;
    this.updateConstraint();
    console.log(`Offset rotation ${axis}: ${this.offsetRotation[axis].toFixed(1)}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.orientedEntityId === -1) return;
    
    const orientedEntity = this.world.getEntity(this.orientedEntityId);
    if (!orientedEntity) return;
    
    const constraintComponent = orientedEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Update the Orient constraint
    this.updateOrientConstraint(constraintComponent);
  }
  
  /**
   * Update the orient constraint with current settings
   */
  private updateOrientConstraint(constraintComponent: ConstraintComponent): void {
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Add the Orient constraint with current settings
    constraintComponent.addOrient(this.targetEntityId, {
      offset: this.offsetRotation,
      mixWeight: this.mixWeight,
      influence: 1.0,
      enabled: this.orientEnabled
    });
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      if (!this.world || this.orientedEntityId === -1) return;
      
      const orientedEntity = this.world.getEntity(this.orientedEntityId);
      if (!orientedEntity) return;
      
      const transform = orientedEntity.getComponent(Transform);
      if (!transform) return;
      
      // Format rotation to 1 decimal place
      const rot = `(${transform.rotation.x.toFixed(1)}°, ${transform.rotation.y.toFixed(1)}°, ${transform.rotation.z.toFixed(1)}°)`;
      const offset = `(${this.offsetRotation.x.toFixed(1)}°, ${this.offsetRotation.y.toFixed(1)}°, ${this.offsetRotation.z.toFixed(1)}°)`;
      
      this.statusText.setText(
        `Orient: ${this.orientEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Mix: ${this.mixWeight.toFixed(1)}\n` +
        `Offset: ${offset}\n` +
        `Rotation: ${rot}`
      );
    }
  }
} 
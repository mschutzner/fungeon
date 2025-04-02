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
 * Demo state for the TrackTo constraint
 */
export class TrackToDemo extends ConstraintDemoState {
  // Entities for this demo
  private targetEntityId: number = -1;
  private trackerEntityId: number = -1;
  
  // For UI status
  private trackToEnabled: boolean = true;
  private currentTrackAxis: Axis = Axis.POSITIVE_Y;
  
  constructor(engine: Engine) {
    super(
      'trackToDemo',
      engine,
      ConstraintType.TRACK_TO,
      'The TrackTo constraint makes an entity point one of its axes at another entity.',
      'WASD/QE: Move target\nT: Toggle tracking\nX/Y/Z: Change track axis\nESC: Return to Menu'
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
    
    // Create the tracker that will follow the target
    this.createTracker();
    
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
   * Create the tracker entity with TrackTo constraint
   */
  private createTracker(): void {
    if (!this.world) return;
    
    // Create a new entity for the tracker
    const trackerEntity = this.world.createEntity('tracker');
    
    // Add transform component - position away from the target
    trackerEntity.addComponent(new Transform(-2, 2, 0));
    
    // Add ThreeObject component
    trackerEntity.addComponent(new ThreeObject());
    
    // Add a debug axis mesh to visualize the tracking
    const meshComponent = new MeshComponent(GeometryType.DEBUG_AXIS);
    meshComponent.size.width = 2.0;  // Scale X axis
    meshComponent.size.height = 2.0; // Scale Y axis
    meshComponent.size.depth = 2.0;  // Scale Z axis
    trackerEntity.addComponent(meshComponent);
    
    // Add the TrackTo constraint
    if (this.targetEntityId !== -1) {
      console.log(`Setting up TrackTo constraint targeting entity ${this.targetEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      constraintComponent.addTrackTo(this.targetEntityId, {
        trackAxis: this.currentTrackAxis,
        influence: 1.0
      });
      
      trackerEntity.addComponent(constraintComponent);
      console.log('TrackTo constraint added to tracker entity');
    }
    
    // Store the entity ID for later reference
    this.trackerEntityId = trackerEntity.id;
    
    console.log('Tracker entity created with ID:', this.trackerEntityId);
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
          this.toggleTracking();
          break;
        case 'x':
          this.setTrackingAxis(Axis.POSITIVE_X);
          break;
        case 'y':
          this.setTrackingAxis(Axis.POSITIVE_Y);
          break;
        case 'z':
          this.setTrackingAxis(Axis.POSITIVE_Z);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the tracking constraint on/off
   */
  private toggleTracking(): void {
    if (!this.world || this.trackerEntityId === -1) return;
    
    const trackerEntity = this.world.getEntity(this.trackerEntityId);
    if (!trackerEntity) return;
    
    const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.trackToEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.trackToEnabled);
      
      console.log(`Tracking ${this.trackToEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Set which axis should track the target
   */
  private setTrackingAxis(axis: Axis): void {
    if (!this.world || this.trackerEntityId === -1) return;
    
    const trackerEntity = this.world.getEntity(this.trackerEntityId);
    if (!trackerEntity) return;
    
    const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove existing constraint at index 0 (if any)
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      constraintComponent.removeConstraint(0);
    }
    
    // Add new constraint with updated axis
    this.currentTrackAxis = axis;
    constraintComponent.addTrackTo(this.targetEntityId, {
      trackAxis: this.currentTrackAxis,
      influence: 1.0
    });
    
    console.log(`Track axis set to ${this.currentTrackAxis}`);
  }
  
  /**
   * Update the UI with constraint information
   */
  private updateConstraintUI(): void {
    if (!this.statusText || !this.world || this.trackerEntityId === -1) return;
    
    const trackerEntity = this.world.getEntity(this.trackerEntityId);
    if (!trackerEntity) return;
    
    const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      const status = `TrackTo: ${constraints[0].enabled ? 'ON' : 'OFF'}\nAxis: ${this.currentTrackAxis}`;
      this.statusText.setText(status);
    }
  }
} 
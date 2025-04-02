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
  ConstraintType
} from '../../ecs';

/**
 * Demo state for the Distance constraint
 */
export class DistanceDemo extends ConstraintDemoState {
  // Entities for this demo
  private targetEntityId: number = -1;
  private constrainedEntityId: number = -1;
  
  // For UI status
  private distanceEnabled: boolean = true;
  private minDistance: number = 2.0;
  private maxDistance: number = 5.0;
  private springiness: number = 0.5;
  
  // Visual helpers
  private minDistanceSphere: THREE.Mesh | null = null;
  private maxDistanceSphere: THREE.Mesh | null = null;
  
  constructor(engine: Engine) {
    super(
      'distanceDemo',
      engine,
      ConstraintType.DISTANCE,
      'The Distance constraint keeps an entity within a min/max distance range from another entity.',
      'WASD/QE: Move target\nT: Toggle constraint\n1/2: Decr/Incr min distance\n3/4: Decr/Incr max distance\n5/6: Adjust springiness\nESC: Return to Menu'
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
    
    // Create the constrained entity
    this.createConstrainedEntity();
    
    // Draw a distance indicator
    this.createDistanceIndicator();
    
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
    meshComponent.color = 0xff0000; // Red
    meshComponent.radius = 0.5;
    targetEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.targetEntityId = targetEntity.id;
    
    console.log('Target entity created with ID:', this.targetEntityId);
  }
  
  /**
   * Create the constrained entity with Distance constraint
   */
  private createConstrainedEntity(): void {
    if (!this.world) return;
    
    // Create a new entity
    const constrainedEntity = this.world.createEntity('constrained');
    
    // Add transform component - position away from the target
    constrainedEntity.addComponent(new Transform(3, 2, 0));
    
    // Add ThreeObject component
    constrainedEntity.addComponent(new ThreeObject());
    
    // Add a box mesh
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.color = 0x00ff00; // Green
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    constrainedEntity.addComponent(meshComponent);
    
    // Add the Distance constraint
    if (this.targetEntityId !== -1) {
      console.log(`Setting up Distance constraint targeting entity ${this.targetEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      constraintComponent.addDistance(this.targetEntityId, {
        minDistance: this.minDistance,
        maxDistance: this.maxDistance,
        springiness: this.springiness,
        influence: 1.0
      });
      
      constrainedEntity.addComponent(constraintComponent);
      console.log('Distance constraint added to constrained entity');
    }
    
    // Store the entity ID for later reference
    this.constrainedEntityId = constrainedEntity.id;
    
    console.log('Constrained entity created with ID:', this.constrainedEntityId);
  }
  
  /**
   * Create a visual indicator for the min/max distance
   */
  private createDistanceIndicator(): void {
    if (!this.world || !this.scene) return;
    
    // Create a unit sphere (radius 1) for min distance that we'll scale later
    const minDistanceGeometry = new THREE.SphereGeometry(1, 16, 8);
    const minDistanceMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.minDistanceSphere = new THREE.Mesh(minDistanceGeometry, minDistanceMaterial);
    this.scene.add(this.minDistanceSphere);
    
    // Create a unit sphere (radius 1) for max distance that we'll scale later
    const maxDistanceGeometry = new THREE.SphereGeometry(1, 16, 8);
    const maxDistanceMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.maxDistanceSphere = new THREE.Mesh(maxDistanceGeometry, maxDistanceMaterial);
    this.scene.add(this.maxDistanceSphere);
    
    // Set initial scale based on distances
    this.updateDistanceIndicatorVisuals();
    
    // Update the position of the distance indicators
    this.updateDistanceIndicators();
  }
  
  /**
   * Update the position of the distance indicators
   */
  private updateDistanceIndicators(): void {
    if (!this.world || !this.scene || this.targetEntityId === -1) return;
    
    // Get the target entity
    const targetEntity = this.world.getEntity(this.targetEntityId);
    if (!targetEntity) return;
    
    // Get the transform component
    const transform = targetEntity.getComponent(Transform);
    if (!transform) return;
    
    // Update the sphere positions to match the target position
    if (this.minDistanceSphere) {
      this.minDistanceSphere.position.set(transform.position.x, transform.position.y, transform.position.z);
    }
    
    if (this.maxDistanceSphere) {
      this.maxDistanceSphere.position.set(transform.position.x, transform.position.y, transform.position.z);
    }
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the target position based on keyboard input
    this.updateTargetPosition(deltaTime);
    
    // Update the distance indicators
    this.updateDistanceIndicators();
    
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
          this.toggleDistanceConstraint();
          break;
        case '1':
          this.adjustMinDistance(-0.5);
          break;
        case '2':
          this.adjustMinDistance(0.5);
          break;
        case '3':
          this.adjustMaxDistance(-0.5);
          break;
        case '4':
          this.adjustMaxDistance(0.5);
          break;
        case '5':
          this.adjustSpringiness(-0.1);
          break;
        case '6':
          this.adjustSpringiness(0.1);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the distance constraint on/off
   */
  private toggleDistanceConstraint(): void {
    if (!this.world || this.constrainedEntityId === -1) return;
    
    const constrainedEntity = this.world.getEntity(this.constrainedEntityId);
    if (!constrainedEntity) return;
    
    const constraintComponent = constrainedEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.distanceEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.distanceEnabled);
      
      console.log(`Distance constraint ${this.distanceEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Adjust the minimum distance
   */
  private adjustMinDistance(delta: number): void {
    this.minDistance = Math.max(0.1, this.minDistance + delta);
    
    // Make sure min distance doesn't exceed max
    if (this.minDistance > this.maxDistance) {
      this.minDistance = this.maxDistance;
    }
    
    this.updateConstraint();
    this.updateDistanceIndicators();
    console.log(`Min distance: ${this.minDistance.toFixed(1)}`);
  }
  
  /**
   * Adjust the maximum distance
   */
  private adjustMaxDistance(delta: number): void {
    this.maxDistance = Math.max(this.minDistance, this.maxDistance + delta);
    this.updateConstraint();
    this.updateDistanceIndicators();
    console.log(`Max distance: ${this.maxDistance.toFixed(1)}`);
  }
  
  /**
   * Adjust the springiness value
   */
  private adjustSpringiness(delta: number): void {
    this.springiness = Math.max(0.0, Math.min(1.0, this.springiness + delta));
    this.updateConstraint();
    console.log(`Springiness: ${this.springiness.toFixed(1)}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.constrainedEntityId === -1) return;
    
    const constrainedEntity = this.world.getEntity(this.constrainedEntityId);
    if (!constrainedEntity) return;
    
    const constraintComponent = constrainedEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Add updated constraint
    constraintComponent.addDistance(this.targetEntityId, {
      minDistance: this.minDistance,
      maxDistance: this.maxDistance,
      springiness: this.springiness,
      influence: 1.0,
      enabled: this.distanceEnabled
    });
    
    // Update the visual representation
    this.updateDistanceIndicatorVisuals();
  }
  
  /**
   * Update the distance indicator meshes to reflect new distances
   */
  private updateDistanceIndicatorVisuals(): void {
    if (!this.scene) return;
    
    // Update min distance sphere scale
    if (this.minDistanceSphere) {
      // Set scale to match the min distance (unit sphere has radius 1)
      this.minDistanceSphere.scale.set(this.minDistance, this.minDistance, this.minDistance);
    }
    
    // Update max distance sphere scale
    if (this.maxDistanceSphere) {
      // Set scale to match the max distance (unit sphere has radius 1)
      this.maxDistanceSphere.scale.set(this.maxDistance, this.maxDistance, this.maxDistance);
    }
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      this.statusText.setText(
        `Distance: ${this.distanceEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Min: ${this.minDistance.toFixed(1)}, Max: ${this.maxDistance.toFixed(1)}\n` +
        `Springiness: ${this.springiness.toFixed(1)}`
      );
    }
  }
} 
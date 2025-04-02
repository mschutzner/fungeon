import * as THREE from 'three';
import { ConstraintDemoState } from './ConstraintDemoState';
import { Engine } from '../Engine';
import { InputEventType } from '../input/InputManager';
import {
  Entity,
  IEntity,
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
 * Demo state for the Floor constraint
 */
export class FloorDemo extends ConstraintDemoState {
  // Entities for this demo
  private bouncyEntityId: number = -1;
  private floorEntityId: number = -1;
  
  // Floor constraint parameters
  private floorEnabled: boolean = true;
  private floorHeight: number = 0;
  
  // Physics simulation
  private velocity: Vector3 = new Vector3(0, 0, 0);
  private gravity: number = 9.8;
  private lastTime: number = 0;
  
  // Entity properties
  private sphereRadius: number = 0.5;
  
  // Visual helpers
  private floorIndicator: THREE.Mesh | null = null;
  private heightLine: THREE.Line | null = null;
  
  constructor(engine: Engine) {
    super(
      'floorDemo',
      engine,
      ConstraintType.FLOOR,
      'The Floor constraint keeps an entity above a specified height, with an offset for collision size.',
      'WASD: Move entity\nSPACE: Jump\nT: Toggle constraint\n1/2: Adjust floor height\nESC: Return to Menu'
    );
  }
  
  /**
   * Set up the demo-specific entities and constraints
   */
  protected setupDemo(): void {
    // Don't create grid directly since we'll make it a child of the floor
    // this.createGrid();
    
    // Create the floor entity (which will also create the grid)
    this.createFloorEntity();
    
    // Create the bouncy entity
    this.createBouncyEntity();
    
    // Create visual helpers
    this.createVisualHelpers();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
    
    // Initialize time for physics calculations
    this.lastTime = performance.now() / 1000;
  }
  
  /**
   * Create the floor entity
   */
  private createFloorEntity(): void {
    if (!this.world || !this.threeSceneSystem) return;
    
    // Create a new entity for the floor
    const floorEntity = this.world.createEntity('floor');
    
    // Add transform component with position at the floor height
    floorEntity.addComponent(new Transform(0, this.floorHeight, 0));
    
    // Add ThreeObject component
    floorEntity.addComponent(new ThreeObject());
    
    // Add mesh component - flat pane for the floor
    const meshComponent = new MeshComponent(GeometryType.PANE);
    meshComponent.wireframe = false;
    meshComponent.color = 0x3366cc; // Blue floor
    meshComponent.size.width = 20;
    meshComponent.size.height = 20;
    floorEntity.addComponent(meshComponent);
    
    // Rotate the plane to be horizontal
    const transform = floorEntity.getComponent(Transform);
    if (transform) {
      transform.rotation.x = -90; // Rotate the plane to be horizontal
    }
    
    // Store the entity ID for later reference
    this.floorEntityId = floorEntity.id;
    
    console.log('Floor entity created with ID:', this.floorEntityId);
    
    // Now create the grid as a child of the floor
    this.createGridAsChild(floorEntity);
  }
  
  /**
   * Create a grid entity as a child of the floor
   * @param parentEntity The parent floor entity
   */
  private createGridAsChild(parentEntity: IEntity): void {
    if (!this.world || !this.threeSceneSystem) return;
    
    // Create a new entity for the grid
    const gridEntity = this.world.createEntity('grid');
    
    // Add transform component with a small offset above the floor
    // We need a slight Y offset to prevent Z-fighting
    gridEntity.addComponent(new Transform(0, 0, 0.05));
    
    // Add ThreeObject component
    gridEntity.addComponent(new ThreeObject());
    
    // Add mesh componen - grid for visual reference
    const meshComponent = new MeshComponent(GeometryType.GRID);
    meshComponent.color = 0x444444;
    meshComponent.size.width = 20;
    meshComponent.size.depth = 20;
    meshComponent.segments = 20; // Number of grid divisions
    gridEntity.addComponent(meshComponent);
    
    // Make the grid a child of the floor entity
    this.threeSceneSystem.setParent(gridEntity, parentEntity);
    
    // Rotate the plane to be horizontal
    const transform = gridEntity.getComponent(Transform);
    if (transform) {
      transform.rotation.x = 90; // Rotate the plane to be horizontal
    }
    
    console.log('Grid entity created as child of floor');
  }
  
  /**
   * Create the entity with Floor constraint
   */
  private createBouncyEntity(): void {
    if (!this.world) return;
    
    // Create a new entity
    const entity = this.world.createEntity('sphere');
    
    // Add transform component - position above the floor
    entity.addComponent(new Transform(0, this.floorHeight + 3, 0));
    
    // Add ThreeObject component
    entity.addComponent(new ThreeObject());
    
    // Add a sphere mesh
    const meshComponent = new MeshComponent(GeometryType.SPHERE);
    meshComponent.color = 0xff5500; // Orange
    meshComponent.radius = this.sphereRadius;
    entity.addComponent(meshComponent);
    
    // Add the Floor constraint
    console.log(`Setting up Floor constraint at height ${this.floorHeight} with offset ${this.sphereRadius}`);
    
    const constraintComponent = new ConstraintComponent();
    constraintComponent.addFloor(this.floorHeight, {
      bounceAmount: 0, // No bounce
      offset: this.sphereRadius, // Use the sphere radius as the offset
      enabled: this.floorEnabled
    });
    
    entity.addComponent(constraintComponent);
    console.log('Floor constraint added to entity');
    
    // Store the entity ID for later reference
    this.bouncyEntityId = entity.id;
    
    console.log('Entity created with ID:', this.bouncyEntityId);
  }
  
  /**
   * Create visual helpers for the floor constraint
   */
  private createVisualHelpers(): void {
    if (!this.scene) return;
    
    // Create a line to show the height
    const heightGeometry = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(0, -10, 0),
      new THREE.Vector3(0, 10, 0)
    ];
    heightGeometry.setFromPoints(points);
    
    const heightMaterial = new THREE.LineDashedMaterial({
      color: 0xffff00,
      dashSize: 0.3,
      gapSize: 0.1,
      linewidth: 1
    });
    
    this.heightLine = new THREE.Line(heightGeometry, heightMaterial);
    this.heightLine.computeLineDistances(); // Required for dashed lines
    this.scene.add(this.heightLine);
    
    // Update visual helpers
    this.updateVisualHelpers();
  }
  
  /**
   * Update visual helpers based on current settings
   */
  private updateVisualHelpers(): void {
    if (!this.world || !this.scene || !this.threeSceneSystem) return;
    
    // Update floor entity position
    const floorEntity = this.world.getEntity(this.floorEntityId);
    if (floorEntity) {
      const transform = floorEntity.getComponent(Transform);
      if (transform) {
        transform.position.y = this.floorHeight;
      }
    }
    
    // Update height line position at x=5
    if (this.heightLine) {
      // Update line position to be at x=5 instead of center
      const positions = this.heightLine.geometry.attributes.position.array as Float32Array;
      
      // Bottom point
      positions[0] = 5;
      positions[1] = -5;
      positions[2] = 0;
      
      // Top point
      positions[3] = 5;
      positions[4] = 5;
      positions[5] = 0;
      
      this.heightLine.geometry.attributes.position.needsUpdate = true;
      this.heightLine.computeLineDistances(); // Required for dashed lines
      
      // Add a marker at the floor height
      const markerGeometry = new THREE.SphereGeometry(0.1, 16, 8);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      
      if (this.floorIndicator) {
        this.scene.remove(this.floorIndicator);
      }
      
      this.floorIndicator = new THREE.Mesh(markerGeometry, markerMaterial);
      this.floorIndicator.position.set(5, this.floorHeight, 0);
      this.scene.add(this.floorIndicator);
    }
  }
  
  /**
   * Update demo-specific logic
   * @param deltaTime Time since last frame in seconds
   */
  protected updateDemo(deltaTime: number): void {
    // Get current time
    const currentTime = performance.now() / 1000;
    const frameDelta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update the entity position based on physics and keyboard input
    this.updateBouncyEntity(frameDelta);
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update entity based on physics and input
   */
  private updateBouncyEntity(deltaTime: number): void {
    if (!this.world || this.bouncyEntityId === -1) return;
    
    // Get the entity
    const entity = this.world.getEntity(this.bouncyEntityId);
    if (!entity) return;
    
    // Get the transform component
    const transform = entity.getComponent(Transform);
    if (!transform) return;
    
    // Apply gravity to velocity
    this.velocity.y -= this.gravity * deltaTime;
    
    // Apply horizontal movement based on keyboard input
    const moveSpeed = 5 * deltaTime;
    
    if (this.inputManager.isKeyDown('a')) {
      this.velocity.x = -moveSpeed * 5;
    } else if (this.inputManager.isKeyDown('d')) {
      this.velocity.x = moveSpeed * 5;
    } else {
      // Apply horizontal damping
      this.velocity.x *= 0.9;
    }
    
    if (this.inputManager.isKeyDown('w')) {
      this.velocity.z = -moveSpeed * 5;
    } else if (this.inputManager.isKeyDown('s')) {
      this.velocity.z = moveSpeed * 5;
    } else {
      // Apply forward/backward damping
      this.velocity.z *= 0.9;
    }
    
    // Apply velocity to position
    transform.position.x += this.velocity.x * deltaTime;
    transform.position.y += this.velocity.y * deltaTime;
    transform.position.z += this.velocity.z * deltaTime;
    
    // No manual floor handling - when constraint is disabled, the sphere will fall through
  }
  
  /**
   * Subscribe to keyboard events for constraint configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 't':
          this.toggleFloorConstraint();
          break;
        case '1':
          this.adjustFloorHeight(-0.5);
          break;
        case '2':
          this.adjustFloorHeight(0.5);
          break;
        case ' ':
        case 'space':
          this.jump();
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Make the entity jump
   */
  private jump(): void {
    if (!this.world || this.bouncyEntityId === -1) return;
    
    const entity = this.world.getEntity(this.bouncyEntityId);
    if (!entity) return;
    
    const transform = entity.getComponent(Transform);
    if (!transform) return;
    
    // Only allow jumping when on or near the floor
    const effectiveFloorHeight = this.floorHeight + this.sphereRadius;
    if (transform.position.y <= effectiveFloorHeight + 0.1) {
      this.velocity.y = 10; // Jump force
      console.log('Jump!');
    }
  }
  
  /**
   * Toggle the floor constraint on/off
   */
  private toggleFloorConstraint(): void {
    if (!this.world || this.bouncyEntityId === -1) return;
    
    const entity = this.world.getEntity(this.bouncyEntityId);
    if (!entity) return;
    
    const constraintComponent = entity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.floorEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.floorEnabled);
      
      console.log(`Floor constraint ${this.floorEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Adjust the floor height
   */
  private adjustFloorHeight(delta: number): void {
    this.floorHeight = Math.max(-5, Math.min(5, this.floorHeight + delta));
    this.updateConstraint();
    this.updateVisualHelpers();
    console.log(`Floor height adjusted to: ${this.floorHeight.toFixed(1)}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.bouncyEntityId === -1) return;
    
    const entity = this.world.getEntity(this.bouncyEntityId);
    if (!entity) return;
    
    const constraintComponent = entity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Add updated constraint
    constraintComponent.addFloor(this.floorHeight, {
      bounceAmount: 0, // No bounce
      offset: this.sphereRadius, // Use the sphere radius as the offset
      enabled: this.floorEnabled
    });
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (!this.statusText || !this.world) return;
    
    // Get entity height
    let entityHeight = 0;
    let heightAboveFloor = 0;
    
    const entity = this.world.getEntity(this.bouncyEntityId);
    if (entity) {
      const transform = entity.getComponent(Transform);
      if (transform) {
        entityHeight = transform.position.y;
        heightAboveFloor = entityHeight - (this.floorHeight + this.sphereRadius);
      }
    }
    
    this.statusText.setText(
      `Floor: ${this.floorEnabled ? 'Enabled' : 'Disabled'}\n` +
      `Floor Height: ${this.floorHeight.toFixed(1)}\n` +
      `Offset: ${this.sphereRadius.toFixed(1)}\n` +
      `Entity Height: ${entityHeight.toFixed(1)}\n` +
      `Height Above Floor: ${heightAboveFloor.toFixed(1)}`
    );
  }
  
  /**
   * Clean up demo resources before exiting
   */
  public override exit(): Promise<void> {
    // Remove visual helpers from the scene
    if (this.scene) {
      if (this.heightLine) {
        this.scene.remove(this.heightLine);
        this.heightLine = null;
      }
      if (this.floorIndicator) {
        this.scene.remove(this.floorIndicator);
        this.floorIndicator = null;
      }
    }
    
    // Call parent exit method
    return super.exit();
  }
} 
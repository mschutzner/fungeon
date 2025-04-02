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
  Axis
} from '../../ecs';

/**
 * Demo state for the Pivot constraint
 */
export class PivotDemo extends ConstraintDemoState {
  // Entities for this demo
  private pivotEntityId: number = -1;
  private orbitingEntityId: number = -1;
  
  // Pivot constraint parameters
  private angle: number = 0;
  private radius: number = 2;
  private pivotAxis: Vector3 = new Vector3(0, 0, 1); // Default to Y-up
  private pivotAxisEnum: Axis = Axis.POSITIVE_Z; // Default to Y-up
  private rotationSpeed: number = 45; // Degrees per second
  private autoRotate: boolean = true;
  private pivotEnabled: boolean = true;
  private lastConstraintUpdate: number = 0;
  
  // Visual helpers
  private pivotAxisHelper: THREE.ArrowHelper | null = null;
  private pivotCircle: THREE.Line | null = null;
  
  constructor(engine: Engine) {
    super(
      'pivotDemo',
      engine,
      ConstraintType.PIVOT,
      'The Pivot constraint makes an entity orbit around a pivot point.',
      'WASD/QE: Move pivot point\nR: Toggle auto-rotation\nP: Toggle pivot constraint\nX/Y/Z: Change pivot axis\n+/-: Change radius\nESC: Return to Menu'
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
    
    // Create the pivot entity
    this.createPivotEntity();
    
    // Create the orbiting entity
    this.createOrbitingEntity();
    
    // Create visual helpers for the pivot
    this.createPivotVisuals();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create the pivot entity (center of orbit)
   */
  private createPivotEntity(): void {
    if (!this.world) return;
    
    // Create a new entity for the pivot
    const pivotEntity = this.world.createEntity('pivot');
    
    // Add transform component with position
    pivotEntity.addComponent(new Transform(0, 2, 0));
    
    // Add ThreeObject component
    pivotEntity.addComponent(new ThreeObject());
    
    // Add mesh component - sphere for the pivot point
    const meshComponent = new MeshComponent(GeometryType.SPHERE);
    meshComponent.size = { width: 0.5, height: 0.5, depth: 0.5 };
    meshComponent.color = 0xFF0000; // Red pivot point
    pivotEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.pivotEntityId = pivotEntity.id;
    
    console.log('Pivot entity created with ID:', this.pivotEntityId);
  }
  
  /**
   * Create the entity with Pivot constraint
   */
  private createOrbitingEntity(): void {
    if (!this.world) return;
    
    // Create a new entity
    const orbitingEntity = this.world.createEntity('orbiting');
    
    // Add transform component with initial position based on the radius
    // Position depends on the pivot axis we're using
    let initialPos: [number, number, number] = [0, 0, 0];
    if (this.pivotAxisEnum === Axis.POSITIVE_Y) {
      initialPos = [this.radius, 2, 0]; // Orbit in XZ plane
    } else if (this.pivotAxisEnum === Axis.POSITIVE_X) {
      initialPos = [0, this.radius, 2]; // Orbit in YZ plane
    } else {
      initialPos = [0, 2, this.radius]; // Orbit in XY plane
    }
    
    orbitingEntity.addComponent(new Transform(...initialPos));
    
    // Add ThreeObject component
    orbitingEntity.addComponent(new ThreeObject());
    
    // Add mesh component - box for the orbiting object
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.size = { width: 0.7, height: 0.7, depth: 0.7 };
    meshComponent.color = 0x00AAFF; // Blue orbiter
    orbitingEntity.addComponent(meshComponent);
    
    // Add the Pivot constraint
    if (this.pivotEntityId !== -1) {
      console.log(`Setting up Pivot constraint with pivot entity ${this.pivotEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      this.updatePivotConstraint(constraintComponent);
      
      orbitingEntity.addComponent(constraintComponent);
      console.log('Pivot constraint added to entity');
    }
    
    // Store the entity ID for later reference
    this.orbitingEntityId = orbitingEntity.id;
    
    console.log('Orbiting entity created with ID:', this.orbitingEntityId);
  }
  
  /**
   * Create visual helpers to show the pivot axis and orbit circle
   */
  private createPivotVisuals(): void {
    if (!this.scene || !this.world || this.pivotEntityId === -1) return;
    
    const pivotEntity = this.world.getEntity(this.pivotEntityId);
    if (!pivotEntity) return;
    
    const transform = pivotEntity.getComponent(Transform);
    if (!transform) return;
    
    // Create arrow helper to show pivot axis
    const originPos = new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z);
    const axisDir = new THREE.Vector3(this.pivotAxis.x, this.pivotAxis.y, this.pivotAxis.z);
    axisDir.normalize();
    
    this.pivotAxisHelper = new THREE.ArrowHelper(
      axisDir,
      originPos,
      2,
      0xFFFF00, // Yellow arrow
      0.3,      // Head length
      0.2       // Head width
    );
    this.scene.add(this.pivotAxisHelper);
    
    // Create a circle to show the orbit path
    const circleGeometry = new THREE.BufferGeometry();
    const circleSegments = 64;
    const circlePoints: THREE.Vector3[] = [];
    
    // Calculate orbit circle points
    this.updateOrbitCirclePoints(circlePoints, originPos, circleSegments);
    
    circleGeometry.setFromPoints(circlePoints);
    
    const circleMaterial = new THREE.LineBasicMaterial({ color: 0xFFFF00, opacity: 0.5, transparent: true });
    this.pivotCircle = new THREE.Line(circleGeometry, circleMaterial);
    this.scene.add(this.pivotCircle);
  }
  
  /**
   * Calculate points for the orbit circle based on pivot position and axis
   */
  private updateOrbitCirclePoints(points: THREE.Vector3[], pivotPos: THREE.Vector3, segments: number): void {
    // Get axis as THREE.Vector3
    const axis = new THREE.Vector3(this.pivotAxis.x, this.pivotAxis.y, this.pivotAxis.z).normalize();
    
    // We need a perpendicular vector to the axis to start our circle
    const perpVector = new THREE.Vector3(1, 0, 0);
    
    // If axis is too close to our perpendicular vector, choose a different one
    if (Math.abs(axis.dot(perpVector)) > 0.9) {
      perpVector.set(0, 1, 0);
      if (Math.abs(axis.dot(perpVector)) > 0.9) {
        perpVector.set(0, 0, 1);
      }
    }
    
    // Calculate perpendicular vectors to define the circle plane
    const radialVector = new THREE.Vector3().crossVectors(axis, perpVector).normalize();
    const tangentVector = new THREE.Vector3().crossVectors(radialVector, axis).normalize();
    
    // Calculate points on the circle
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = radialVector.clone().multiplyScalar(Math.cos(angle) * this.radius);
      const y = tangentVector.clone().multiplyScalar(Math.sin(angle) * this.radius);
      const point = new THREE.Vector3().addVectors(pivotPos, x).add(y);
      points.push(point);
    }
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Only update angle if auto-rotate is enabled
    if (this.autoRotate) {
      // Update angle in degrees - constraint system uses degrees
      this.angle = (this.angle + this.rotationSpeed * deltaTime) % 360;
      
      // Update constraint only if it's been at least 50ms
      // This reduces jitter by preventing too-frequent updates
      this.lastConstraintUpdate += deltaTime * 1000;
      if (this.lastConstraintUpdate >= 50) {
        this.updateConstraint();
        this.lastConstraintUpdate = 0;
      }
    }
    
    // Update pivot position based on keyboard input
    this.updatePivotTransform(deltaTime);
    
    // Update pivot visuals
    this.updatePivotVisuals();
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the pivot's transform based on keyboard input
   */
  private updatePivotTransform(deltaTime: number): void {
    if (!this.world || this.pivotEntityId === -1) return;
    
    // Get the pivot entity
    const pivotEntity = this.world.getEntity(this.pivotEntityId);
    if (!pivotEntity) return;
    
    // Get the transform component
    const transform = pivotEntity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 3 * deltaTime;
    
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
    
    // When the pivot moves, update the constraint
    this.updateConstraint();
  }
  
  /**
   * Update the pivot visuals when pivot changes
   */
  private updatePivotVisuals(): void {
    if (!this.scene || !this.world || this.pivotEntityId === -1) return;
    
    const pivotEntity = this.world.getEntity(this.pivotEntityId);
    if (!pivotEntity) return;
    
    const transform = pivotEntity.getComponent(Transform);
    if (!transform) return;
    
    // Update the pivot axis arrow
    if (this.pivotAxisHelper) {
      const pivotPos = new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z);
      this.pivotAxisHelper.position.copy(pivotPos);
      
      const axisDir = new THREE.Vector3(this.pivotAxis.x, this.pivotAxis.y, this.pivotAxis.z);
      axisDir.normalize();
      this.pivotAxisHelper.setDirection(axisDir);
    }
    
    // Update the orbit circle
    if (this.pivotCircle) {
      this.scene.remove(this.pivotCircle);
      
      const circleGeometry = new THREE.BufferGeometry();
      const circleSegments = 64;
      const circlePoints: THREE.Vector3[] = [];
      
      const pivotPos = new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z);
      this.updateOrbitCirclePoints(circlePoints, pivotPos, circleSegments);
      
      circleGeometry.setFromPoints(circlePoints);
      
      const circleMaterial = new THREE.LineBasicMaterial({ color: 0xFFFF00, opacity: 0.5, transparent: true });
      this.pivotCircle = new THREE.Line(circleGeometry, circleMaterial);
      this.scene.add(this.pivotCircle);
    }
  }
  
  /**
   * Subscribe to keyboard events for constraint toggling and configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 'r':
          this.toggleAutoRotate();
          break;
        case 'p':
          this.togglePivot();
          break;
        case 'x':
          this.setPivotAxis('x');
          break;
        case 'y':
          this.setPivotAxis('y');
          break;
        case 'z':
          this.setPivotAxis('z');
          break;
        case '+':
        case '=':
          this.adjustRadius(0.5);
          break;
        case '-':
          this.adjustRadius(-0.5);
          break;
        case 'm':
          this.adjustRotationSpeed(-5);
          break;
        case 'n':
          this.adjustRotationSpeed(5);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle auto-rotation on/off
   */
  private toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
    console.log(`Auto-rotation ${this.autoRotate ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle the pivot constraint on/off
   */
  private togglePivot(): void {
    if (!this.world || this.orbitingEntityId === -1) return;
    
    const orbitingEntity = this.world.getEntity(this.orbitingEntityId);
    if (!orbitingEntity) return;
    
    const constraintComponent = orbitingEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.pivotEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.pivotEnabled);
      
      console.log(`Pivot constraint ${this.pivotEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Set the pivot axis to a specific direction
   */
  private setPivotAxis(axis: 'x' | 'y' | 'z'): void {
    // Update the Vector3 representation for visuals
    this.pivotAxis.set(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0, 
      axis === 'z' ? 1 : 0
    );
    
    // Update the axis enum for the constraint
    switch (axis) {
      case 'x':
        this.pivotAxisEnum = Axis.POSITIVE_X;
        break;
      case 'y':
        this.pivotAxisEnum = Axis.POSITIVE_Y;
        break;
      case 'z':
        this.pivotAxisEnum = Axis.POSITIVE_Z;
        break;
    }
    
    // Force an immediate constraint update when changing axis
    this.updateConstraint();
    console.log(`Pivot axis set to ${axis}`);
  }
  
  /**
   * Adjust the orbit radius
   */
  private adjustRadius(delta: number): void {
    this.radius = Math.max(1.0, this.radius + delta);
    this.updateConstraint();
    console.log(`Radius adjusted to ${this.radius.toFixed(1)}`);
  }
  
  /**
   * Adjust the rotation speed
   */
  private adjustRotationSpeed(delta: number): void {
    this.rotationSpeed = Math.max(5, this.rotationSpeed + delta);
    console.log(`Rotation speed adjusted to ${this.rotationSpeed.toFixed(1)} deg/s`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.orbitingEntityId === -1) return;
    
    const orbitingEntity = this.world.getEntity(this.orbitingEntityId);
    if (!orbitingEntity) return;
    
    const constraintComponent = orbitingEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Update the Pivot constraint
    this.updatePivotConstraint(constraintComponent);
  }
  
  /**
   * Update the pivot constraint with current settings
   */
  private updatePivotConstraint(constraintComponent: ConstraintComponent): void {
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    if (!this.world || this.pivotEntityId === -1) return;
    
    const pivotEntity = this.world.getEntity(this.pivotEntityId);
    if (!pivotEntity) return;
    
    // Get the pivot position from the entity's transform
    const pivotTransform = pivotEntity.getComponent(Transform);
    if (!pivotTransform) return;
    
    // Create a Vector3 with the pivot position
    const pivotPosition = new Vector3(
      pivotTransform.position.x,
      pivotTransform.position.y,
      pivotTransform.position.z
    );
    
    // Add the Pivot constraint with current settings
    constraintComponent.addPivot(pivotPosition, {
      rotationAxis: this.pivotAxisEnum,
      radius: this.radius,
      rotationSpeed: this.autoRotate ? this.rotationSpeed : 0,
      currentAngle: this.angle, // Already in degrees
      enabled: this.pivotEnabled,
      influence: 1.0
    });
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      if (!this.world || this.orbitingEntityId === -1) return;
      
      const orbitingEntity = this.world.getEntity(this.orbitingEntityId);
      if (!orbitingEntity) return;
      
      const transform = orbitingEntity.getComponent(Transform);
      if (!transform) return;
      
      // Format position to 1 decimal place
      const pos = `(${transform.position.x.toFixed(1)}, ${transform.position.y.toFixed(1)}, ${transform.position.z.toFixed(1)})`;
      const axisText = `(${this.pivotAxis.x}, ${this.pivotAxis.y}, ${this.pivotAxis.z})`;
      
      // Get the constraint component to check actual angle
      const constraintComponent = orbitingEntity.getComponent(ConstraintComponent);
      let currentConstraintAngle = this.angle.toFixed(1);
      if (constraintComponent) {
        const pivotConstraints = constraintComponent.getConstraints()
          .filter(c => c.type === ConstraintType.PIVOT);
        if (pivotConstraints.length > 0) {
          const pivotConstraint = pivotConstraints[0] as any;
          if (pivotConstraint.currentAngle !== undefined) {
            currentConstraintAngle = pivotConstraint.currentAngle.toFixed(1);
          }
        }
      }
      
      this.statusText.setText(
        `Pivot: ${this.pivotEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Auto-rotate: ${this.autoRotate ? 'Enabled' : 'Disabled'}\n` +
        `Radius: ${this.radius.toFixed(1)}\n` +
        `Axis: ${axisText}\n` +
        `Angle: ${currentConstraintAngle}°\n` +
        `Speed: ${this.rotationSpeed.toFixed(1)} deg/s\n` +
        `Position: ${pos}`
      );
    }
  }
  
  /**
   * Clean up demo resources before exiting
   */
  public override exit(): Promise<void> {
    // Remove visual helpers from the scene
    if (this.scene) {
      if (this.pivotAxisHelper) {
        this.scene.remove(this.pivotAxisHelper);
        this.pivotAxisHelper = null;
      }
      if (this.pivotCircle) {
        this.scene.remove(this.pivotCircle);
        this.pivotCircle = null;
      }
    }
    
    // Call parent exit method
    return super.exit();
  }
} 
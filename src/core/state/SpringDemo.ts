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
  Vector3
} from '../../ecs';

/**
 * Demo state for the Spring constraint
 */
export class SpringDemo extends ConstraintDemoState {
  // Entities for this demo
  private anchorEntityId: number = -1;
  private springEntityId: number = -1;
  
  // Spring constraint parameters
  private springEnabled: boolean = true;
  private restLength: number = 2.0;
  private stiffness: number = 20;
  private damping: number = 0;
  
  // Visual helpers
  private springLine: THREE.Line | null = null;
  private restLengthIndicator: THREE.Line | null = null;
  
  constructor(engine: Engine) {
    super(
      'springDemo',
      engine,
      ConstraintType.SPRING,
      'The Spring constraint creates a springy connection between two entities.',
      'WASD/QE: Move anchor\nT: Toggle constraint\n1/2: Adjust rest length\n3/4: Adjust stiffness\n5/6: Adjust damping\nESC: Return to Menu'
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
    
    // Create the anchor entity
    this.createAnchorEntity();
    
    // Create the spring entity
    this.createSpringEntity();
    
    // Create visual helpers
    this.createVisualHelpers();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create the anchor entity (fixed point)
   */
  private createAnchorEntity(): void {
    if (!this.world) return;
    
    // Create a new entity for the anchor
    const anchorEntity = this.world.createEntity('anchor');
    
    // Add transform component with position
    anchorEntity.addComponent(new Transform(0, 2, 0));
    
    // Add ThreeObject component
    anchorEntity.addComponent(new ThreeObject());
    
    // Add mesh component - sphere for the anchor
    const meshComponent = new MeshComponent(GeometryType.SPHERE);
    meshComponent.color = 0xff0000; // Red anchor
    meshComponent.radius = 0.5;
    anchorEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.anchorEntityId = anchorEntity.id;
    
    console.log('Anchor entity created with ID:', this.anchorEntityId);
  }
  
  /**
   * Create the spring entity with Spring constraint
   */
  private createSpringEntity(): void {
    if (!this.world) return;
    
    // Create a new entity
    const springEntity = this.world.createEntity('spring');
    
    // Add transform component - position away from the anchor
    springEntity.addComponent(new Transform(this.restLength, 2, 0));
    
    // Add ThreeObject component
    springEntity.addComponent(new ThreeObject());
    
    // Add a box mesh
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.color = 0x00ffff; // Cyan
    meshComponent.size = { width: 0.8, height: 0.8, depth: 0.8 };
    springEntity.addComponent(meshComponent);
    
    // Add the Spring constraint
    if (this.anchorEntityId !== -1) {
      console.log(`Setting up Spring constraint with anchor entity ${this.anchorEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      constraintComponent.addSpring(this.anchorEntityId, {
        restLength: this.restLength,
        stiffness: this.stiffness,
        damping: this.damping,
        enabled: this.springEnabled
      });
      
      springEntity.addComponent(constraintComponent);
      console.log('Spring constraint added to spring entity');
    }
    
    // Store the entity ID for later reference
    this.springEntityId = springEntity.id;
    
    console.log('Spring entity created with ID:', this.springEntityId);
  }
  
  /**
   * Create visual helpers for the spring
   */
  private createVisualHelpers(): void {
    if (!this.scene) return;
    
    // Create line to represent the spring
    const springGeometry = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ];
    springGeometry.setFromPoints(points);
    
    const springMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2
    });
    
    this.springLine = new THREE.Line(springGeometry, springMaterial);
    this.scene.add(this.springLine);
    
    // Create line to show the rest length
    const restLengthGeometry = new THREE.BufferGeometry();
    const restPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ];
    restLengthGeometry.setFromPoints(restPoints);
    
    const restLengthMaterial = new THREE.LineDashedMaterial({
      color: 0xffff00,
      dashSize: 0.2,
      gapSize: 0.1,
      linewidth: 1
    });
    
    this.restLengthIndicator = new THREE.Line(restLengthGeometry, restLengthMaterial);
    this.restLengthIndicator.computeLineDistances(); // Required for dashed lines
    this.scene.add(this.restLengthIndicator);
    
    // Update the visuals initially
    this.updateVisualHelpers();
  }
  
  /**
   * Update the visual helpers
   */
  private updateVisualHelpers(): void {
    if (!this.world || !this.scene) return;
    
    const anchorEntity = this.world.getEntity(this.anchorEntityId);
    const springEntity = this.world.getEntity(this.springEntityId);
    
    if (!anchorEntity || !springEntity) return;
    
    const anchorTransform = anchorEntity.getComponent(Transform);
    const springTransform = springEntity.getComponent(Transform);
    
    if (!anchorTransform || !springTransform) return;
    
    // Get positions
    const anchorPos = new THREE.Vector3(
      anchorTransform.position.x,
      anchorTransform.position.y,
      anchorTransform.position.z
    );
    
    const springPos = new THREE.Vector3(
      springTransform.position.x,
      springTransform.position.y,
      springTransform.position.z
    );
    
    // Update the spring line
    if (this.springLine) {
      const springGeometry = this.springLine.geometry as THREE.BufferGeometry;
      const positions = springGeometry.attributes.position.array as Float32Array;
      
      positions[0] = anchorPos.x;
      positions[1] = anchorPos.y;
      positions[2] = anchorPos.z;
      positions[3] = springPos.x;
      positions[4] = springPos.y;
      positions[5] = springPos.z;
      
      springGeometry.attributes.position.needsUpdate = true;
    }
    
    // Update the rest length indicator
    if (this.restLengthIndicator) {
      // Calculate direction vector from anchor to spring
      const dir = new THREE.Vector3().subVectors(springPos, anchorPos).normalize();
      
      // Calculate endpoint based on rest length
      const endPoint = new THREE.Vector3().copy(anchorPos).addScaledVector(dir, this.restLength);
      
      const restGeometry = this.restLengthIndicator.geometry as THREE.BufferGeometry;
      const positions = restGeometry.attributes.position.array as Float32Array;
      
      positions[0] = anchorPos.x;
      positions[1] = anchorPos.y;
      positions[2] = anchorPos.z;
      positions[3] = endPoint.x;
      positions[4] = endPoint.y;
      positions[5] = endPoint.z;
      
      restGeometry.attributes.position.needsUpdate = true;
      this.restLengthIndicator.computeLineDistances(); // Required for dashed lines
    }
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the anchor position based on keyboard input
    this.updateAnchorPosition(deltaTime);
    
    // Update visual helpers to show current status
    this.updateVisualHelpers();
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the anchor's position based on keyboard input
   */
  private updateAnchorPosition(deltaTime: number): void {
    if (!this.world || this.anchorEntityId === -1) return;
    
    // Get the anchor entity
    const anchorEntity = this.world.getEntity(this.anchorEntityId);
    if (!anchorEntity) return;
    
    // Get the transform component
    const transform = anchorEntity.getComponent(Transform);
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
  }
  
  /**
   * Subscribe to keyboard events for constraint configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 't':
          this.toggleSpringConstraint();
          break;
        case '1':
          this.adjustRestLength(-0.5);
          break;
        case '2':
          this.adjustRestLength(0.5);
          break;
        case '3':
          this.adjustStiffness(-1.0);
          break;
        case '4':
          this.adjustStiffness(1.0);
          break;
        case '5':
          this.adjustDamping(-0.1);
          break;
        case '6':
          this.adjustDamping(0.1);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the spring constraint on/off
   */
  private toggleSpringConstraint(): void {
    if (!this.world || this.springEntityId === -1) return;
    
    const springEntity = this.world.getEntity(this.springEntityId);
    if (!springEntity) return;
    
    const constraintComponent = springEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.springEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.springEnabled);
      
      console.log(`Spring constraint ${this.springEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Adjust the rest length
   */
  private adjustRestLength(delta: number): void {
    this.restLength = Math.max(0.5, this.restLength + delta);
    this.updateConstraint();
    console.log(`Rest length adjusted to: ${this.restLength.toFixed(1)}`);
  }
  
  /**
   * Adjust the stiffness
   */
  private adjustStiffness(delta: number): void {
    this.stiffness = Math.max(0.1, Math.min(30.0, this.stiffness + delta));
    this.updateConstraint();
    console.log(`Stiffness adjusted to: ${this.stiffness.toFixed(1)}`);
  }
  
  /**
   * Adjust the damping
   */
  private adjustDamping(delta: number): void {
    this.damping = Math.max(0.0, Math.min(1.0, this.damping + delta));
    this.updateConstraint();
    console.log(`Damping adjusted to: ${this.damping.toFixed(1)}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.springEntityId === -1) return;
    
    const springEntity = this.world.getEntity(this.springEntityId);
    if (!springEntity) return;
    
    const constraintComponent = springEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Add updated constraint
    constraintComponent.addSpring(this.anchorEntityId, {
      restLength: this.restLength,
      stiffness: this.stiffness,
      damping: this.damping,
      enabled: this.springEnabled
    });
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (!this.statusText || !this.world) return;
    
    // Get actual distance between entities
    let currentDistance = 0;
    
    const anchorEntity = this.world.getEntity(this.anchorEntityId);
    const springEntity = this.world.getEntity(this.springEntityId);
    
    if (anchorEntity && springEntity) {
      const anchorTransform = anchorEntity.getComponent(Transform);
      const springTransform = springEntity.getComponent(Transform);
      
      if (anchorTransform && springTransform) {
        // Calculate distance between anchor and spring
        const anchorPos = new THREE.Vector3(
          anchorTransform.position.x,
          anchorTransform.position.y,
          anchorTransform.position.z
        );
        
        const springPos = new THREE.Vector3(
          springTransform.position.x,
          springTransform.position.y,
          springTransform.position.z
        );
        
        currentDistance = anchorPos.distanceTo(springPos);
      }
    }
    
    this.statusText.setText(
      `Spring: ${this.springEnabled ? 'Enabled' : 'Disabled'}\n` +
      `Rest Length: ${this.restLength.toFixed(1)}\n` +
      `Current Length: ${currentDistance.toFixed(1)}\n` +
      `Stiffness: ${this.stiffness.toFixed(1)}\n` +
      `Damping: ${this.damping.toFixed(1)}`
    );
  }
  
  /**
   * Clean up demo resources before exiting
   */
  public override exit(): Promise<void> {
    // Remove visual helpers from the scene
    if (this.scene) {
      if (this.springLine) {
        this.scene.remove(this.springLine);
        this.springLine = null;
      }
      if (this.restLengthIndicator) {
        this.scene.remove(this.restLengthIndicator);
        this.restLengthIndicator = null;
      }
    }
    
    // Call parent exit method
    return super.exit();
  }
} 
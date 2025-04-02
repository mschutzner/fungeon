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
  Rotation,
  CameraComponent,
  CameraType
} from '../../ecs';

// Define PathPoint interface similar to the one in the ECS
interface PathPoint {
  position: Vector3;
  rotation?: Rotation;
}

/**
 * Demo state for the PathFollow constraint
 */
export class PathFollowDemo extends ConstraintDemoState {
  // Entities for this demo
  private followerEntityId: number = -1;
  
  // For UI status
  private pathFollowEnabled: boolean = true;
  private loopPath: boolean = true;
  private alignToPath: boolean = true;
  private speed: number = 1.4;
  
  // Path visualization
  private pathLine: THREE.Line | null = null;
  
  // Path data
  private path: PathPoint[] = [];
  
  constructor(engine: Engine) {
    super(
      'pathFollowDemo',
      engine,
      ConstraintType.PATH_FOLLOW,
      'The PathFollow constraint makes an entity follow a predefined path at a specified speed.',
      'P: Toggle path following\nL: Toggle loop\nA: Toggle alignment\n+/-: Adjust speed\nESC: Return to Menu'
    );
  }
  
  /**
   * Create a camera entity with a position that can see the entire path
   */
  protected createCamera(): void {
    if (!this.world || !this.cameraSystem) return;
    
    // Get the renderer
    const renderer = this.engine.getRenderer();
    if (!renderer) return;
    
    // Calculate aspect ratio
    const aspect = renderer.getWidth() / renderer.getHeight();
    
    // Position camera further back to see the entire path
    const cameraEntity = this.cameraSystem.createCamera(
      'mainCamera',
      CameraType.PERSPECTIVE,
      new THREE.Vector3(0, 2, 8)
    );
    
    // Get the camera component and customize it
    const cameraComponent = cameraEntity.getComponent(CameraComponent);
    if (cameraComponent) {
      cameraComponent.setFov(75);
      cameraComponent.setAspect(aspect);
      cameraComponent.setClippingPlanes(0.1, 1000);
    }
    
    console.log('Camera entity created for path follow demo');
  }
  
  /**
   * Set up the demo-specific entities and constraints
   */
  protected setupDemo(): void {
    // Create a grid to help with spatial orientation
    this.createGrid();
    
    // Create a ground plane
    this.createGround();
    
    // Create the path
    this.createPath();
    
    // Create visual representation of the path
    this.createPathVisualization();
    
    // Create the follower
    this.createFollower();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create a path for the entity to follow
   */
  private createPath(): void {
    // Create a circular path
    const pathRadius = 4;
    const pathHeight = 2;
    const numPoints = 16;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = Math.cos(angle) * pathRadius;
      const z = Math.sin(angle) * pathRadius;
      const y = pathHeight + Math.sin(angle * 2) * 1.5; // Add some up/down movement
      
      this.path.push({
        position: new Vector3(x, y, z)
      });
    }
    
    console.log(`Created path with ${this.path.length} points`);
  }
  
  /**
   * Create a visual representation of the path
   */
  private createPathVisualization(): void {
    if (!this.scene) return;
    
    // Create a line geometry from the path points
    const points = this.path.map(point => 
      new THREE.Vector3(point.position.x, point.position.y, point.position.z)
    );
    
    // Close the loop
    if (this.loopPath && points.length > 0) {
      points.push(points[0].clone());
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      linewidth: 3
    });
    
    this.pathLine = new THREE.Line(geometry, material);
    this.scene.add(this.pathLine);
    
    // Add small spheres at each path point for better visualization
    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    this.path.forEach(point => {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(point.position.x, point.position.y, point.position.z);
      this.scene?.add(sphere);
    });
  }
  
  /**
   * Create the entity that will follow the path
   */
  private createFollower(): void {
    if (!this.world) return;
    
    // Create a new entity
    const followerEntity = this.world.createEntity('follower');
    
    // Position at the first point on the path
    const startPosition = this.path.length > 0 ? this.path[0].position : new Vector3(0, 2, 0);
    followerEntity.addComponent(new Transform(startPosition.x, startPosition.y, startPosition.z));
    
    // Add ThreeObject component
    followerEntity.addComponent(new ThreeObject());
    
    // Add a cone mesh to show direction
    const meshComponent = new MeshComponent(GeometryType.CONE);
    meshComponent.color = 0xff0000; // Red
    meshComponent.radius = 0.5;
    meshComponent.size = { width: 0.5, height: 1.0, depth: 0.5 };
    meshComponent.segments = 8;
    followerEntity.addComponent(meshComponent);
    
    // Add the PathFollow constraint
    console.log('Setting up PathFollow constraint');
    
    const constraintComponent = new ConstraintComponent();
    constraintComponent.addPathFollow(this.path, {
      loop: this.loopPath,
      speed: this.speed,
      alignToPath: this.alignToPath,
      influence: 1.0
    });
    
    followerEntity.addComponent(constraintComponent);
    console.log('PathFollow constraint added to follower entity');
    
    // Store the entity ID for later reference
    this.followerEntityId = followerEntity.id;
    
    console.log('Follower entity created with ID:', this.followerEntityId);
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the UI with constraint information
    this.updateConstraintUI();
    
    // Update path visualization if loop setting changed
    if (this.pathLine && this.loopPath !== (this.pathLine.geometry.getAttribute('position').count > this.path.length)) {
      // Recreate path visualization with new loop setting
      if (this.scene && this.pathLine) {
        this.scene.remove(this.pathLine);
        this.pathLine.geometry.dispose();
        if (this.pathLine.material instanceof THREE.Material) {
          this.pathLine.material.dispose();
        }
        this.createPathVisualization();
      }
    }
  }
  
  /**
   * Subscribe to keyboard events for constraint toggling and configuration
   */
  private subscribeToKeyboardEvents(): void {
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 'p':
          this.togglePathFollow();
          break;
        case 'l':
          this.toggleLoop();
          break;
        case 'a':
          this.toggleAlignment();
          break;
        case '+':
        case '=':
          this.adjustSpeed(0.2);
          break;
        case '-':
        case '_':
          this.adjustSpeed(-0.2);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the path follow constraint on/off
   */
  private togglePathFollow(): void {
    if (!this.world || this.followerEntityId === -1) return;
    
    const followerEntity = this.world.getEntity(this.followerEntityId);
    if (!followerEntity) return;
    
    const constraintComponent = followerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.pathFollowEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.pathFollowEnabled);
      
      console.log(`Path following ${this.pathFollowEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Toggle whether the path loops
   */
  private toggleLoop(): void {
    this.loopPath = !this.loopPath;
    this.updateConstraint();
    console.log(`Path looping ${this.loopPath ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle whether to align to the path
   */
  private toggleAlignment(): void {
    this.alignToPath = !this.alignToPath;
    this.updateConstraint();
    console.log(`Path alignment ${this.alignToPath ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Adjust the speed of path following
   */
  private adjustSpeed(delta: number): void {
    this.speed = Math.max(0.1, Math.min(3.0, this.speed + delta));
    this.updateConstraint();
    console.log(`Path following speed: ${this.speed.toFixed(1)}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.followerEntityId === -1) return;
    
    const followerEntity = this.world.getEntity(this.followerEntityId);
    if (!followerEntity) return;
    
    const constraintComponent = followerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Add updated constraint
    constraintComponent.addPathFollow(this.path, {
      loop: this.loopPath,
      speed: this.speed,
      alignToPath: this.alignToPath,
      influence: 1.0,
      enabled: this.pathFollowEnabled
    });
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      if (!this.world || this.followerEntityId === -1) return;
      
      const followerEntity = this.world.getEntity(this.followerEntityId);
      if (!followerEntity) return;
      
      const transform = followerEntity.getComponent(Transform);
      if (!transform) return;
      
      // Format position to 1 decimal place
      const pos = `(${transform.position.x.toFixed(1)}, ${transform.position.y.toFixed(1)}, ${transform.position.z.toFixed(1)})`;
      
      this.statusText.setText(
        `PathFollow: ${this.pathFollowEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Loop: ${this.loopPath ? 'Yes' : 'No'}\n` +
        `Align: ${this.alignToPath ? 'Yes' : 'No'}\n` +
        `Speed: ${this.speed.toFixed(1)}\n` +
        `Pos: ${pos}`
      );
    }
  }
} 
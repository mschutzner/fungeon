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
  TransformComponent
} from '../../ecs';

/**
 * Demo state for the CopyTransform constraint
 */
export class CopyTransformDemo extends ConstraintDemoState {
  // Entities for this demo
  private sourceEntityId: number = -1;
  private targetEntityId: number = -1;
  
  // For UI status
  private copyEnabled: boolean = true;
  private copyPosition: boolean = true;
  private copyRotation: boolean = true;
  private copyScale: boolean = false;
  
  constructor(engine: Engine) {
    super(
      'copyTransformDemo',
      engine,
      ConstraintType.COPY_TRANSFORM,
      'The CopyTransform constraint makes an entity copy the transform properties of another entity.',
      'WASD/QE: Move source\nR: Rotate source\n1/2/3: Toggle copy position/rotation/scale\nT: Toggle copying\nESC: Return to Menu'
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
    
    // Create the source entity
    this.createSource();
    
    // Create the target entity with CopyTransform constraint
    this.createTarget();
    
    // Add keyboard event handlers
    this.subscribeToKeyboardEvents();
  }
  
  /**
   * Create the source entity
   */
  private createSource(): void {
    if (!this.world) return;
    
    // Create a new entity for the source
    const sourceEntity = this.world.createEntity('source');
    
    // Add transform component with position
    sourceEntity.addComponent(new Transform(0, 2, 0));
    
    // Add ThreeObject component
    sourceEntity.addComponent(new ThreeObject());
    
    // Add mesh component - cube for the source
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.color = 0xff5500; // Orange
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    sourceEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.sourceEntityId = sourceEntity.id;
    
    console.log('Source entity created with ID:', this.sourceEntityId);
  }
  
  /**
   * Create the target entity with CopyTransform constraint
   */
  private createTarget(): void {
    if (!this.world) return;
    
    // Create a new entity for the target
    const targetEntity = this.world.createEntity('target');
    
    // Add transform component - position away from the source
    targetEntity.addComponent(new Transform(-3, 2, 0));
    
    // Add ThreeObject component
    targetEntity.addComponent(new ThreeObject());
    
    // Add mesh component - cube for the target but with a different color
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.color = 0x00bbff; // Light blue
    meshComponent.size = { width: 1.0, height: 1.0, depth: 1.0 };
    targetEntity.addComponent(meshComponent);
    
    // Add the CopyTransform constraint
    if (this.sourceEntityId !== -1) {
      console.log(`Setting up CopyTransform constraint targeting entity ${this.sourceEntityId}`);
      
      const constraintComponent = new ConstraintComponent();
      this.updateCopyConstraint(constraintComponent);
      
      targetEntity.addComponent(constraintComponent);
      console.log('CopyTransform constraint added to target entity');
    }
    
    // Store the entity ID for later reference
    this.targetEntityId = targetEntity.id;
    
    console.log('Target entity created with ID:', this.targetEntityId);
  }
  
  /**
   * Update demo-specific logic
   */
  protected updateDemo(deltaTime: number): void {
    // Update the source position and rotation based on keyboard input
    this.updateSourceTransform(deltaTime);
    
    // Update the UI with constraint information
    this.updateConstraintUI();
  }
  
  /**
   * Update the source's transform based on keyboard input
   */
  private updateSourceTransform(deltaTime: number): void {
    if (!this.world || this.sourceEntityId === -1) return;
    
    // Get the source entity
    const sourceEntity = this.world.getEntity(this.sourceEntityId);
    if (!sourceEntity) return;
    
    // Get the transform component
    const transform = sourceEntity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 2 * deltaTime;
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
          this.toggleCopying();
          break;
        case '1':
          this.toggleCopyPosition();
          break;
        case '2':
          this.toggleCopyRotation();
          break;
        case '3':
          this.toggleCopyScale();
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Toggle the copy constraint on/off
   */
  private toggleCopying(): void {
    if (!this.world || this.targetEntityId === -1) return;
    
    const targetEntity = this.world.getEntity(this.targetEntityId);
    if (!targetEntity) return;
    
    const constraintComponent = targetEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      this.copyEnabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, this.copyEnabled);
      
      console.log(`Copying ${this.copyEnabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Toggle copying of position
   */
  private toggleCopyPosition(): void {
    this.copyPosition = !this.copyPosition;
    this.updateConstraint();
    console.log(`Copy position ${this.copyPosition ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle copying of rotation
   */
  private toggleCopyRotation(): void {
    this.copyRotation = !this.copyRotation;
    this.updateConstraint();
    console.log(`Copy rotation ${this.copyRotation ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle copying of scale
   */
  private toggleCopyScale(): void {
    this.copyScale = !this.copyScale;
    this.updateConstraint();
    console.log(`Copy scale ${this.copyScale ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Update the constraint based on current settings
   */
  private updateConstraint(): void {
    if (!this.world || this.targetEntityId === -1) return;
    
    const targetEntity = this.world.getEntity(this.targetEntityId);
    if (!targetEntity) return;
    
    const constraintComponent = targetEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    // Remove all constraints
    constraintComponent.clearConstraints();
    
    // Add updated constraint
    this.updateCopyConstraint(constraintComponent);
  }
  
  /**
   * Update the copy constraint with current settings
   */
  private updateCopyConstraint(constraintComponent: ConstraintComponent): void {
    // Determine which components to copy
    const components: TransformComponent[] = [];
    
    if (this.copyPosition) components.push(TransformComponent.POSITION);
    if (this.copyRotation) components.push(TransformComponent.ROTATION);
    if (this.copyScale) components.push(TransformComponent.SCALE);
    
    // If no specific components, don't add constraint
    if (components.length === 0) {
      console.log('No transform components selected for copying');
      return;
    }
    
    // Add constraint with specified components
    constraintComponent.addCopyTransform(this.sourceEntityId, {
      components: components,
      influence: 1.0,
      enabled: this.copyEnabled
    });
  }
  
  /**
   * Update constraint information in the UI
   */
  private updateConstraintUI(): void {
    if (this.statusText) {
      const componentsText = [
        this.copyPosition ? 'Position' : '',
        this.copyRotation ? 'Rotation' : '',
        this.copyScale ? 'Scale' : ''
      ].filter(t => t !== '').join(', ');
      
      this.statusText.setText(
        `CopyTransform: ${this.copyEnabled ? 'Enabled' : 'Disabled'}\n` +
        `Copying: ${componentsText || 'None'}`
      );
    }
  }
} 
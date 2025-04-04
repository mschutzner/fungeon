import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TextBox } from '../../ui/elements/TextBox';
import { UIPanel } from '../../ui/elements/UIPanel';
import { Engine } from '../Engine';
import { InputManager } from '../input/InputManager';
import { EventSystem } from '../events/EventSystem';
import { InputEventType } from '../input/InputManager';
import { AssetManager, AssetType } from '../AssetManager';
// Import ECS components
import { 
  World, 
  Entity, 
  Transform, 
  SerializationSystem, 
  ThreeSceneSystem,
  CameraSystem,
  CameraComponent, 
  CameraType,
  MeshComponent,
  GeometryType,
  ThreeObject,
  ConstraintComponent,
  TrackAxis,
  UpAxis,
  ConstraintSystem,
  Rotation,
  Vector3,
  ConstraintType,
  Axis,
  Component,
  IEntity
} from '../../ecs';

/**
 * Test state using the ECS architecture with a rotating cube
 */
export class TestState extends State {
  private scene: THREE.Scene | null = null;
  
  // UI elements
  private fpsCounter: TextBox | null = null;
  private infoText: TextBox | null = null;
  private controlsText: TextBox | null = null;
  private statusText: TextBox | null = null;
  private mousePositionText: TextBox | null = null;
  
  // Reference to engine
  private engine: Engine;
  
  // Input manager
  private inputManager: InputManager;
  
  // Event system
  private eventSystem: EventSystem;
  
  // Event subscription cleanup
  private eventUnsubscribe: (() => void)[] = [];
  
  // ECS World
  private world: World | null = null;
  
  // Asset manager
  private assetManager: AssetManager | null = null;
  
  // ECS Entity IDs
  private cubeEntityId: number = -1;
  private cameraEntityId: number = -1;
  private trackerEntityId: number = -1;
  private childCubeEntityId: number = -1;
  
  // Systems
  private threeSceneSystem: ThreeSceneSystem | null = null;
  private cameraSystem: CameraSystem | null = null;
  private constraintSystem: ConstraintSystem | null = null;
  
  constructor(engine: Engine) {
    super('test');
    this.engine = engine;
    this.inputManager = InputManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
  }
  
  /**
   * Initialize the state
   */
  async enter(): Promise<void> {
    console.log('Entering test state');
    
    // Unsubscribe from any previous events
    this.unsubscribeFromEvents();
    
    // Initialize ECS World
    this.initializeEcsWorld();
    
    // Initialize the asset manager with the world
    if (this.world) {
      this.assetManager = new AssetManager(this.world);
    }
    
    // Get the scene from the world
    if (this.world) {
      this.scene = this.world.getScene();
      this.scene.background = new THREE.Color(0x000000);
    }
    
    // Create cube entity with transform and mesh
    this.createCubeEntity();
    
    // Create a child cube entity
    this.createChildCubeEntity();
    
    // Create camera entity
    this.createCameraEntity();
    
    // Create a tracker entity that will follow the cube
    this.createTrackerEntity();
    
    // Create chest entity
    await this.createChestEntity();
    
    // Subscribe to mouse events
    this.subscribeToEvents();
    
    // Display ECS status in console
    this.logEcsStatus();
    
    return Promise.resolve();
  }
  
  /**
   * Initialize the ECS World with systems
   */
  private initializeEcsWorld(): void {
    // Create a new world
    this.world = new World();
    
    console.log("Creating ECS world with constraint system");
    
    // Register component types for serialization
    this.world.registerComponent('Transform', Transform);
    this.world.registerComponent('CameraComponent', CameraComponent);
    this.world.registerComponent('MeshComponent', MeshComponent);
    this.world.registerComponent('ConstraintComponent', ConstraintComponent);
    
    // Initialize core systems - this will set up ThreeSceneSystem, CameraSystem, and ConstraintSystem
    // with their default priorities
    this.world.initializeCoreEcsSystems();
    
    // Register additional systems
    this.world.registerSystem(new SerializationSystem());
    
    // Get references to systems for convenience
    this.threeSceneSystem = this.world.getThreeSceneSystem();
    this.cameraSystem = this.world.getCameraSystem();
    this.constraintSystem = this.world.getConstraintSystem();
    
    if (this.constraintSystem) {
      console.log(`ConstraintSystem registered with priority ${this.constraintSystem.priority}`);
    } else {
      console.warn("ConstraintSystem not found!");
    }
    
    // Connect the renderer with our ECS world
    const renderer = this.engine.getRenderer();
    if (renderer && this.world) {
      this.world.setRenderer(renderer);
    }
    
    console.log('ECS World initialized with core systems');
  }
  
  /**
   * Create a cube entity with transform and mesh components
   */
  private createCubeEntity(): void {
    if (!this.world) return;
    
    // Create a new entity for the cube
    const cubeEntity = this.world.createEntity('cube');
    
    // Add transform component with position [0,0,0]
    cubeEntity.addComponent(new Transform(0, 0, 0));
    
    // Add ThreeObject component first
    cubeEntity.addComponent(new ThreeObject());
    
    // Add mesh component - it will update the ThreeObject created above
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.wireframe = true;
    meshComponent.color = 0x00ff00;
    cubeEntity.addComponent(meshComponent);
    
    // Store the entity ID for later reference
    this.cubeEntityId = cubeEntity.id;
    
    console.log('Cube entity created with ID:', this.cubeEntityId);
  }
  
  /**
   * Create a child cube entity that is parented to the main cube
   * and offset to the left
   */
  private createChildCubeEntity(): void {
    if (!this.world || !this.threeSceneSystem || this.cubeEntityId === -1) return;
    
    // Create a new entity for the child cube
    const childCubeEntity = this.world.createEntity('childCube');
    
    // Create a Transform using [-2,0,0] array notation for offset position
    // This will position it 2 units to the left (-X direction) of its parent
    const transform = new Transform();
    transform.translate([-2, 0, 0]);
    childCubeEntity.addComponent(transform);
    
    // Add ThreeObject component first
    childCubeEntity.addComponent(new ThreeObject());
    
    // Add mesh component - smaller blue cube
    const meshComponent = new MeshComponent(GeometryType.BOX);
    meshComponent.wireframe = true;
    meshComponent.color = 0x0000ff; // Blue
    
    // Use array notation to set the cube size
    meshComponent.size = { width: 0.75, height: 0.75, depth: 0.75 }; // Smaller than parent
    childCubeEntity.addComponent(meshComponent);
    
    // Parent the child to the main cube
    const parentEntity = this.world.getEntity(this.cubeEntityId);
    if (parentEntity) {
      this.threeSceneSystem.setParent(childCubeEntity, parentEntity);
    }
    
    // Store the entity ID for later reference
    this.childCubeEntityId = childCubeEntity.id;
    
    console.log('Child cube entity created with ID:', this.childCubeEntityId);
  }
  
  /**
   * Create a camera entity with transform and camera components
   */
  private createCameraEntity(): void {
    if (!this.world || !this.cameraSystem) return;
    
    // Get the renderer
    const renderer = this.engine.getRenderer();
    if (!renderer) return;
    
    // Calculate aspect ratio
    const aspect = renderer.getWidth() / renderer.getHeight();
    
    // Use the CameraSystem to create a camera entity
    const cameraEntity = this.cameraSystem.createCamera(
      'mainCamera',
      CameraType.PERSPECTIVE,
      new THREE.Vector3(0, 0, 5),
      new THREE.Euler(0, 0, 0),
      true // Make this the active camera
    );
    
    // Get the camera component and customize it
    const cameraComponent = cameraEntity.getComponent(CameraComponent);
    if (cameraComponent) {
      // Set orthographic camera size (controls how much of the scene is visible)
      cameraComponent.setSize(10);
      cameraComponent.setAspect(aspect);
      cameraComponent.setClippingPlanes(0.1, 1000);
    }
    
    // Add a TrackTo constraint to make the camera look at the cube
    if (this.cubeEntityId !== -1) {
      const constraintComponent = new ConstraintComponent();
      
      // Simple camera tracking configuration
      constraintComponent.addTrackTo(this.cubeEntityId, {});
      
      cameraEntity.addComponent(constraintComponent);
      console.log('Camera tracking constraint added with simplified setup');
    }
    
    // Store the camera entity ID
    this.cameraEntityId = cameraEntity.id;
    
    console.log('Orthographic camera entity created with ID:', this.cameraEntityId);
  }
  
  /**
   * Create a tracker entity that uses the TrackTo constraint
   * to point at the cube
   */
  private createTrackerEntity(): void {
    if (!this.world) return;
    
    console.log("Creating tracker entity...");
    
    // Create a new entity for the tracker
    const trackerEntity = this.world.createEntity('tracker');
    
    // Add transform component - position the tracker at an offset from the cube
    const transform = new Transform(3, 0, 0);
    // No rotation needed for the debug axis as we'll use the constraint
    trackerEntity.addComponent(transform);
    
    // Add ThreeObject component
    trackerEntity.addComponent(new ThreeObject());
    
    // Add mesh component - debug axes to visualize tracking
    const meshComponent = new MeshComponent(GeometryType.DEBUG_AXIS);
    // Scale up the debug axes to make them more visible
    meshComponent.size.width = 2.0;  // Scale X axis
    meshComponent.size.height = 2.0; // Scale Y axis
    meshComponent.size.depth = 2.0;  // Scale Z axis
    trackerEntity.addComponent(meshComponent);
    
    // Add a simple TrackTo constraint
    if (this.cubeEntityId !== -1) {
      console.log(`Setting up TrackTo constraint targeting cube entity ${this.cubeEntityId}`);
      
      // Use a simple constraint with explicit axis choice
      const constraintComponent = new ConstraintComponent();
      // Make the POSITIVE_Y axis (green) point at the target
      constraintComponent.addTrackTo(this.cubeEntityId, {
        trackAxis: Axis.POSITIVE_Z,
        influence: 1.0,
      });
      
      trackerEntity.addComponent(constraintComponent);
      console.log("Added TrackTo constraint with Y-axis tracking to tracker entity");
    }
    
    // Store the entity ID for later reference
    this.trackerEntityId = trackerEntity.id;
    
    console.log('Tracker entity created with ID:', this.trackerEntityId);
  }
  
  /**
   * Create a chest entity using the GLTF model
   */
  private async createChestEntity(): Promise<void> {
    if (!this.world || !this.assetManager) return;
    
    // Update UI to show we're loading a model
    if (this.statusText) {
      this.statusText.setText('Loading chest model...');
    }
    
    try {
      // Create a new entity for the chest
      const chestEntity = this.world.createEntity('chest');
      
      // Add transform component at position [0,-1,0]
      const transform = new Transform(0, -1, 0);
      
      chestEntity.addComponent(transform);
      
      // Add ThreeObject component first
      chestEntity.addComponent(new ThreeObject());
      
      // Add mesh component for the model
      const meshComponent = new MeshComponent(GeometryType.MODEL);
      meshComponent.wireframe = true;
      meshComponent.color = 0x00ffff; // Cyan
      chestEntity.addComponent(meshComponent);
      
      // Load the actual model geometry
      const modelObject = await this.loadTestModel('chest.gltf');
      
      if (modelObject) {
        // Connect the model with our entity
        const threeObject = chestEntity.getComponent(ThreeObject);
        if (threeObject) {
          // Apply the model's geometry
          threeObject.setObject(modelObject);
        }
        
        console.log('Chest entity created as ECS entity');
      }
      
      // Update status text
      if (this.statusText) {
        this.statusText.setText('Chest model loaded');
      }
    } catch (error) {
      console.error('Error creating chest entity:', error);
      
      // Update status text
      if (this.statusText) {
        this.statusText.setText('Error loading chest model');
      }
    }
  }
  
  /**
   * Log ECS status to console
   */
  private logEcsStatus(): void {
    if (!this.world) return;
    
    console.log("\n┌───────── ECS WORLD STATE ─────────┐");
    
    // Get all entities
    const entities = this.world.getAllEntities();
    console.log(`│ Total Entities: ${entities.length}`);
    
    // Track already processed entities to avoid duplicates
    const processedIds = new Set<number>();
    
    // First process entities without parents
    entities.forEach(entity => {
      if (processedIds.has(entity.id)) return;
      
      // Check if entity has a ThreeObject with a parent
      const threeObj = entity.getComponent(ThreeObject);
      if (threeObj && threeObj.object.parent && 
          threeObj.object.parent.userData && 
          threeObj.object.parent.userData.entityId) {
        // This entity has a parent, will be processed in hierarchy
        return;
      }
      
      // Print entity as root
      this.logEntityHierarchy(entity, processedIds, 0);
    });
    
    // Print serialization info if available
    const serializationSystem = this.world.getSystem(SerializationSystem);
    if (serializationSystem) {
      console.log("└─────────────────────────────────────┘");
    }
  }
  
  /**
   * Log an entity and its hierarchy
   * @param entity The entity to log
   * @param processedIds Set of already processed entity IDs
   * @param depth Current depth for indentation
   */
  private logEntityHierarchy(entity: IEntity, processedIds: Set<number>, depth: number): void {
    if (processedIds.has(entity.id)) return;
    processedIds.add(entity.id);
    
    // Create indent based on depth
    const indent = "│ " + "  ".repeat(depth);
    const prefix = depth === 0 ? "├─" : "├─";
    
    // Get entity details
    const name = entity.name || `Entity_${entity.id}`;
    console.log(`${indent}${prefix} ${name} (ID: ${entity.id})`);
    
    // Log components
    const components = entity.getAllComponents();
    components.forEach((component: Component, index: number) => {
      const isLast = index === components.length - 1;
      const compPrefix = isLast ? "└─" : "├─";
      
      if (component instanceof Transform) {
        // Format transform data
        const transform = component as Transform;
        const pos = transform.position;
        const rot = transform.rotation;
        const scale = transform.scale;
        
        console.log(`${indent}│  ${compPrefix} Transform:`);
        console.log(`${indent}│     ├─ Position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}`);
        console.log(`${indent}│     ├─ Rotation: x=${rot.x.toFixed(2)}°, y=${rot.y.toFixed(2)}°, z=${rot.z.toFixed(2)}°`);
        console.log(`${indent}│     └─ Scale: x=${scale.x.toFixed(2)}, y=${scale.y.toFixed(2)}, z=${scale.z.toFixed(2)}`);
      } 
      else if (component instanceof CameraComponent) {
        // Format camera data
        const camera = component as CameraComponent;
        console.log(`${indent}│  ${compPrefix} Camera:`);
        console.log(`${indent}│     ├─ Type: ${camera.getType()}`);
        console.log(`${indent}│     └─ Active: ${camera.getIsActive()}`);
      }
      else if (component instanceof MeshComponent) {
        // Format mesh data
        const mesh = component as MeshComponent;
        console.log(`${indent}│  ${compPrefix} Mesh:`);
        console.log(`${indent}│     ├─ Type: ${mesh.geometryType}`);
        console.log(`${indent}│     ├─ Wireframe: ${mesh.wireframe}`);
        console.log(`${indent}│     └─ Color: 0x${mesh.color.toString(16).padStart(6, '0')}`);
      }
      else if (component instanceof ConstraintComponent) {
        // Format constraint data
        const constraints = (component as ConstraintComponent).getConstraints();
        console.log(`${indent}│  ${compPrefix} Constraints: ${constraints.length}`);
        
        constraints.forEach((constraint, i) => {
          const isLastConstraint = i === constraints.length - 1;
          const constraintPrefix = isLastConstraint ? "└─" : "├─";
          console.log(`${indent}│     ${constraintPrefix} ${constraint.type} (enabled: ${constraint.enabled})`);
        });
      } 
      else if (component instanceof ThreeObject) {
        console.log(`${indent}│  ${compPrefix} ThreeObject: ${(component as ThreeObject).object.type}`);
      }
      else {
        // Generic component
        console.log(`${indent}│  ${compPrefix} ${component.constructor.name}`);
      }
    });
    
    // Find and log children
    const childEntities = this.findChildEntities(entity);
    if (childEntities.length > 0) {
      childEntities.forEach((childEntity, index) => {
        this.logEntityHierarchy(childEntity, processedIds, depth + 1);
      });
    }
  }
  
  /**
   * Find child entities of a given entity
   * @param parentEntity The parent entity
   * @returns Array of child entities
   */
  private findChildEntities(parentEntity: IEntity): IEntity[] {
    if (!this.world) return [];
    
    const children: IEntity[] = [];
    const entities = this.world.getAllEntities();
    
    entities.forEach(entity => {
      const threeObj = entity.getComponent(ThreeObject);
      if (threeObj && threeObj.object.parent) {
        // Check if this entity's ThreeObject parent belongs to the parent entity
        const parentThreeObj = parentEntity.getComponent(ThreeObject);
        
        if (parentThreeObj && threeObj.object.parent === parentThreeObj.object) {
          children.push(entity);
        }
      }
    });
    
    return children;
  }
  
  /**
   * Clean up the test state
   */
  async exit(): Promise<void> {
    console.log('Exiting test state');
    
    // Reset tracker entity ID
    this.trackerEntityId = -1;
    this.cubeEntityId = -1;
    
    // Clean up ECS resources
    if (this.world) {
      this.world.clear();
      this.world = null;
    }
    
    // Clear asset manager
    if (this.assetManager) {
      this.assetManager.clearCache();
      this.assetManager = null;
    }
    
    this.scene = null;
    this.cameraSystem = null;
    this.threeSceneSystem = null;
    
    // Clean up event subscriptions
    this.unsubscribeFromEvents();
    
    return Promise.resolve();
  }
  
  /**
   * Setup rendering data for the renderer
   */
  setupRenderingData(renderer: Renderer): void {
    // Create UI elements
    this.createUIElements(renderer);
  }
  
  /**
   * Update the test state
   */
  update(deltaTime: number): void {
    // Update the ECS world - processes all systems
    if (this.world) {
      this.world.update(deltaTime);
    }
    
    // Get the cube entity and update its transform based on input
    this.updateCubeTransform(deltaTime);
    
    // Update the child cube with automatic rotation
    this.updateChildCube(deltaTime);
    
    // Update camera entity if needed
    this.updateCameraEntity(deltaTime);
    
    // Update tracker entity using IJKL keys
    this.updateTrackerEntity(deltaTime);
    
    // Update UI to show constraint status
    this.updateConstraintInfoText();
    
    // Update FPS text
    if (this.fpsCounter) {
      // Use explicit line break for better formatting
      this.fpsCounter.setText(`FPS: ${this.engine.getFps()}\nTPS: ${this.engine.getTps()}`);
    }

    if(this.statusText) {
      if (this.world) {
        const entityCount = this.world.getAllEntities().length;
        this.statusText.setText(`ENTITIES: ${entityCount}`);
      } else {
        this.statusText.setText('NO ECS');
      }
    }
  }
  
  /**
   * Update the cube's transform component based on input
   * This demonstrates direct manipulation of components outside systems
   */
  private updateCubeTransform(deltaTime: number): void {
    if (!this.world) return;
    
    // Get the cube entity
    const cubeEntity = this.world.getEntity(this.cubeEntityId);
    if (!cubeEntity) return;
    
    // Get the transform component
    const transform = cubeEntity.getComponent(Transform);
    if (!transform) return;
    
    const rotationAmount = 30 * deltaTime; // Smooth rotation based on delta time
    
    // Update rotation based on keyboard input using rotate() method with array notation
    if (this.inputManager.isKeyDown('arrowup')) {
      transform.rotate([-rotationAmount, 0, 0]);
    }
    if (this.inputManager.isKeyDown('arrowdown')) {
      transform.rotate([rotationAmount, 0, 0]);
    }
    if (this.inputManager.isKeyDown('arrowleft')) {
      transform.rotate([0, -rotationAmount, 0]);
    }
    if (this.inputManager.isKeyDown('arrowright')) {
      transform.rotate([0, rotationAmount, 0]);
    }
  }
  
  /**
   * Update the camera entity if needed
   */
  private updateCameraEntity(deltaTime: number): void {
    if (!this.world) return;
    
    // Get the camera entity
    const cameraEntity = this.world.getEntity(this.cameraEntityId);
    if (!cameraEntity) return;
    
    // Get the transform component
    const transform = cameraEntity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 2 * deltaTime; // Smooth movement based on delta time
    
    // Use translate() method with array notation to move the camera
    if (this.inputManager.isKeyDown('w')) {
      transform.translate([0, moveSpeed, 0]);
    }
    if (this.inputManager.isKeyDown('s')) {
      transform.translate([0, -moveSpeed, 0]);
    }
    if (this.inputManager.isKeyDown('a')) {
      transform.translate([-moveSpeed, 0, 0]);
    }
    if (this.inputManager.isKeyDown('d')) {
      transform.translate([moveSpeed, 0, 0]);
    }
    
    // Use translate with array notation for E/Q zooming
    if (this.inputManager.isKeyDown('e')) {
      transform.translate([0, 0, -moveSpeed]); // Move closer
    }
    if (this.inputManager.isKeyDown('q')) {
      transform.translate([0, 0, moveSpeed]); // Move away
    }
  }
  
  /**
   * Update the tracker entity position using IJKL keys
   */
  private updateTrackerEntity(deltaTime: number): void {
    if (!this.world || this.trackerEntityId === -1) return;
    
    // Get the tracker entity
    const trackerEntity = this.world.getEntity(this.trackerEntityId);
    if (!trackerEntity) return;
    
    // Get the transform component
    const transform = trackerEntity.getComponent(Transform);
    if (!transform) return;
    
    // Movement speed
    const moveSpeed = 2 * deltaTime;
    
    // Move using IJKL keys with translate() method and array notation
    if (this.inputManager.isKeyDown('i')) {
      transform.translate([0, 0, -moveSpeed]); // Forward
    }
    if (this.inputManager.isKeyDown('k')) {
      transform.translate([0, 0, moveSpeed]); // Backward
    }
    if (this.inputManager.isKeyDown('j')) {
      transform.translate([-moveSpeed, 0, 0]); // Left
    }
    if (this.inputManager.isKeyDown('l')) {
      transform.translate([moveSpeed, 0, 0]); // Right
    }
    
    // Additional movement with U/O keys for up/down
    if (this.inputManager.isKeyDown('u')) {
      transform.translate([0, moveSpeed, 0]);
    }
    if (this.inputManager.isKeyDown('o')) {
      transform.translate([0, -moveSpeed, 0]);
    }
  }
  
  /**
   * Update UI with constraint info
   */
  private updateConstraintInfoText(): void {
    if (!this.world || !this.controlsText) return;
    
    // Check tracker constraint status
    let trackerConstraintActive = false;
    if (this.trackerEntityId !== -1) {
      const trackerEntity = this.world.getEntity(this.trackerEntityId);
      if (trackerEntity) {
        const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
        if (constraintComponent) {
          const constraints = constraintComponent.getConstraints();
          trackerConstraintActive = constraints.length > 0 && constraints[0].enabled;
        }
      }
    }
    
    // Check camera constraint status
    let cameraConstraintActive = false;
    if (this.cameraEntityId !== -1) {
      const cameraEntity = this.world.getEntity(this.cameraEntityId);
      if (cameraEntity) {
        const constraintComponent = cameraEntity.getComponent(ConstraintComponent);
        if (constraintComponent) {
          const constraints = constraintComponent.getConstraints();
          cameraConstraintActive = constraints.length > 0 && constraints[0].enabled;
        }
      }
    }
  }
  
  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to mouse move events
    const mouseMoveUnsub = this.eventSystem.subscribe(InputEventType.MOUSE_MOVE, (data) => {
      // Update mouse position text with mouse position
      if (this.mousePositionText) {
        this.mousePositionText.setText(`Mouse: ${Math.floor(data.x)}, ${Math.floor(data.y)}`);
      }
    });
    
    // Store unsubscribe functions
    this.eventUnsubscribe.push(mouseMoveUnsub);
    
    // Subscribe to keyboard events for toggling constraints
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      if (data.key === 't') {
        this.toggleTrackerConstraint();
      } else if (data.key === 'c') {
        this.toggleCameraConstraint();
      } else if (data.key === 'y') {
        // Debug key to check constraints
        this.debugConstraints();
      }
    });
    
    // Store unsubscribe functions
    this.eventUnsubscribe.push(keyDownUnsub);
    
    console.log('Subscribed to input events. Press D to debug constraints.');
  }
  
  /**
   * Unsubscribe from events
   */
  private unsubscribeFromEvents(): void {
    // Call all unsubscribe functions
    for (const unsub of this.eventUnsubscribe) {
      unsub();
    }
    
    // Clear the array
    this.eventUnsubscribe = [];
    
    console.log('Unsubscribed from input events');
  }
  
  /**
   * Toggle the tracker's constraint on/off
   */
  private toggleTrackerConstraint(): void {
    if (!this.world || this.trackerEntityId === -1) return;
    
    const trackerEntity = this.world.getEntity(this.trackerEntityId);
    if (!trackerEntity) return;
    
    const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      const enabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, enabled);
      
      console.log(`Tracker constraint ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Toggle the camera's constraint on/off
   */
  private toggleCameraConstraint(): void {
    if (!this.world || this.cameraEntityId === -1) return;
    
    const cameraEntity = this.world.getEntity(this.cameraEntityId);
    if (!cameraEntity) return;
    
    const constraintComponent = cameraEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) return;
    
    const constraints = constraintComponent.getConstraints();
    if (constraints.length > 0) {
      // Toggle the first constraint
      const enabled = !constraints[0].enabled;
      constraintComponent.setConstraintEnabled(0, enabled);
      
      console.log(`Camera constraint ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Debug method to check if constraints are working properly
   */
  private debugConstraints(): void {
    if (!this.world) {
      console.log("World is null");
      return;
    }
    
    console.log("------ CONSTRAINT DEBUG ------");
    
    // Check if the constraint system exists
    if (!this.constraintSystem) {
      console.log("Constraint system is null");
      return;
    }
    console.log("Constraint system exists");
    
    // Check if tracker entity exists and has a constraint component
    if (this.trackerEntityId === -1) {
      console.log("Tracker entity ID is invalid");
      return;
    }
    
    const trackerEntity = this.world.getEntity(this.trackerEntityId);
    if (!trackerEntity) {
      console.log("Tracker entity not found");
      return;
    }
    console.log(`Tracker entity found: ${trackerEntity.id}`);
    
    const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
    if (!constraintComponent) {
      console.log("Tracker entity has no constraint component");
      return;
    }
    console.log("Tracker entity has constraint component");
    
    // Check constraints in the component
    const constraints = constraintComponent.getConstraints();
    console.log(`Tracker has ${constraints.length} constraints`);
    
    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];
      console.log(`Constraint ${i}:
        Type: ${constraint.type}
        Enabled: ${constraint.enabled}
        Priority: ${constraint.priority}
        Influence: ${constraint.influence}
      `);
      
      if (constraint.type === ConstraintType.TRACK_TO) {
        const trackTo = constraintComponent.getTrackToConstraints()[0];
        console.log(`TrackTo targeting entity ID: ${trackTo.targetEntityId}
          TrackAxis: ${trackTo.trackAxis}
          UpAxis: ${trackTo.upAxis}
        `);
        
        // Check if target entity exists
        if (trackTo.targetEntityId !== null) {
          const targetEntity = this.world.getEntity(trackTo.targetEntityId);
          if (targetEntity) {
            console.log("Target entity exists");
            const targetTransform = targetEntity.getComponent(Transform);
            if (targetTransform) {
              console.log(`Target position: ${targetTransform.position.x}, ${targetTransform.position.y}, ${targetTransform.position.z}`);
            } else {
              console.log("Target entity has no transform");
            }
          } else {
            console.log("Target entity not found");
          }
        }
      }
    }
    
    // Check tracker transform
    const trackerTransform = trackerEntity.getComponent(Transform);
    if (trackerTransform) {
      console.log(`Tracker position: ${trackerTransform.position.x}, ${trackerTransform.position.y}, ${trackerTransform.position.z}`);
      console.log(`Tracker rotation: ${trackerTransform.rotation.x}, ${trackerTransform.rotation.y}, ${trackerTransform.rotation.z}`);
    } else {
      console.log("Tracker has no transform");
    }
    
    console.log("------ END DEBUG ------");
  }
  
  /**
   * Update the child cube with automatic rotation
   */
  private updateChildCube(deltaTime: number): void {
    if (!this.world || this.childCubeEntityId === -1) return;
    
    // Get the child cube entity
    const childCubeEntity = this.world.getEntity(this.childCubeEntityId);
    if (!childCubeEntity) return;
    
    // Get the transform component
    const transform = childCubeEntity.getComponent(Transform);
    if (!transform) return;
    
    // Add continuous rotation to child cube - using array notation
    // Rotate at different speeds for each axis to create an interesting effect
    transform.rotate([
      15 * deltaTime,  // X rotation (15 degrees per second)
      25 * deltaTime,  // Y rotation (25 degrees per second)
      10 * deltaTime   // Z rotation (10 degrees per second)
    ]);
  }
  
  /**
   * Create UI elements
   */
  private createUIElements(renderer: Renderer): void {
    const uiSystem = renderer.getUISystem();
    if (!uiSystem) return;
    
    // FPS/TPS Counter in the top-left (green) with enough height for 2 lines
    this.fpsCounter = new TextBox(2, 2, 100, 30, 'FPS: 0\nTPS: 0', 'tiny', 1, '#00ff00', 'left', 2);
    uiSystem.addElement(this.fpsCounter);
    
    // Info panel in the center
    const infoText = 'Fungeon Engine v0.4';
    this.infoText = new TextBox(
      renderer.getWidth() / 2 - 100,
      24,
      200,
      38,
      infoText,
      'vga',
      1,
      '#ffffff',
      'center'
    );
    uiSystem.addElement(this.infoText);
    
    // Controls panel
    const controlsText = 'Arrows: rotate cube\n' +
                        'WASDEQ: move camera\n' +
                        'IJKLUO: move tracker\n' +
                        'T: camera tracking\n' +
                        'C: tracker tracking';
    this.controlsText = new TextBox(
      renderer.getWidth() / 2 - 100,
      154,
      200,
      70, // Increased height for extra line
      controlsText,
      'vga',
      1,
      '#ffffff',
      'center'
    );
    uiSystem.addElement(this.controlsText);
    
    // Status indicator in the bottom-right (updated by ECS)
    this.statusText = new TextBox(
      renderer.getWidth() - 110,
      2,
      100,
      12,
      'ENTITIES: 0',
      'tiny',
      1,
      '#ff00ff',
      'right'
    );
    uiSystem.addElement(this.statusText);
    
    // Mouse position indicator in the bottom-left (updated by polling)
    this.mousePositionText = new TextBox(
      51,
      2,
      120,
      20,
      'Mouse: 0, 0',
      'tiny',
      1,
      '#00ffff',
      'left'
    );
    uiSystem.addElement(this.mousePositionText);
    
    console.log('UI elements created');
  }

  /**
   * Load a test model from the assets directory
   * @param modelPath Path to the model relative to assets/models
   */
  private async loadTestModel(modelPath: string): Promise<THREE.Object3D | null> {
    if (!this.assetManager || !this.world) {
      console.error('Asset manager or world not initialized');
      return null;
    }
    
    try {
      // Update status text
      if (this.statusText) {
        this.statusText.setText(`Loading model: ${modelPath}...`);
      }
      
      // Load the model as entities
      const rootObject = await this.assetManager.createEntitiesFromModel(
        `models/${modelPath}`,
        null,
        { wireframe: true, color: 0x00ffff }
      );
      
      // Update status text
      if (this.statusText) {
        this.statusText.setText(`Model loaded: ${modelPath}`);
      }
      
      return rootObject;
    } catch (error) {
      console.error('Error loading model:', error);
      
      // Update status text
      if (this.statusText) {
        this.statusText.setText(`Error loading model: ${modelPath}`);
      }
      
      return null;
    }
  }
} 
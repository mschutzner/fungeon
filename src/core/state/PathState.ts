import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { Engine } from '../Engine';
import { TextBox } from '../../ui/elements/TextBox';
import { 
  World, 
  Entity, 
  SerializationSystem, 
  CameraSystem,
  CameraComponent, 
  CameraType,
  MeshComponent,
  GeometryType,
  ThreeObject,
  MaterialComponent,
  ConstraintComponent,
  ConstraintType,
} from '../../ecs';
import { AnimationComponent, AnimationLoopMode } from '../../ecs/components/AnimationComponent';
import { LightComponent, LightType } from '../../ecs/components/LightComponent';
import { AssetType, AssetDescriptor } from '../assets/AssetManager';
import { AnimationSystem } from '../../ecs/systems/AnimationSystem';
import { InputManager } from '../input/InputManager';
import { CurveComponent } from '../../ecs/components/CurveComponent';
import { EventSystem } from '../events/EventSystem';
import { GameInputEventType, GameInputEventData } from '../input/GameInputEvents';

/**
 * TestState state that displays a cube
 */
export class PathState extends State {
  private scene: THREE.Scene | null = null;
  
  // UI elements
  private fpsCounter: TextBox | null = null;
  private statusText: TextBox | null = null;
  private cameraInfoText: TextBox | null = null;
  private pathInfoText: TextBox | null = null;
  
  // Movement settings
  private cameraMovementSpeed: number = 0.15; // units per second
  private cameraRotationSpeed: number = Math.PI / 64; // degrees per second
  
  // Reference to engine
  private engine: Engine;
  
  // ECS World
  private world: World | null = null;
  
  // ECS Entity IDs
  private trackerEntityId: number = -1;
  private cameraEntityId: number = -1;
  private pathEntityId: number = -1;
  
  // Path settings
  private pathVisible: boolean = true;
  private pathDistance: number = 0;
  private pathDistanceChangedSpeed: number = 0.1; // How fast the distance changes per second
  private pathLooping: boolean = true; // Track if the path is looping
  
  // Systems
  private cameraSystem: CameraSystem | null = null;
  private eventSystem: EventSystem;
  
  // Input state for camera movement
  private inputState = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    rotateUp: false,
    rotateDown: false,
    rotateLeft: false,
    rotateRight: false
  };
  
  // Event unsubscribe callbacks
  private unsubscribeCallbacks: (() => void)[] = [];
  
  constructor(engine: Engine) {
    super('pathState');
    this.engine = engine;
    this.eventSystem = EventSystem.getInstance();

    this.assets = [
      {
        id: 'medium',
        type: AssetType.FONT,
        path: 'ascii/medium6x10.png'
      },
    ];
  }
  
  /**
   * Override getAssetsToPreload to provide the assets this state needs
   */
  protected override getAssetsToPreload(): AssetDescriptor[] {
    return this.assets;

    
  }
  
  /**
   * Initialize the state
   */
  async enter(): Promise<void> {
    console.log('Entering path state');
    
    // Initialize ECS World
    this.initializeEcsWorld();
    
    // Get the scene from the world
    if (this.world) {
      this.scene = this.world.getScene();
      this.scene.background = new THREE.Color('#222034');
      
      // Set ambient light intensity to 1.0
      this.world.setAmbientLightIntensity(0.5);
    }
  
    // Create camera entity
    this.createCameraEntity();
    
    // Create point light at position (2,2,2)
    this.createPointLight();
    
    // Create the cyan path
    this.createPath();
    
    // Create tracker that follows the path
    this.createTracker();
    
    // Set up input listeners for game actions
    this.setupInputListeners();
    
    return Promise.resolve();
  }
  
  /**
   * Set up listeners for game action events
   */
  private setupInputListeners(): void {
    // Movement
    this.unsubscribeCallbacks.push(
      this.eventSystem.subscribe(GameInputEventType.MOVE_UP, this.handleMovementAction.bind(this, 'moveForward')),
      this.eventSystem.subscribe(GameInputEventType.MOVE_DOWN, this.handleMovementAction.bind(this, 'moveBackward')),
      this.eventSystem.subscribe(GameInputEventType.MOVE_LEFT, this.handleMovementAction.bind(this, 'moveLeft')),
      this.eventSystem.subscribe(GameInputEventType.MOVE_RIGHT, this.handleMovementAction.bind(this, 'moveRight')),
      
      // Actions for camera rotation
      this.eventSystem.subscribe(GameInputEventType.D_UP, this.handleMovementAction.bind(this, 'rotateUp')),
      this.eventSystem.subscribe(GameInputEventType.D_DOWN, this.handleMovementAction.bind(this, 'rotateDown')),
      this.eventSystem.subscribe(GameInputEventType.D_LEFT, this.handleMovementAction.bind(this, 'rotateLeft')),
      this.eventSystem.subscribe(GameInputEventType.D_RIGHT, this.handleMovementAction.bind(this, 'rotateRight')),
      
      // Additional controls
      this.eventSystem.subscribe(GameInputEventType.MINUS, this.handleMovementAction.bind(this, 'moveDown')),
      this.eventSystem.subscribe(GameInputEventType.PLUS, this.handleMovementAction.bind(this, 'moveUp')),
      
      // Menu triggers path visibility toggle
      this.eventSystem.subscribe(GameInputEventType.INTERACT, this.handleMenuAction.bind(this)),
      
      // Inventory triggers path looping toggle
      this.eventSystem.subscribe(GameInputEventType.CONTINUE, this.handleInventoryAction.bind(this))
    );
    
    console.log('Game action event listeners set up');
  }
  
  /**
   * Handle movement and rotation actions
   */
  private handleMovementAction(action: keyof typeof this.inputState, data: GameInputEventData): void {
    this.inputState[action] = data.pressed;
  }
  
  /**
   * Handle menu action (toggle path visibility)
   */
  private handleMenuAction(data: GameInputEventData): void {
    if (data.pressed && !data.repeat) {
      this.pathVisible = !this.pathVisible;
      
      // Update the path component
      if (this.world && this.pathEntityId !== -1) {
        const pathEntity = this.world.getEntity(this.pathEntityId);
        if (pathEntity) {
          const curveComponent = pathEntity.getComponent(CurveComponent);
          if (curveComponent) {
            curveComponent.setShowPath(this.pathVisible);
            console.log(`Path visibility set to: ${this.pathVisible}`);
          }
        }
      }
    }
  }
  
  /**
   * Handle inventory action (toggle path looping)
   */
  private handleInventoryAction(data: GameInputEventData): void {
    if (data.pressed && !data.repeat) {
      this.pathLooping = !this.pathLooping;
      this.pathDistance = 0;
      
      // Update the tracker constraint
      if (this.world && this.trackerEntityId !== -1) {
        const trackerEntity = this.world.getEntity(this.trackerEntityId);
        if (trackerEntity) {
          const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
          if (constraintComponent) {
            constraintComponent.setLooping(this.pathLooping);
            constraintComponent.updatePathDistance(this.pathDistance);
            console.log(`Path looping set to: ${this.pathLooping}`);
          }
        }
      }
    }
  }
  
  /**
   * Initialize the ECS World with systems
   */
  private initializeEcsWorld(): void {
    // Create a new world
    this.world = new World();
    
    console.log("Creating ECS world for monkey test");
    
    // Register component types for serialization
    this.world.registerComponent('CameraComponent', CameraComponent);
    this.world.registerComponent('MeshComponent', MeshComponent);
    this.world.registerComponent('MaterialComponent', MaterialComponent);
    this.world.registerComponent('AnimationComponent', AnimationComponent);
    this.world.registerComponent('CurveComponent', CurveComponent);
    this.world.registerComponent('ConstraintComponent', ConstraintComponent);
    
    // Initialize core systems - this will set up ThreeSceneSystem and CameraSystem
    this.world.initializeCoreEcsSystems();
    
    // Register additional systems
    this.world.registerSystem(new SerializationSystem());
    this.world.registerSystem(new AnimationSystem());
    
    // Get references to systems for convenience
    this.cameraSystem = this.world.getCameraSystem();
    
    // Connect the renderer with our ECS world
    const renderer = this.engine.getRenderer();
    if (renderer && this.world) {
      this.world.setRenderer(renderer);
    }
    
    console.log('ECS World initialized with core systems');
  }
  
  /**
   * Create a tracker entity that will follow the path
   */
  private createTracker(): void {
    if (!this.world) return;
    
    // Create a new entity for the tracker
    const trackerEntity = this.world.createEntity('tracker');
    
    // Add ThreeObject component
    const threeObject = new ThreeObject(new THREE.Vector3(0, 0, 0));
    trackerEntity.addComponent(threeObject);
    
    // Add a MeshComponent so we can see the tracker
    const meshComponent = new MeshComponent(GeometryType.CONE, 0xff0000);
    meshComponent.size.height = 1.0;
    trackerEntity.addComponent(meshComponent);
    
    // Add a ConstraintComponent to make the tracker follow the path
    const constraintComponent = new ConstraintComponent();
    
    // For a cone, the tip points in +Y direction by default in Three.js
    // So we set the trackAxis to point +Y along the path direction
    constraintComponent.createPathFollowConstraint(
      this.pathEntityId,
      this.pathDistance,
      true, // rotateToFace
      new THREE.Vector3(0, 1, 0), // trackAxis - align +Y with path direction (cone tip)
      new THREE.Vector3(0, 0, 1), // upAxis - use +Z as up vector so cone faces forward
      true, // loop
      new THREE.Vector3(0, 0, 0), // offset
      1.0, // influence
      0 // priority
    );
    trackerEntity.addComponent(constraintComponent);
    
    // Store the ID for later reference
    this.trackerEntityId = trackerEntity.id;
    
    console.log('Tracker entity created with ID:', this.trackerEntityId);
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
      new THREE.Vector3(0, 5, 10),
      new THREE.Euler(Math.PI / -6, 0, 0),
      true // Make this the active camera
    );
    
    // Get the camera component and customize it
    const cameraComponent = cameraEntity.getComponent(CameraComponent);
    if (cameraComponent) {
      cameraComponent.setFov(75);
      cameraComponent.setAspect(aspect);
      cameraComponent.setClippingPlanes(0.1, 1000);
      cameraComponent.setClearColor('#222034'); // Set clear color to #222034
    }
    
    // Store the entity ID for later reference
    this.cameraEntityId = cameraEntity.id;
    
    console.log('Camera entity created with ID:', this.cameraEntityId);
    console.log('Camera Controls:');
    console.log('  Movement: WASD (forward/backward/left/right)');
    console.log('  Up/Down: Q/E');
    console.log('  Rotation: Arrow Keys');
    console.log('  Path Controls: [ and ] to move tracker along path');
  }
  
  /**
   * Create a cyan path using the CurveComponent
   */
  private createPath(): void {
    if (!this.world) return;
    
    // Create a new entity for the path
    const pathEntity = this.world.createEntity('path');
    
    // Define parameters for our circular path
    const radius = 5;            // Circle radius
    const numPoints = 8;        // More points for smoother curves
    const baseHeight = 0.5;      // Base height from the ground
    const waveHeight = 5.0;      // Amplitude of the sine wave
    const waveFrequency = 4;     // How many complete sine waves around the circle
    
    const pathPoints: THREE.Vector3[] = [];
    const controlPoints: THREE.Vector3[] = [];
    
    // Create points around a circle with y coordinate varying by sine of angle
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      
      // Perfect circle in XZ plane
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      
      // Y varies by sine of the angle
      const y = baseHeight + waveHeight * Math.sin(angle * waveFrequency);
      
      pathPoints.push(new THREE.Vector3(x, y, z));
    }
    
    // Add the first point again to close the loop
    pathPoints.push(pathPoints[0].clone());
    
    // Calculate control points for a perfect circle with sine wave in Y
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p0 = pathPoints[i];
      const p3 = pathPoints[(i + 1) % pathPoints.length];
      
      // Calculate angles for this segment
      const angle = (i / numPoints) * Math.PI * 2;
      const nextAngle = ((i + 1) / numPoints) * Math.PI * 2;
      
      // For a perfect circle in XZ, use optimal bezier curve control point distance
      const tangentFactor = (4/3) * Math.tan(Math.PI / (2 * numPoints));
      
      // Calculate tangent vectors in XZ plane (perpendicular to radius vector)
      const tangentXZ1 = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
        .multiplyScalar(radius * tangentFactor);
      
      const tangentXZ2 = new THREE.Vector3(-Math.sin(nextAngle), 0, Math.cos(nextAngle))
        .multiplyScalar(radius * tangentFactor);
      
      // Calculate Y derivatives for the sine wave for smooth height transitions
      const yDerivative1 = waveHeight * Math.cos(angle * waveFrequency) * waveFrequency;
      const yDerivative2 = waveHeight * Math.cos(nextAngle * waveFrequency) * waveFrequency;
      
      // Determine how much of the tangent to apply to the Y coordinate 
      const yTangentFactor = (Math.PI * 2) / numPoints / waveFrequency;
      
      // Create control points that maintain a perfect circle in XZ while following the sine wave in Y
      const cp1 = new THREE.Vector3(
        p0.x + tangentXZ1.x,
        p0.y + yDerivative1 * yTangentFactor * tangentFactor,
        p0.z + tangentXZ1.z
      );
      
      const cp2 = new THREE.Vector3(
        p3.x - tangentXZ2.x, // Negate for approaching direction
        p3.y - yDerivative2 * yTangentFactor * tangentFactor, // Negate for approaching direction
        p3.z - tangentXZ2.z
      );
      
      controlPoints.push(cp1, cp2);
    }
    
    // Add ThreeObject component
    pathEntity.addComponent(new ThreeObject(new THREE.Vector3(0, 0, 0)));
    
    // Add CurveComponent with cyan color (0x00ffff) - providing our custom control points
    const curveComponent = new CurveComponent(pathPoints, controlPoints, 0x00ffff, this.pathVisible);
    
    // Optionally show control points for debugging
    // curveComponent.setShowControlPoints(true);
    
    pathEntity.addComponent(curveComponent);
    
    // Store the entity ID for later reference
    this.pathEntityId = pathEntity.id;
    
    console.log('Cyan circular path with sine wave height created with ID:', this.pathEntityId);
  }
  
  /**
   * Exit the state
   */
  async exit(): Promise<void> {
    console.log('Exiting monkey test state');
    
    // Clean up event subscriptions
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    this.unsubscribeCallbacks = [];
    
    // Cleanup resources
    this.scene = null;
    this.cameraSystem = null;
    this.world = null;
    
    return Promise.resolve();
  }
  
  /**
   * Setup rendering data for the state
   * @param renderer The renderer to use
   */
  setupRenderingData(renderer: Renderer): void {
    // Create UI elements
    this.createUIElements(renderer);
  }
  
  /**
   * Create UI elements
   */
  private createUIElements(renderer: Renderer): void {
    const uiSystem = renderer.getUISystem();
    if (!uiSystem) return;
    
    // FPS/TPS Counter in the top-left (green) with enough height for 2 lines
    this.fpsCounter = new TextBox(2, 2, 100, 30, 'FPS: 0\nTPS: 0', 'medium', 1, '#00ff00', 'left');
    uiSystem.addElement(this.fpsCounter);
    
    // Status indicator in the bottom-right (updated by ECS)
    this.statusText = new TextBox(
      renderer.getWidth() - 102,
      2,
      100,
      12,
      'ENTITIES: 0',
      'medium',
      1,
      '#ff00ff',
      'right'
    );
    uiSystem.addElement(this.statusText);
    
    // Path info text in cyan above the camera info
    this.pathInfoText = new TextBox(
      2,
      renderer.getHeight() - 54,
      200,
      34,
      'Path: Visible, Looping, 0%',
      'medium',
      1,
      '#00ffff',
      'left'
    );
    uiSystem.addElement(this.pathInfoText);
    
    // Camera info text in the bottom-left
    this.cameraInfoText = new TextBox(
      2,
      renderer.getHeight() - 24,
      200,
      20,
      'Camera Position: (0,0,0)',
      'medium',
      1,
      '#00ff00',
      'left'
    );
    uiSystem.addElement(this.cameraInfoText);
    
    console.log('UI elements created');
  }
  
  /**
   * Update the state
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Update camera controls
    this.updateCameraControls(deltaTime);
    
    // Update UI elements
    this.updateUIElements();
    
    // Handle tracker position along path
    this.handlePathDistance(deltaTime);
    
    // Update the ECS world
    if (this.world) {
      this.world.update(deltaTime);
    }
  }
  
  /**
   * Handle changing the tracker's position along the path
   * Use [ and ] keys to move backward and forward
   */
  private handlePathDistance(deltaTime: number): void {
    this.pathDistance += this.pathDistanceChangedSpeed * deltaTime;  
    
    // Update the constraint if needed
    if (this.world && this.trackerEntityId !== -1) {
      const trackerEntity = this.world.getEntity(this.trackerEntityId);
      if (trackerEntity) {
        const constraintComponent = trackerEntity.getComponent(ConstraintComponent);
        if (constraintComponent) {
          constraintComponent.updatePathDistance(this.pathDistance);
        }
      }
    }
  }
  
  /**
   * Render the state
   * This is called during the render loop at the display's refresh rate
   * @param deltaTime Time since last render in seconds
   */
  render(deltaTime: number): void {
    // Render ECS world (which handles rendering systems)
    if (this.world) {
      this.world.render(deltaTime);
    }
  }

  /**
   * Handle camera movement and rotation using the input state
   * @param deltaTime Time since last frame in seconds
   */
  private updateCameraControls(deltaTime: number): void {
    if (!this.world || !this.cameraEntityId) return;
    
    // Get the camera entity
    const cameraEntity = this.world.getEntity(this.cameraEntityId);
    if (!cameraEntity) return;
    
    // Get the transform component
    const threeObject = cameraEntity.getComponent(ThreeObject);
    if (!threeObject) return;

    const cameraObject = threeObject.object;
    
    // Calculate movement speed based on deltaTime
    const moveAmount = this.cameraMovementSpeed;
    const rotateAmount = this.cameraRotationSpeed;
    
    // Apply movement based on input state
    if (this.inputState.moveForward) {
      cameraObject.translateZ(-moveAmount);
    }
    
    if (this.inputState.moveBackward) {
      cameraObject.translateZ(moveAmount);
    }
    
    if (this.inputState.moveLeft) {
      cameraObject.translateX(-moveAmount);
    }
    
    if (this.inputState.moveRight) {
      cameraObject.translateX(moveAmount);
    }
    
    if (this.inputState.moveUp) {
      cameraObject.translateY(moveAmount);
    }
    
    if (this.inputState.moveDown) {
      cameraObject.translateY(-moveAmount);
    }
    
    // Apply rotation based on input state
    if (this.inputState.rotateUp) {
      cameraObject.rotateX(rotateAmount);
    }
    
    if (this.inputState.rotateDown) {
      cameraObject.rotateX(-rotateAmount);
    }
    
    if (this.inputState.rotateLeft) {
      cameraObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotateAmount);
    }
    
    if (this.inputState.rotateRight) {
      cameraObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -rotateAmount);
    }
  }

  /**
   * Update camera information display
   */
  private updateCameraInfoDisplay(): void {
    if (!this.cameraInfoText || !this.world || !this.cameraEntityId) return;
    
    const cameraEntity = this.world.getEntity(this.cameraEntityId);
    if (!cameraEntity) return;
    
    const threeObject = cameraEntity.getComponent(ThreeObject);
    if (!threeObject) return;

    const cameraObject = threeObject.object;
    
    const position = cameraObject.position.clone();
    const rotation = cameraObject.rotation.clone();

    rotation.x = THREE.MathUtils.radToDeg(rotation.x);
    rotation.y = THREE.MathUtils.radToDeg(rotation.y);
    rotation.z = THREE.MathUtils.radToDeg(rotation.z);
    
    // Display camera position, rotation, and path info
    this.cameraInfoText.setText(
      `Pos: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})\n` +
      `Rot: (${rotation.x.toFixed(1)}, ${rotation.y.toFixed(1)}, ${rotation.z.toFixed(1)})`
    );
  }

  /**
   * Create a point light entity at position (2,2,2)
   */
  private createPointLight(): void {
    if (!this.world) return;
    
    // Create a new entity for the point light
    const lightEntity = this.world.createEntity('pointLight');
    
    // Add ThreeObject component
    lightEntity.addComponent(new ThreeObject(new THREE.Vector3(2, 2, 2)));
    
    // Add LightComponent
    const lightComponent = new LightComponent(LightType.POINT, 0xffffff, 2.5);
    
    // Add the light component to the entity
    lightEntity.addComponent(lightComponent);
    
    console.log('Point light created at position (2,2,2)');
  }
  
  /**
   * Update UI elements
   */
  private updateUIElements(): void {
    // Update camera info display
    this.updateCameraInfoDisplay();
    
    // Update path info display
    this.updatePathInfoDisplay();
    
    // Update FPS text
    if (this.fpsCounter) {
      // Use explicit line break for better formatting
      this.fpsCounter.setText(`FPS: ${this.engine.getFps()}\nTPS: ${this.engine.getTps()}`);
    }

    // Update entity count
    if (this.statusText && this.world) {
      const entityCount = this.world.getAllEntities().length;
      this.statusText.setText(`ENTITIES: ${entityCount}`);
    } else if (this.statusText) {
      this.statusText.setText('NO ECS');
    }
  }

  /**
   * Update path information display
   */
  private updatePathInfoDisplay(): void {
    if (!this.pathInfoText) return;
    
    const visibilityText = this.pathVisible ? 'Path Visible' : 'Path Hidden';
    const loopingText = this.pathLooping ? 'Looping' : 'Not Looping';
    const distanceText = `Progress: ${(this.pathDistance * 100).toFixed(0)}%`;
    
    this.pathInfoText.setText(
      `${visibilityText}\n${loopingText}\n${distanceText}`
    );
  }
} 
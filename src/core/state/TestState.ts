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
} from '../../ecs';
import { AnimationComponent, AnimationLoopMode } from '../../ecs/components/AnimationComponent';
import { LightComponent, LightType } from '../../ecs/components/LightComponent';
import { AssetType, AssetDescriptor } from '../assets/AssetManager';
import { AnimationSystem } from '../../ecs/systems/AnimationSystem';
import { InputManager } from '../input/InputManager';

/**
 * TestState state that displays a cube
 */
export class TestState extends State {
  private scene: THREE.Scene | null = null;
  
  // UI elements
  private fpsCounter: TextBox | null = null;
  private statusText: TextBox | null = null;
  private cameraInfoText: TextBox | null = null;
  
  // Movement settings
  private cameraMovementSpeed: number = 0.1; // units per second
  private cameraRotationSpeed: number = Math.PI / 24; // degrees per second
  
  // Reference to engine
  private engine: Engine;
  
  // ECS World
  private world: World | null = null;
  
  // ECS Entity IDs
  private trackerEntityId: number = -1;
  private monkeyEntityId: number = -1;
  private cameraEntityId: number = -1;
  
  // Systems
  private cameraSystem: CameraSystem | null = null;
  
  constructor(engine: Engine) {
    super('testState');
    this.engine = engine;
    
    // Define assets to preload
    this.assets = [
      {
        id: 'medium',
        type: AssetType.FONT,
        path: 'ascii/medium6x10.png'
      },
      {
        id: 'wukong',
        type: AssetType.MODEL,
        path: 'models/wukong.glb'
      },
      {
        id: 'wukong-texture',
        type: AssetType.TEXTURE,
        path: 'textures/wukong.png'
      },
      {
        id: 'uv-test',
        type: AssetType.TEXTURE,
        path: 'textures/uv-test.jpg'
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
    console.log('Entering test state');
    
    // Initialize ECS World
    this.initializeEcsWorld();
    
    // Get the scene from the world
    if (this.world) {
      this.scene = this.world.getScene();
      this.scene.background = new THREE.Color('#222034');
      
      // Set ambient light intensity to 1.0
      this.world.setAmbientLightIntensity(0.5);
    }
    
    // Create tracker entity
    this.createTrackerEntity();

    // Create camera entity
    this.createCameraEntity();

    // create monkey entity
    this.createMonkeyEntity();
    
    // Create point light at position (2,2,2)
    this.createPointLight();
    
    return Promise.resolve();
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
   * Create a tracker entity
   */
  private createTrackerEntity(): void {
    if (!this.world) return;

    // Create a new entity for the tracker
    const trackerEntity = this.world.createEntity('tracker');

    // Add ThreeObject component
    const threeObject = new ThreeObject(new THREE.Vector3(0, 1, 0));
    trackerEntity.addComponent(threeObject);
    
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
      new THREE.Vector3(0, 1.2, 1.2),
      new THREE.Euler(Math.PI / -12, 0, 0),
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

    const constraintComponent = new ConstraintComponent();
    constraintComponent.createTrackToConstraint(this.trackerEntityId);
    cameraEntity.addComponent(constraintComponent);
    
    // Store the entity ID for later reference
    this.cameraEntityId = cameraEntity.id;
    
    console.log('Camera entity created with ID:', this.cameraEntityId);
    console.log('Camera Controls:');
    console.log('  Movement: WASD (forward/backward/left/right)');
    console.log('  Up/Down: Q/E');
    console.log('  Rotation: Arrow Keys');
  }
  
  /**
   * Exit the state
   */
  async exit(): Promise<void> {
    console.log('Exiting monkey test state');
    
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
    
    // Update monkey rotation
    this.updateMonkeyRotation();
    
    // Update UI elements
    this.updateUIElements();
    
    // Update the ECS world
    if (this.world) {
      this.world.update(deltaTime);
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
   * Handle camera movement and rotation with keyboard controls
   * @param deltaTime Time since last frame in seconds
   */
  private updateCameraControls(deltaTime: number): void {
    if (!this.world || !this.cameraEntityId) return;
    
    // Get input manager
    const inputManager = InputManager.getInstance();
    
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
    
    // Movement controls - WASD for horizontal, QE for vertical
    if (inputManager.isKeyDown('w')) {
      cameraObject.translateZ(-moveAmount);
    }
    
    if (inputManager.isKeyDown('s')) {
      cameraObject.translateZ(moveAmount);
    }
    
    if (inputManager.isKeyDown('a')) {
      cameraObject.translateX(-moveAmount);
    }
    
    if (inputManager.isKeyDown('d')) {
      cameraObject.translateX(moveAmount);
    }
    
    if (inputManager.isKeyDown('e') ) {
      cameraObject.translateY(moveAmount);
    }
    
    if (inputManager.isKeyDown('q')) {
      cameraObject.translateY(-moveAmount);
    }
    
    // Rotation controls - Arrow keys
    // Pitch up/down - around local X axis
    if (inputManager.isKeyDown('ArrowUp')) {
      cameraObject.rotateX(rotateAmount);
    }
    
    if (inputManager.isKeyDown('ArrowDown')) {
      cameraObject.rotateX(-rotateAmount);
    }
    
    // Yaw left/right - around world Y axis
    if (inputManager.isKeyDown('ArrowLeft')) {
      cameraObject.rotateOnWorldAxis( new THREE.Vector3( 0, 1, 0 ), rotateAmount);
    }
    
    if (inputManager.isKeyDown('ArrowRight')) {
      cameraObject.rotateOnWorldAxis( new THREE.Vector3( 0, 1, 0 ), -rotateAmount);
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
    
    // Display camera position and rotation
    this.cameraInfoText.setText(
      `Pos: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})\n` +
      `Rot: (${rotation.x.toFixed(1)}, ${rotation.y.toFixed(1)}, ${rotation.z.toFixed(1)})`
    );
  }

  private createMonkeyEntity(): void {
    if (!this.world) return;

    // Create a new entity for the cube
    const monkeyEntity = this.world.createEntity('monkey');
    
    // Add ThreeObject component
    const threeObject = new ThreeObject(new THREE.Vector3(0, 0, 0));
    monkeyEntity.addComponent(threeObject);

    // Get model geometry and animations
    const model = this.assetManager.getModel('wukong');
    const geometry = model?.geometry;
    const animations = model?.animations || [];
    const skeleton = model?.skeleton;
    const rootBone = model?.rootBone;
    
    // If we have a skeleton, create a skinned mesh
    if (skeleton && geometry) {
      console.log('Creating model with skeleton');
      const meshComponent = new MeshComponent(
        GeometryType.MODEL, 
        0x808080, 
        geometry,
        skeleton,
        rootBone
      );
      monkeyEntity.addComponent(meshComponent);
    } else {
      // Otherwise, create a regular mesh
      console.log('Creating model without skeleton');
      const meshComponent = new MeshComponent(GeometryType.MODEL, 0x808080, geometry);
      monkeyEntity.addComponent(meshComponent);
    }

    // Get the preloaded texture
    const texture = this.assetManager.getTexture('wukong-texture');
    if (texture) {
      texture.flipY = false;
    }
    
    // Add material component with the texture
    const materialComponent = new MaterialComponent({
      map: texture,
      transparent: true,
    });
    monkeyEntity.addComponent(materialComponent);
    
    // Add animation component with the model animations
    const animComponent = new AnimationComponent(animations);
    monkeyEntity.addComponent(animComponent);
    
    // Play wave animation in ping-pong mode
    animComponent.loopMode = AnimationLoopMode.PING_PONG;
    animComponent.playPingPong('wave');
    
    // Store the entity ID for later reference
    this.monkeyEntityId = monkeyEntity.id;
    
    console.log('Monkey entity created with ID:', this.monkeyEntityId);
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

  private updateMonkeyRotation(): void {
    if (!this.world || !this.monkeyEntityId) return;
    
    // Get the cube entity
    const monkeyEntity = this.world.getEntity(this.monkeyEntityId);
    if (!monkeyEntity) return;
  }
  
  /**
   * Update UI elements
   */
  private updateUIElements(): void {
    // Update camera info display
    this.updateCameraInfoDisplay();
    
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
} 
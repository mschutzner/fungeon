import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { Engine } from '../Engine';
import { TextBox } from '../../ui/elements/TextBox';
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
  MaterialComponent
} from '../../ecs';
import { LightComponent, LightType } from '../../ecs/components/LightComponent';
import { AssetType, AssetDescriptor } from '../assets/AssetManager';

/**
 * TestState state that displays a cube
 */
export class TestState extends State {
  private scene: THREE.Scene | null = null;
  
  // UI elements
  private fpsCounter: TextBox | null = null;
  private statusText: TextBox | null = null;
  
  // Reference to engine
  private engine: Engine;
  
  // ECS World
  private world: World | null = null;
  
  // ECS Entity IDs
  private cubeEntityId: number = -1;
  private monkeyEntityId: number = -1;
  private cameraEntityId: number = -1;
  
  // Systems
  private threeSceneSystem: ThreeSceneSystem | null = null;
  private cameraSystem: CameraSystem | null = null;
  
  // Test texture
  private testTextureId = 'uv_test';
  
  constructor(engine: Engine) {
    super('testState');
    this.engine = engine;
    
    // Define assets to preload
    this.assets = [
      {
        id: this.testTextureId,
        type: AssetType.TEXTURE,
        path: 'textures/uv-test.jpg'
      },
      {
        id: 'monkey',
        type: AssetType.MODEL,
        path: 'models/monkey.glb'
      },
      {
        id: 'medium',
        type: AssetType.FONT,
        path: 'ascii/medium6x10.png'
      }
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
    
    // Create camera entity
    this.createCameraEntity();

    // create cube entity
    //this.createCubeEntity();

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
    this.world.registerComponent('Transform', Transform);
    this.world.registerComponent('CameraComponent', CameraComponent);
    this.world.registerComponent('MeshComponent', MeshComponent);
    this.world.registerComponent('MaterialComponent', MaterialComponent);
    
    // Initialize core systems - this will set up ThreeSceneSystem and CameraSystem
    this.world.initializeCoreEcsSystems();
    
    // Register additional systems
    this.world.registerSystem(new SerializationSystem());
    
    // Get references to systems for convenience
    this.threeSceneSystem = this.world.getThreeSceneSystem();
    this.cameraSystem = this.world.getCameraSystem();
    
    // Connect the renderer with our ECS world
    const renderer = this.engine.getRenderer();
    if (renderer && this.world) {
      this.world.setRenderer(renderer);
    }
    
    console.log('ECS World initialized with core systems');
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
      new THREE.Vector3(0, 0, 2.5),
      new THREE.Euler(0, 0, 0),
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
  }
  
  /**
   * Exit the state
   */
  async exit(): Promise<void> {
    console.log('Exiting monkey test state');
    
    // Cleanup resources
    this.scene = null;
    this.threeSceneSystem = null;
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
    
    console.log('UI elements created');
  }
  
  /**
   * Update the state
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    // Update the world
    if (this.world) {
      this.world.update(deltaTime);
    } 

    // this.updateCubeRotation();
    this.updateMonkeyRotation();
    // Update FPS text
    if (this.fpsCounter) {
      // Use explicit line break for better formatting
      this.fpsCounter.setText(`FPS: ${this.engine.getFps()}\nTPS: ${this.engine.getTps()}`);
    }

    // Update entity count
    if (this.statusText) {
      if (this.world) {
        const entityCount = this.world.getAllEntities().length;
        this.statusText.setText(`ENTITIES: ${entityCount}`);
      } else {
        this.statusText.setText('NO ECS');
      }
    }
  }

  private createCubeEntity(): void {
    if (!this.world) return;
    
    // Create a new entity for the cube
    const cubeEntity = this.world.createEntity('cube');
    
    // Add transform component with position at (0,0,0)
    const transform = new Transform(0, 0, 0);
    cubeEntity.addComponent(transform);
    
    // Add ThreeObject component
    const objectComponent = new ThreeObject();
    cubeEntity.addComponent(objectComponent);

    // Add MeshComponent with a cube geometry
    const meshComponent = new MeshComponent(GeometryType.BOX, 0x00ff00);
    cubeEntity.addComponent(meshComponent);

    // Get the preloaded texture
    const texture = this.assetManager.getTexture(this.testTextureId);

    // Add material component with the texture
    const materialComponent = new MaterialComponent({
      map: texture
    });
    cubeEntity.addComponent(materialComponent);

    // Store the entity ID for later reference
    this.cubeEntityId = cubeEntity.id;
    
    console.log('Cube entity created with ID:', this.cubeEntityId);
  }

  private createMonkeyEntity(): void {
    if (!this.world) return;
    
    // Create a new entity for the cube
    const monkeyEntity = this.world.createEntity('monkey');
    
    // Add transform component with position at (0,0,0)
    monkeyEntity.addComponent(new Transform(0, 0, 0));
    
    // Add ThreeObject component
    monkeyEntity.addComponent(new ThreeObject());

    // Add MeshComponent with a cube geometry
    const geometry = this.assetManager.getModelGeometry('monkey');
    const meshComponent = new MeshComponent(GeometryType.MODEL, 0x808080, geometry);
    monkeyEntity.addComponent(meshComponent);

    monkeyEntity.addComponent(new MaterialComponent());

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
    
    // Add transform component with position at (2,2,2)
    const transform = new Transform(2, 2, 2);
    lightEntity.addComponent(transform);
    
    // Add ThreeObject component
    lightEntity.addComponent(new ThreeObject());
    
    // Add LightComponent
    const lightComponent = new LightComponent(LightType.POINT, 0xffffff, 5.0);
    
    // Add the light component to the entity
    lightEntity.addComponent(lightComponent);
    
    console.log('Point light created at position (2,2,2)');
  }

  private updateCubeRotation(): void {
    if (!this.world) return;
    
    // Get the cube entity
    const cubeEntity = this.world.getEntity(this.cubeEntityId);
    if (!cubeEntity) return;
    
    // Get the transform component
    const transform = cubeEntity.getComponent(Transform);
    if (!transform) return; 

    transform.rotate([3.75,3.75,0]);
  }

  private updateMonkeyRotation(): void {
    if (!this.world) return;
    
    // Get the cube entity
    const monkeyEntity = this.world.getEntity(this.monkeyEntityId);
    if (!monkeyEntity) return;
    
    // Get the transform component
    const transform = monkeyEntity.getComponent(Transform);
    if (!transform) return; 

    transform.rotate([0,3.75,0]);
  }
  
} 
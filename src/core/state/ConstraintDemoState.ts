import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TextBox } from '../../ui/elements/TextBox';
import { Engine } from '../Engine';
import { InputManager } from '../input/InputManager';
import { EventSystem } from '../events/EventSystem';
import { InputEventType } from '../input/InputManager';
import { 
  World, 
  Entity,
  IEntity,
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
  ConstraintSystem,
  Rotation,
  Vector3,
  ConstraintType,
  Axis
} from '../../ecs';

/**
 * Base state for all constraint demos
 */
export abstract class ConstraintDemoState extends State {
  protected scene: THREE.Scene | null = null;
  
  // UI elements
  protected titleText: TextBox | null = null;
  protected descriptionText: TextBox | null = null;
  protected instructionsText: TextBox | null = null;
  protected statusText: TextBox | null = null;
  protected fpsCounter: TextBox | null = null;
  
  // Reference to engine
  protected engine: Engine;
  
  // Input manager
  protected inputManager: InputManager;
  
  // Event system
  protected eventSystem: EventSystem;
  
  // Event subscription cleanup
  protected eventUnsubscribe: (() => void)[] = [];
  
  // ECS World
  protected world: World | null = null;
  
  // Systems
  protected threeSceneSystem: ThreeSceneSystem | null = null;
  protected cameraSystem: CameraSystem | null = null;
  protected constraintSystem: ConstraintSystem | null = null;
  
  // Constraint type being demonstrated
  protected constraintType: ConstraintType;
  
  // Description of the constraint
  protected constraintDescription: string;
  
  // Instructions specific to this demo
  protected demoInstructions: string;
  
  constructor(stateId: string, engine: Engine, constraintType: ConstraintType, description: string, instructions: string) {
    super(stateId);
    this.engine = engine;
    this.inputManager = InputManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    this.constraintType = constraintType;
    this.constraintDescription = description;
    this.demoInstructions = instructions;
  }
  
  /**
   * Set up the demo state
   */
  async enter(): Promise<void> {
    console.log(`Entering ${this.name} demo state`);
    
    // Initialize ECS World
    this.initializeEcsWorld();
    
    // Set up the scene
    if (this.world) {
      this.scene = this.world.getScene();
      this.scene.background = new THREE.Color(0x111122);
      
      // Set up ambient light
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);
      
      // Set up directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);
    }
    
    // Create a camera
    this.createCamera();
    
    // Set up the demo-specific entities and constraints
    this.setupDemo();
    
    // Subscribe to input events
    this.subscribeToEvents();
    
    return Promise.resolve();
  }
  
  /**
   * Initialize the ECS World with systems
   */
  protected initializeEcsWorld(): void {
    // Create a new world
    this.world = new World();
    
    console.log("Creating ECS world with constraint system");
    
    // Register component types for serialization
    this.world.registerComponent('Transform', Transform);
    this.world.registerComponent('CameraComponent', CameraComponent);
    this.world.registerComponent('MeshComponent', MeshComponent);
    this.world.registerComponent('ConstraintComponent', ConstraintComponent);
    
    // Initialize core systems
    this.world.initializeCoreEcsSystems();
    
    // Register additional systems
    this.world.registerSystem(new SerializationSystem());
    
    // Get references to systems for convenience
    this.threeSceneSystem = this.world.getThreeSceneSystem();
    this.cameraSystem = this.world.getCameraSystem();
    this.constraintSystem = this.world.getConstraintSystem();
    
    // Connect the renderer with our ECS world
    const renderer = this.engine.getRenderer();
    if (renderer && this.world) {
      this.world.setRenderer(renderer);
    }
    
    console.log('ECS World initialized');
  }
  
  /**
   * Create a camera entity
   */
  protected createCamera(): void {
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
      new THREE.Vector3(0, 2, 5),
      new THREE.Euler(0, 0, 0),
      true // Make this the active camera
    );
    
    // Get the camera component and customize it
    const cameraComponent = cameraEntity.getComponent(CameraComponent);
    if (cameraComponent) {
      cameraComponent.setFov(75);
      cameraComponent.setAspect(aspect);
      cameraComponent.setClippingPlanes(0.1, 1000);
    }
    
    console.log('Camera entity created');
  }
  
  /**
   * Setup the specific demo - to be implemented by each demo state
   */
  protected abstract setupDemo(): void;
  
  /**
   * Clean up the demo state
   */
  async exit(): Promise<void> {
    console.log(`Exiting ${this.name} demo state`);
    
    // Clean up event subscriptions
    this.unsubscribeFromEvents();
    
    // Clean up UI elements (will be removed by UISystem but good to be explicit)
    this.titleText = null;
    this.descriptionText = null;
    this.instructionsText = null;
    this.statusText = null;
    this.fpsCounter = null;
    
    // Clean up ECS resources
    if (this.world) {
      // Dispose of any THREE.js objects to prevent memory leaks
      if (this.scene) {
        this.disposeSceneObjects(this.scene);
      }
      
      // Clear the world
      this.world.clear();
      this.world = null;
    }
    
    this.scene = null;
    this.cameraSystem = null;
    this.threeSceneSystem = null;
    this.constraintSystem = null;
    
    return Promise.resolve();
  }
  
  /**
   * Dispose of scene objects to prevent memory leaks
   */
  private disposeSceneObjects(scene: THREE.Scene): void {
    scene.traverse((object) => {
      // Dispose of geometries
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        // Dispose of materials
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(object.material);
          }
        }
      }
    });
  }
  
  /**
   * Dispose of a material and its textures
   */
  private disposeMaterial(material: THREE.Material): void {
    // Dispose of textures
    if (material instanceof THREE.MeshBasicMaterial) {
      if (material.map) material.map.dispose();
      if (material.aoMap) material.aoMap.dispose();
    } else if (material instanceof THREE.MeshStandardMaterial) {
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
    }
    
    // Dispose the material itself
    material.dispose();
  }
  
  /**
   * Setup rendering data for the renderer
   */
  setupRenderingData(renderer: Renderer): void {
    // Create UI elements
    this.createUIElements(renderer);
  }
  
  /**
   * Update the state
   */
  update(deltaTime: number): void {
    // Update the ECS world - processes all systems
    if (this.world) {
      this.world.update(deltaTime);
    }
    
    // Update custom logic for this specific demo
    this.updateDemo(deltaTime);
    
    // Update UI
    this.updateUI();
    
    // Update FPS counter
    this.updateFpsCounter();
  }
  
  /**
   * Update custom logic for this specific demo
   */
  protected abstract updateDemo(deltaTime: number): void;
  
  /**
   * Update UI elements
   */
  protected updateUI(): void {
    if (!this.world || !this.statusText) return;
    
    const entityCount = this.world.getAllEntities().length;
    this.statusText.setText(`ENTITIES: ${entityCount}`);
  }
  
  /**
   * Subscribe to events
   */
  protected subscribeToEvents(): void {
    // Subscribe to keyboard events for navigation
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      if (data.key === 'escape') {
        // Return to menu state using the StateManager
        if (this.engine) {
          const stateManager = this.engine.getStateManager();
          if (stateManager) {
            stateManager.switchState('menu');
          }
        }
      }
    });
    
    // Store unsubscribe functions
    this.eventUnsubscribe.push(keyDownUnsub);
    
    console.log('Subscribed to input events. Press ESC to return to menu.');
  }
  
  /**
   * Unsubscribe from events
   */
  protected unsubscribeFromEvents(): void {
    // Call all unsubscribe functions
    for (const unsub of this.eventUnsubscribe) {
      unsub();
    }
    
    // Clear the array
    this.eventUnsubscribe = [];
    
    console.log('Unsubscribed from input events');
  }
  
  /**
   * Create UI elements
   */
  protected createUIElements(renderer: Renderer): void {
    const uiSystem = renderer.getUISystem();
    if (!uiSystem) return;
    
    // FPS/TPS Counter in the top-left (green)
    this.fpsCounter = new TextBox(2, 2, 100, 30, 'FPS: 0\nTPS: 0', 'tiny', 1, '#00ff00', 'left', 2);
    uiSystem.addElement(this.fpsCounter);
    
    // Title in the top center
    const title = `${this.constraintType} Constraint Demo`;
    this.titleText = new TextBox(
      0,
      24,
      224,
      12,
      title,
      'vga',
      1,
      '#ffffff',
      'center'
    );
    uiSystem.addElement(this.titleText);
    
    // Description below title
    this.descriptionText = new TextBox(
      4,
      40,
      216,
      60,
      this.constraintDescription,
      'tiny',
      1,
      '#ffffff',
      'center',
      1
    );
    uiSystem.addElement(this.descriptionText);
    
    // Instructions panel in the bottom left
    const instructions = this.demoInstructions;
    this.instructionsText = new TextBox(
      4,
      renderer.getHeight() - 82,
      216,
      80,
      instructions,
      'vga',
      1,
      '#ccffcc',
      'center'
    );
    uiSystem.addElement(this.instructionsText);
    
    // Status indicator in the bottom-right
    this.statusText = new TextBox(
      renderer.getWidth() - 110,
      2,
      100,
      18,
      'ENTITIES: 0',
      'tiny',
      1,
      '#ff00ff',
      'right'
    );
    uiSystem.addElement(this.statusText);
    
    console.log('UI elements created');
  }
  
  /**
   * Create a grid to help with spatial orientation
   */
  protected createGrid(): void {
    if (!this.world || !this.scene) return;
    
    // Create a new entity for the grid
    const gridEntity = this.world.createEntity('grid');
    
    // Add transform component
    gridEntity.addComponent(new Transform(0, 0.05, 0));
    
    // Add ThreeObject component
    gridEntity.addComponent(new ThreeObject());
    
    // Add mesh component - grid for visual reference
    const meshComponent = new MeshComponent(GeometryType.GRID);
    meshComponent.color = 0x444444;
    meshComponent.size.width = 20;
    meshComponent.size.depth = 20;
    meshComponent.segments = 20; // Number of grid divisions
    gridEntity.addComponent(meshComponent);
    
    console.log('Grid entity created');
    
    // Keep the old implementation as a fallback
    if (!gridEntity) {
      const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
      this.scene.add(gridHelper);
    }
  }
  
  /**
   * Create a simple ground plane
   */
  protected createGround(): IEntity | null {
    if (!this.world) return null;
    
    // Create a new entity for the ground
    const groundEntity = this.world.createEntity('ground');
    
    // Add transform component
    groundEntity.addComponent(new Transform(0, 0, 0));
    
    // Add ThreeObject component
    groundEntity.addComponent(new ThreeObject());
    
    // Add mesh component - flat pane for the ground
    const meshComponent = new MeshComponent(GeometryType.PANE);
    meshComponent.wireframe = false;
    meshComponent.color = 0x336633;
    meshComponent.size.width = 20;
    meshComponent.size.height = 20;
    groundEntity.addComponent(meshComponent);
    
    // Rotate the plane to be horizontal
    const transform = groundEntity.getComponent(Transform);
    if (transform) {
      transform.rotation.x = 270; // Rotate the plane to be horizontal
    }
    
    console.log('Ground entity created');
    return groundEntity;
  }
  
  /**
   * Update FPS counter
   */
  private updateFpsCounter(): void {
    if (this.fpsCounter) {
      this.fpsCounter.setText(`FPS: ${this.engine.getFps()}\nTPS: ${this.engine.getTps()}`);
    }
  }
} 
import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TextBox } from '../../ui/elements/TextBox';
import { UIPanel } from '../../ui/elements/UIPanel';
import { Engine } from '../Engine';
import { InputManager } from '../input/InputManager';
import { EventSystem } from '../events/EventSystem';
import { InputEventType } from '../input/InputManager';

/**
 * Test state with a rotating cube
 */
export class TestState extends State {
  private cube: THREE.Mesh | null = null;
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
  
  constructor(engine: Engine) {
    super('test');
    this.engine = engine;
    this.inputManager = InputManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
  }
  
  /**
   * Set up the test state
   */
  async enter(): Promise<void> {
    console.log('Entering test state');
    
    // Create a new scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Create a simple rotating cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    
    // Subscribe to mouse events
    this.subscribeToEvents();
    
    return Promise.resolve();
  }
  
  /**
   * Clean up the test state
   */
  async exit(): Promise<void> {
    console.log('Exiting test state');
    
    // Clean up resources
    if (this.cube && this.scene) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
    }
    
    this.cube = null;
    this.scene = null;
    
    // Clean up event subscriptions
    this.unsubscribeFromEvents();
    
    return Promise.resolve();
  }
  
  /**
   * Setup rendering data for the renderer
   */
  setupRenderingData(renderer: Renderer): void {
    // Set the active scene for rendering
    if (this.scene) {
      renderer.setActiveScene(this.scene);
    }
    
    // Create UI elements
    this.createUIElements(renderer);
  }
  
  /**
   * Update the test state
   */
  update(deltaTime: number): void {
    // Check for held keys to rotate the cube
    if (this.cube) {
      const rotationAmount = 0.2; // Scale rotation by delta time
      
      // Check WASD keys
      if (this.inputManager.isKeyDown('w')) {
        this.cube.rotation.x -= rotationAmount;
      }
      if (this.inputManager.isKeyDown('s')) {
        this.cube.rotation.x += rotationAmount;
      }
      if (this.inputManager.isKeyDown('a')) {
        this.cube.rotation.y -= rotationAmount;
      }
      if (this.inputManager.isKeyDown('d')) {
        this.cube.rotation.y += rotationAmount;
      }
    }
    
    // Update FPS text
    if (this.fpsCounter) {
      // Use explicit line break for better formatting
      this.fpsCounter.setText(`FPS: ${this.engine.getFps()}\nTPS: ${this.engine.getTps()}`);
    }

    if(this.statusText) {
      this.statusText.setText('READY');
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
    
    console.log('Subscribed to input events');
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
   * Create UI elements
   */
  private createUIElements(renderer: Renderer): void {
    const uiSystem = renderer.getUISystem();
    if (!uiSystem) return;
    
    // FPS/TPS Counter in the top-left (green) with enough height for 2 lines
    this.fpsCounter = new TextBox(2, 2, 100, 30, 'FPS: 0\nTPS: 0', 'tiny', 1, '#00ff00', 'left', 2);
    uiSystem.addElement(this.fpsCounter);
    
    // Info panel in the center
    const infoText = 'Fungeon Engine v0.4\nTest State Active';
    this.infoText = new TextBox(
      renderer.getWidth() / 2 - 100,
      32,
      200,
      38,
      infoText,
      'vga',
      1,
      '#ffffff',
      'center'
    );
    this.infoText.setBorder('#ffffff', 1);
    this.infoText.setPadding(5);
    uiSystem.addElement(this.infoText);
    
    // Info panel in the center
    const controlsText = 'WASD to rotate cube';
    this.controlsText = new TextBox(
      renderer.getWidth() / 2 - 100,
      154,
      200,
      24,
      controlsText,
      'vga',
      1,
      '#ffffff',
      'center'
    );
    this.controlsText.setBorder('#ffffff', 1);
    this.controlsText.setPadding(5);
    uiSystem.addElement(this.controlsText);
    
    // Status indicator in the bottom-right (updated by event system)
    this.statusText = new TextBox(
      renderer.getWidth() - 110,
      renderer.getHeight() - 30,
      100,
      12,
      'INITIALIZING',
      'vga',
      1,
      '#ff00ff',
      'right'
    );
    uiSystem.addElement(this.statusText);
    
    // Mouse position indicator in the bottom-left (updated by polling)
    this.mousePositionText = new TextBox(
      10,
      renderer.getHeight() - 16,
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
} 
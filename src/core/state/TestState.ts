import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TextBox } from '../../ui/elements/TextBox';
import { UIPanel } from '../../ui/elements/UIPanel';
import { Engine } from '../Engine';

/**
 * Test state with a rotating cube
 */
export class TestState extends State {
  private cube: THREE.Mesh | null = null;
  private scene: THREE.Scene | null = null;
  
  // UI elements
  private fpsCounter: TextBox | null = null;
  private infoText: TextBox | null = null;
  private statusText: TextBox | null = null;
  
  // Reference to engine
  private engine: Engine;
  
  constructor(engine: Engine) {
    super('test');
    this.engine = engine;
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
    // Rotate the cube
    if (this.cube) {
      this.cube.rotation.x += 0.1;
      this.cube.rotation.y += 0.1;
    }
    
    // Update FPS text
    if (this.fpsCounter) {
      // Use explicit line break for better formatting
      this.fpsCounter.setText(`FPS: ${this.engine.getFps()}\nTPS: ${this.engine.getTps()}`);
    }
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
    
    // Status indicator in the bottom-right
    this.statusText = new TextBox(
      renderer.getWidth() - 110,
      renderer.getHeight() - 30,
      100,
      20,
      'READY',
      'tiny',
      2,
      '#ffff00',
      'right'
    );
    uiSystem.addElement(this.statusText);
  }
} 
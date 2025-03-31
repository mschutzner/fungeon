import * as THREE from 'three';
import { Config } from '../core/Config';
import { UISystem } from '../ui/UISystem';

export class Renderer {
  // Main output canvas
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  
  // Offscreen canvases
  private webglCanvas: HTMLCanvasElement | null = null;
  private uiCanvas: HTMLCanvasElement | null = null;
  private uiContext: CanvasRenderingContext2D | null = null;
  
  // Three.js objects
  private camera: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer; // Using definite assignment assertion
  
  // UI System
  private uiSystem: UISystem | null = null;
  
  // Active scene
  private activeScene: THREE.Scene | null = null;
  
  // Configuration
  private width: number;
  private height: number;
  private pixelRatio: number = 1; // For pixel-perfect rendering
  
  constructor() {
    // Get configuration
    const config = Config.getInstance();
    this.width = config.resolution.width;
    this.height = config.resolution.height;
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      this.width / this.height, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    this.camera.position.z = 5;
  }
  
  /**
   * Initialize the renderer
   */
  async initialize(): Promise<void> {
    // Find the game container
    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('Game container not found');
    }
    
    // Initialize main output canvas
    this.initializeOutputCanvas(container);
    
    // Initialize WebGL offscreen canvas
    this.initializeWebGLCanvas();
    
    // Initialize UI offscreen canvas
    this.initializeUICanvas();
    
    // Initialize UI system
    this.uiSystem = new UISystem();
    
    if (this.uiContext) {
      await this.uiSystem.initialize(this.uiContext);
    } else {
      throw new Error('UI context initialization failed');
    }
    
    console.log('Renderer fully initialized with resolution:', this.width, 'x', this.height);
  }
  
  /**
   * Initialize main output canvas
   */
  private initializeOutputCanvas(container: HTMLElement): void {
    // Try to get existing canvas first
    let outputCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    // Create canvas if it doesn't exist
    if (!outputCanvas) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.id = 'game-canvas';
      container.appendChild(outputCanvas);
    }
    
    // Set canvas properties
    outputCanvas.width = this.width;
    outputCanvas.height = this.height;
    
    // Clear any existing children
    while (container.childElementCount > 1) {
      const childToRemove = container.lastChild;
      if (childToRemove && childToRemove !== outputCanvas) {
        container.removeChild(childToRemove);
      }
    }
    
    // Store reference
    this.outputCanvas = outputCanvas;
    this.outputCtx = outputCanvas.getContext('2d');
    
    if (!this.outputCtx) {
      throw new Error('Could not get 2D context for output canvas');
    }
    
    // Disable image smoothing for pixelated look
    this.outputCtx.imageSmoothingEnabled = false;
    
    console.log('Output canvas initialized');
  }
  
  /**
   * Initialize WebGL offscreen canvas
   */
  private initializeWebGLCanvas(): void {
    // Create offscreen canvas
    this.webglCanvas = document.createElement('canvas');
    this.webglCanvas.width = this.width;
    this.webglCanvas.height = this.height;
    
    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.webglCanvas,
      antialias: false, // Disable for pixelated look
      alpha: true // Make background transparent so CSS background shows
    });
    this.renderer.setSize(this.width, this.height, false); // false prevents updating style
    this.renderer.setPixelRatio(this.pixelRatio);
    
    console.log('WebGL offscreen canvas initialized');
  }
  
  /**
   * Initialize UI offscreen canvas
   */
  private initializeUICanvas(): void {
    // Create offscreen canvas
    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.width = this.width;
    this.uiCanvas.height = this.height;
    
    // Get 2D context
    this.uiContext = this.uiCanvas.getContext('2d');
    
    if (!this.uiContext) {
      throw new Error('Could not get 2D context for UI offscreen canvas');
    }
    
    // Disable image smoothing for pixelated look
    this.uiContext.imageSmoothingEnabled = false;
    
    console.log('UI offscreen canvas initialized');
  }
  
  /**
   * Set the active scene to render
   */
  setActiveScene(scene: THREE.Scene): void {
    this.activeScene = scene;
  }
  
  /**
   * Get the UI system
   */
  getUISystem(): UISystem | null {
    return this.uiSystem;
  }
  
  /**
   * Process rendering for this frame
   * @param deltaTime Time since last frame in seconds
   */
  render(deltaTime: number): void {
    // Update UI if UI system exists
    if (this.uiSystem) {
      this.uiSystem.update(deltaTime);
    }
    
    // Render the WebGL scene to offscreen canvas if it exists
    if (this.activeScene && this.renderer) {
      this.renderer.render(this.activeScene, this.camera);
    }
    
    // Render UI to offscreen canvas if UI system exists
    if (this.uiSystem) {
      this.uiSystem.render(deltaTime);
    }
    
    // Composite the two canvases onto the output canvas
    this.compositeCanvases();
  }
  
  /**
   * Composite offscreen canvases onto the output canvas
   */
  private compositeCanvases(): void {
    if (!this.outputCtx) return;
    
    // Clear output canvas
    this.outputCtx.clearRect(0, 0, this.width, this.height);
    
    // Draw the WebGL canvas first
    if (this.webglCanvas) {
      this.outputCtx.drawImage(this.webglCanvas, 0, 0);
    }
    
    // Draw the UI canvas on top
    if (this.uiCanvas) {
      this.outputCtx.drawImage(this.uiCanvas, 0, 0);
    }
  }
  
  /**
   * Handle window resize
   */
  resize(): void {
    // Update camera aspect ratio
    const newAspect = this.width / this.height;
    if (this.camera.aspect !== newAspect) {
      this.camera.aspect = newAspect;
      this.camera.updateProjectionMatrix();
    }
    
    // Resize WebGL renderer
    if (this.renderer) {
      this.renderer.setSize(this.width, this.height, false);
    }
    
    // Resize all canvases
    if (this.webglCanvas) {
      this.webglCanvas.width = this.width;
      this.webglCanvas.height = this.height;
    }
    
    if (this.uiCanvas) {
      this.uiCanvas.width = this.width;
      this.uiCanvas.height = this.height;
    }
    
    if (this.outputCanvas) {
      this.outputCanvas.width = this.width;
      this.outputCanvas.height = this.height;
      
      // Ensure image smoothing is disabled after resize
      if (this.outputCtx) {
        this.outputCtx.imageSmoothingEnabled = false;
      }
    }
  }
  
  /**
   * Get the camera
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  /**
   * Get the canvas width
   */
  getWidth(): number {
    return this.width;
  }
  
  /**
   * Get the canvas height
   */
  getHeight(): number {
    return this.height;
  }
  
  /**
   * Get the output canvas
   * @returns The main output canvas element
   */
  getCanvas(): HTMLCanvasElement {
    if (!this.outputCanvas) {
      throw new Error('Output canvas is not initialized');
    }
    return this.outputCanvas;
  }
} 
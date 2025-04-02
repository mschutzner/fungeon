import * as THREE from 'three';
import { Config } from '../core/Config';
import { UISystem } from '../ui/UISystem';
import { World } from '../ecs/World';
import { CameraSystem } from '../ecs/systems/CameraSystem';
import { CameraComponent, CameraType } from '../ecs/components/CameraComponent';

export class Renderer {
  // Main output canvas
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  
  // Offscreen canvases
  private webglCanvas: HTMLCanvasElement | null = null;
  private uiCanvas: HTMLCanvasElement | null = null;
  private uiContext: CanvasRenderingContext2D | null = null;
  
  // Three.js objects
  private defaultCamera: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer; // Using definite assignment assertion
  
  // UI System
  private uiSystem: UISystem | null = null;
  
  // Active scene
  private activeScene: THREE.Scene | null = null;
  
  // ECS reference
  private world: World | null = null;
  private cameraSystem: CameraSystem | null = null;
  
  // Configuration
  private width: number;
  private height: number;
  private pixelRatio: number = 1; // For pixel-perfect rendering
  
  constructor() {
    // Get configuration
    const config = Config.getInstance();
    this.width = config.resolution.width;
    this.height = config.resolution.height;
    
    // Create default camera (used if no ECS camera is available)
    this.defaultCamera = new THREE.PerspectiveCamera(
      75, // FOV
      this.width / this.height, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    this.defaultCamera.position.z = 5;
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
   * Set the ECS world
   * @param world The ECS world
   */
  setWorld(world: World): void {
    this.world = world;
    
    // Try to get the camera system
    this.cameraSystem = world.getSystem(CameraSystem);
    
    // If no camera system exists, create and register one
    if (!this.cameraSystem) {
      this.cameraSystem = new CameraSystem();
      world.registerSystem(this.cameraSystem);
    }
    
    // If the world has a scene, set it as active
    if (world.hasScene()) {
      this.setActiveScene(world.getScene());
    }
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
    
    // Get the camera to use for rendering
    const camera = this.getActiveCamera();
    
    // Render the WebGL scene to offscreen canvas if it exists
    if (this.activeScene && this.renderer) {
      this.renderer.render(this.activeScene, camera);
    }
    
    // Render UI to offscreen canvas if UI system exists
    if (this.uiSystem) {
      this.uiSystem.render(deltaTime);
    }
    
    // Composite the two canvases onto the output canvas
    this.compositeCanvases();
  }
  
  /**
   * Get the active camera for rendering
   * @returns The camera to use for rendering
   */
  private getActiveCamera(): THREE.Camera {
    // If we have a camera system and it has an active camera, use that
    if (this.cameraSystem) {
      const activeCamera = this.cameraSystem.getActiveCamera();
      if (activeCamera) {
        return activeCamera.getCamera();
      }
    }
    
    // Otherwise use the default camera
    return this.defaultCamera;
  }
  
  /**
   * Create a default camera in the ECS world
   * @param setActive Whether to set this camera as active
   * @returns The created camera entity
   */
  createDefaultCamera(setActive: boolean = true): any {
    if (!this.world || !this.cameraSystem) {
      throw new Error('Cannot create camera - no ECS world set');
    }
    
    return this.cameraSystem.createCamera(
      'MainCamera',
      CameraType.PERSPECTIVE,
      new THREE.Vector3(0, 0, 5),
      new THREE.Euler(0, 0, 0),
      setActive
    );
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
    // Update configuration
    const config = Config.getInstance();
    this.width = config.resolution.width;
    this.height = config.resolution.height;
    
    // Update default camera aspect ratio
    const newAspect = this.width / this.height;
    if (this.defaultCamera.aspect !== newAspect) {
      this.defaultCamera.aspect = newAspect;
      this.defaultCamera.updateProjectionMatrix();
    }
    
    // Update ECS cameras if available
    if (this.world && this.cameraSystem) {
      const CameraComponentClass = CameraComponent as unknown as any;
      const cameras = this.world.query(CameraComponentClass);
      cameras.forEach(entity => {
        const camera = entity.getComponent(CameraComponent);
        if (camera) {
          camera.setAspect(newAspect);
        }
      });
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
   * Get the current camera
   * @returns The active camera or the default camera
   * @deprecated Use getActiveCamera() instead
   */
  getCamera(): THREE.Camera {
    return this.getActiveCamera();
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
      throw new Error('Output canvas not initialized');
    }
    return this.outputCanvas;
  }
  
  /**
   * Clear the UI canvas
   */
  clearUI(): void {
    if (this.uiCanvas && this.uiContext) {
      // Clear the UI canvas
      this.uiContext.clearRect(0, 0, this.width, this.height);
      
      // Reset the UI system if it exists
      if (this.uiSystem) {
        this.uiSystem.removeAllElements();
      }
      
      console.log('UI canvas cleared');
    }
  }
  
  /**
   * Clear the WebGL canvas
   */
  clear(): void {
    if (this.renderer && this.webglCanvas) {
      // Clear WebGL renderer
      this.renderer.clear();
      
      // Clear the active scene
      if (this.activeScene) {
        // Remove all objects except the camera and lights
        const objectsToRemove: THREE.Object3D[] = [];
        this.activeScene.traverse((object) => {
          // Keep cameras and lights
          if (!(object instanceof THREE.Camera) && 
              !(object instanceof THREE.Light) &&
              !(object instanceof THREE.Scene)) {
            objectsToRemove.push(object);
          }
        });
        
        // Remove objects from the scene
        for (const object of objectsToRemove) {
          this.activeScene.remove(object);
        }
      }
      
      console.log('WebGL canvas cleared');
    }
  }
} 
import * as THREE from 'three';
import { Renderer } from '../rendering/Renderer';
import { Config } from './Config';
import { StateManager } from './state/StateManager';
import { EventSystem } from './events/EventSystem';
import { ServiceManager } from './services/ServiceManager';
import { InputManager } from './input/InputManager';

/**
 * Main game engine class
 */
export class Engine {
  private config!: Config;
  private renderer!: Renderer;
  private stateManager!: StateManager;
  private eventSystem!: EventSystem;
  private serviceManager!: ServiceManager;
  private inputManager!: InputManager;
  
  private running: boolean = false;
  private lastFrameTime: number = 0;
  private lastUpdateTime: number = 0;
  private frameCount: number = 0;
  private updateCount: number = 0;
  private frameTimer: number = 0;
  private updateTimer: number = 0;
  private currentFPS: number = 0;
  private currentTPS: number = 0;
  
  // Time tracking for render
  private lastRenderTime: number = 0;
  private renderDeltaTime: number = 0;
  private renderAccumulator: number = 0;
  
  // Time tracking for fixed update
  private fixedTimeStep: number = 0;
  private updateAccumulator: number = 0;
  
  // FPS tracking
  private fpsUpdateTime: number = 0;
  
  // TPS tracking (ticks per second)
  private tpsUpdateTime: number = 0;
  
  constructor() {
    // Get config instance
    this.config = Config.getInstance();
    
    // Create the renderer
    this.renderer = new Renderer();
    
    // Create state manager
    this.stateManager = new StateManager();
    
    // Connect state manager to renderer and engine
    this.stateManager.setRenderer(this.renderer);
    this.stateManager.setEngine(this);
    
    // Set fixed time step from config (in seconds)
    this.fixedTimeStep = this.config.tickRate;
  }
  
  /**
   * Start the game engine
   */
  async start(): Promise<void> {
    if (this.running) return;
    
    // Load configuration first
    await this.loadConfig();
    
    // Initialize the engine
    await this.initialize();
    
    // Initialize timers
    this.lastRenderTime = performance.now();
    this.lastUpdateTime = this.lastRenderTime;
    this.fpsUpdateTime = this.lastRenderTime;
    this.tpsUpdateTime = this.lastRenderTime;
    this.frameCount = 0;
    this.updateCount = 0;
    this.renderAccumulator = 0;
    this.updateAccumulator = 0;
    
    // Start the game loop
    this.running = true;
    
    // Start render loop
    this.renderLoop();
    
    // Start update loop
    this.startUpdateLoop();
    
    console.log('Fungeon Engine started');
  }
  
  /**
   * Load configuration from JSON file
   */
  private async loadConfig(): Promise<void> {
    // Load config from file (if it exists)
    try {
      await this.config.loadFromFile('./config.json');
    } catch (error) {
      console.warn('Failed to load config file, using defaults');
      // Use default configuration
    }
    
    // Update fixed time step from config
    this.fixedTimeStep = this.config.tickRate;
  }
  
  /**
   * Stop the game engine
   */
  stop(): void {
    this.running = false;
    console.log('Fungeon Engine stopped');
  }
  
  /**
   * Handle window resize events
   */
  resize(): void {
    this.renderer.resize();
  }
  
  /**
   * Initialize the engine
   */
  private async initialize(): Promise<void> {
    // Initialize event system and service manager first
    this.eventSystem = EventSystem.getInstance();
    this.serviceManager = ServiceManager.getInstance();
    
    // Register engine as a service
    this.serviceManager.register('engine', this);
    
    // Find the game container
    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('Game container not found');
    }
    
    // Initialize the renderer (which now handles UI as well)
    await this.renderer.initialize();
    
    // Register renderer as a service
    this.serviceManager.register('renderer', this.renderer);
    
    // Initialize input manager
    this.inputManager = InputManager.getInstance();
    this.inputManager.initialize(this.renderer.getCanvas());
    
    // Register input manager as a service
    this.serviceManager.register('inputManager', this.inputManager);
    
    // Load initial state from config
    await this.loadInitialState();
    
    console.log('Engine initialization complete');
  }
  
  /**
   * Load the initial state from config
   */
  private async loadInitialState(): Promise<void> {
    const startState = this.config.config.startState;
    if (!startState) {
      console.error('No start state specified in config');
      return;
    }
    
    console.log(`Loading initial state: ${startState}`);
    await this.stateManager.switchState(startState);
  }
  
  /**
   * Start the fixed update loop
   */
  private startUpdateLoop(): void {
    // Set up fixed update interval
    const updateIntervalMs = this.fixedTimeStep * 1000;
    
    const updateInterval = setInterval(() => {
      if (!this.running) {
        clearInterval(updateInterval);
        return;
      }
      
      // Perform fixed update
      this.fixedUpdate(this.fixedTimeStep);
      
    }, updateIntervalMs);
  }
  
  /**
   * Main render loop (variable timestep)
   */
  private renderLoop(timestamp?: number): void {
    // If engine is stopped, don't continue the loop
    if (!this.running) return;
    
    // Request next frame immediately to maximize frame rate
    requestAnimationFrame(this.renderLoop.bind(this));
    
    // Default timestamp if not provided
    const currentTime = timestamp || performance.now();
    
    // Calculate delta time in seconds
    const deltaTime = (currentTime - this.lastRenderTime) / 1000;
    this.lastRenderTime = currentTime;
    
    // Update FPS counter
    this.updateFps(currentTime);
    
    // Limit frame rate if maxFPS is set
    const minFrameTime = 1 / this.config.maxFPS;
    this.renderDeltaTime += deltaTime;
    
    // Only render if enough time has passed
    if (this.renderDeltaTime >= minFrameTime) {
      // Render the game
      this.renderer.render(this.renderDeltaTime);
      
      // Reset render delta time (clamped to avoid spiral of death)
      this.renderDeltaTime = Math.min(this.renderDeltaTime - minFrameTime, minFrameTime * 3);
    }
  }
  
  /**
   * Fixed update for game logic (fixed timestep)
   */
  private fixedUpdate(deltaTime: number): void {
    // Get current time to track TPS
    const currentTime = performance.now();
    
    // Update TPS counter
    this.updateTps(currentTime);
    
    // Update game state
    this.stateManager.update(deltaTime);
    
    // Update general engine systems
    this.update(deltaTime);
  }
  
  /**
   * Update game logic
   */
  private update(deltaTime: number): void {
    // Update input manager
    this.inputManager.update();
    
    // General engine updates that aren't state-specific
    // Later, this will update all game systems
  }
  
  /**
   * Update FPS counter
   */
  private updateFps(currentTime: number): void {
    this.frameCount++;
    
    // Update FPS every second
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }
  
  /**
   * Update TPS counter
   */
  private updateTps(currentTime: number): void {
    this.updateCount++;
    
    // Update TPS every second
    if (currentTime - this.tpsUpdateTime >= 1000) {
      this.currentTPS = this.updateCount;
      this.updateCount = 0;
      this.tpsUpdateTime = currentTime;
    }
  }
  
  /**
   * Get the renderer
   */
  getRenderer(): Renderer {
    return this.renderer;
  }
  
  /**
   * Get current FPS
   */
  getFps(): number {
    return this.currentFPS;
  }
  
  /**
   * Get current TPS (ticks per second)
   */
  getTps(): number {
    return this.currentTPS;
  }
} 
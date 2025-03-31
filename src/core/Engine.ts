import * as THREE from 'three';
import { Renderer } from '../rendering/Renderer';
import { Config } from './Config';
import { StateManager } from './state/StateManager';

export class Engine {
  private isRunning: boolean = false;
  
  // Game state
  private renderer: Renderer;
  private config: Config;
  private stateManager: StateManager;
  
  // Time tracking for render
  private lastRenderTime: number = 0;
  private renderDeltaTime: number = 0;
  private renderAccumulator: number = 0;
  
  // Time tracking for fixed update
  private lastUpdateTime: number = 0;
  private fixedTimeStep: number = 0;
  private updateAccumulator: number = 0;
  
  // FPS tracking
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;
  
  // TPS tracking (ticks per second)
  private tickCount: number = 0;
  private tpsUpdateTime: number = 0;
  private currentTps: number = 0;
  
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
    if (this.isRunning) return;
    
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
    this.tickCount = 0;
    this.renderAccumulator = 0;
    this.updateAccumulator = 0;
    
    // Start the game loop
    this.isRunning = true;
    
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
    this.isRunning = false;
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
    // Find the game container
    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('Game container not found');
    }
    
    // Initialize the renderer (which now handles UI as well)
    await this.renderer.initialize();
    
    // Load initial state from config
    await this.loadInitialState();
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
      if (!this.isRunning) {
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
    if (!this.isRunning) return;
    
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
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }
  
  /**
   * Update TPS counter
   */
  private updateTps(currentTime: number): void {
    this.tickCount++;
    
    // Update TPS every second
    if (currentTime - this.tpsUpdateTime >= 1000) {
      this.currentTps = this.tickCount;
      this.tickCount = 0;
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
    return this.currentFps;
  }
  
  /**
   * Get current TPS (ticks per second)
   */
  getTps(): number {
    return this.currentTps;
  }
} 
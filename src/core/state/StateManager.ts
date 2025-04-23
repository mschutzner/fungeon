import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TestState } from './TestState';
import { PathState } from './PathState';
import { Engine } from '../Engine';
import { EventSystem } from '../events/EventSystem';
import { AssetEvents } from '../assets/AssetManager';

/**
 * Events emitted by the StateManager
 */
export enum StateEvents {
  STATE_CHANGED = 'state:changed',
  STATE_PRELOAD_START = 'state:preload_start',
  STATE_PRELOAD_COMPLETE = 'state:preload_complete',
  STATE_PRELOAD_PROGRESS = 'state:preload_progress',
}

/**
 * StateManager class for managing game states and transitions
 */
export class StateManager {
  private states: Map<string, State> = new Map();
  private currentState: State | null = null;
  private nextState: string | null = null;
  private isTransitioning: boolean = false;
  private stateRegistry: Map<string, new (engine: Engine) => State> = new Map();
  private renderer: Renderer | null = null;
  private engine: Engine | null = null;
  private eventSystem: EventSystem;
  
  constructor() {
    // Register available states
    this.registerStateType('testState', TestState);
    this.registerStateType('pathState', PathState);
    
    this.eventSystem = EventSystem.getInstance();
    
    // Subscribe to asset loading events to forward them as state preloading events
    this.eventSystem.subscribe(AssetEvents.PRELOAD_PROGRESS, (data) => {
      this.eventSystem.publish(StateEvents.STATE_PRELOAD_PROGRESS, data);
    });
    
    this.eventSystem.subscribe(AssetEvents.PRELOAD_COMPLETE, (data) => {
      this.eventSystem.publish(StateEvents.STATE_PRELOAD_COMPLETE, data);
    });
  }
  
  /**
   * Set the engine instance
   */
  setEngine(engine: Engine): void {
    this.engine = engine;
  }
  
  /**
   * Set the renderer instance
   */
  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }
  
  /**
   * Register a state type that can be instantiated by name
   * @param typeName Name of the state type
   * @param stateClass The state class constructor
   */
  registerStateType(typeName: string, stateClass: new (engine: Engine) => State): void {
    this.stateRegistry.set(typeName, stateClass);
    console.log(`Registered state type: ${typeName}`);
  }
  
  /**
   * Create and load a state by type name
   * @param typeName Name of the state type to create
   * @returns The created state instance or null if type not found
   */
  loadStateByName(typeName: string): State | undefined {
    const stateClass = this.stateRegistry.get(typeName);
    if (!stateClass || !this.engine) {
      console.error(`State type not found or engine not set: ${typeName}`);
      return undefined;
    }
    
    // Create a new instance of the state
    const state = new stateClass(this.engine);
    this.registerState(state);
    return state;
  }
  
  /**
   * Register a new state
   * @param state The state to register
   */
  registerState(state: State): void {
    const name = state.getName();
    this.states.set(name, state);
    console.log(`Registered state instance: ${name}`);
  }
  
  /**
   * Switch to a new state
   * @param stateName Name of the state to switch to
   */
  async switchState(stateName: string): Promise<void> {
    // If already transitioning, queue the state change
    if (this.isTransitioning) {
      this.nextState = stateName;
      return;
    }
    
    if (!this.engine) {
      console.error('Cannot switch state: Engine not set');
      return;
    }
    
    // Start transition
    this.isTransitioning = true;
    
    // Check if the state exists already
    let newState = this.states.get(stateName);
    
    // If state doesn't exist and matches a type name, try to load it
    if (!newState && this.stateRegistry.has(stateName)) {
      newState = this.loadStateByName(stateName);
    }
    
    if (!newState) {
      console.error(`State not found: ${stateName}`);
      this.isTransitioning = false;
      return;
    }
    
    console.log(`Starting transition to state: ${stateName}`);
    
    // Exit current state if it exists
    if (this.currentState) {
      await this.currentState.exit();
    }
    
    // Clear UI and WebGL canvases
    if (this.renderer) {
      // Clear UI canvas
      this.renderer.clearUI();
      
      // Clear WebGL canvas (Three.js scene)
      this.renderer.clear();
    }
    
    // Preload assets for the new state
    this.eventSystem.publish(StateEvents.STATE_PRELOAD_START, { state: stateName });
    console.log(`Preloading assets for state: ${stateName}`);
    
    try {
      await newState.preloadAssets();
      console.log(`Asset preloading complete for state: ${stateName}`);
    } catch (error) {
      console.error(`Error preloading assets for state: ${stateName}`, error);
      // Continue with state transition even if preloading fails
    }
    
    // Enter new state
    this.currentState = newState;
    await newState.enter();
    
    // Setup rendering data for the new state
    if (this.renderer) {
      this.currentState.setupRenderingData(this.renderer);
    }
    
    console.log(`Switched to state: ${stateName}`);
    this.eventSystem.publish(StateEvents.STATE_CHANGED, { state: stateName });
    
    // End transition
    this.isTransitioning = false;
    
    // If a state change was requested during transition, process it
    if (this.nextState) {
      const next = this.nextState;
      this.nextState = null;
      await this.switchState(next);
    }
  }
  
  /**
   * Get the current state
   */
  getCurrentState(): State | null {
    return this.currentState;
  }
  
  /**
   * Update the current state
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (this.currentState && !this.isTransitioning) {
      this.currentState.update(deltaTime);
    }
  }
  
  /**
   * Render the current state
   * @param deltaTime Time since last render in seconds
   */
  render(deltaTime: number): void {
    if (this.currentState && !this.isTransitioning) {
      this.currentState.render(deltaTime);
    }
  }
} 
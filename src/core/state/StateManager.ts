import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TestState } from './TestState';
import { DemoMenuState } from './DemoMenuState';
import { TrackToDemo } from './TrackToDemo';
import { LookAtDemo } from './LookAtDemo';
import { CopyTransformDemo } from './CopyTransformDemo';
import { DistanceDemo } from './DistanceDemo';
import { LimitDemo } from './LimitDemo';
import { LockDemo } from './LockDemo';
import { PathFollowDemo } from './PathFollowDemo';
import { OrientDemo } from './OrientDemo';
import { PivotDemo } from './PivotDemo';
import { SpringDemo } from './SpringDemo';
import { FloorDemo } from './FloorDemo';
import { Engine } from '../Engine';

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
  
  constructor() {
    // Register available states
    this.registerStateType('TestState', TestState);
    this.registerStateType('demoMenu', DemoMenuState);
    this.registerStateType('trackToDemo', TrackToDemo);
    this.registerStateType('lookAtDemo', LookAtDemo);
    this.registerStateType('copyTransformDemo', CopyTransformDemo);
    this.registerStateType('distanceDemo', DistanceDemo);
    this.registerStateType('limitDemo', LimitDemo);
    this.registerStateType('lockDemo', LockDemo);
    this.registerStateType('pathFollowDemo', PathFollowDemo);
    this.registerStateType('orientDemo', OrientDemo);
    this.registerStateType('pivotDemo', PivotDemo);
    this.registerStateType('springDemo', SpringDemo);
    this.registerStateType('floorDemo', FloorDemo);
    
    // Register other constraint demos here when they're implemented
    // Only IK demo remains to be implemented
  }
  
  /**
   * Set the renderer instance
   */
  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }
  
  /**
   * Set the engine instance
   */
  setEngine(engine: Engine): void {
    this.engine = engine;
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
    
    // Check if the state exists already
    let newState = this.states.get(stateName);
    
    // If state doesn't exist and matches a type name, try to load it
    if (!newState && this.stateRegistry.has(stateName)) {
      newState = this.loadStateByName(stateName);
    }
    
    if (!newState) {
      console.error(`State not found: ${stateName}`);
      return;
    }
    
    // Start transition
    this.isTransitioning = true;
    
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
    
    // Enter new state
    this.currentState = newState;
    await newState.enter();
    
    // Setup rendering data for the new state
    if (this.renderer) {
      this.currentState.setupRenderingData(this.renderer);
    }
    
    console.log(`Switched to state: ${stateName}`);
    
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
} 
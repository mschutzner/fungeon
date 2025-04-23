import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from './ThreeObject';
import { MeshComponent } from './MeshComponent';
import { AssetManager } from '../../core/assets/AssetManager';

/**
 * Loop modes for animations
 */
export enum AnimationLoopMode {
  NONE = 'none',           // THREE.LoopOnce
  REPEAT = 'repeat',       // THREE.LoopRepeat
  PING_PONG = 'ping-pong'  // THREE.LoopPingPong
}

/**
 * Component that manages model animations using THREE.js AnimationMixer
 */
export class AnimationComponent extends BaseComponent {
  /**
   * The animation mixer for this model
   */
  private mixer: THREE.AnimationMixer | null = null;
  
  /**
   * Currently loaded animations
   */
  private animations: THREE.AnimationClip[] = [];
  
  /**
   * Currently playing animations
   */
  private actions: Map<string, THREE.AnimationAction> = new Map();
  
  /**
   * Current animation state
   */
  public currentAnimation: string | null = null;
  
  /**
   * Animation playback speed
   */
  public playbackSpeed: number = 1.0;
  
  /**
   * Whether to loop the animation
   */
  public loop: boolean = true;
  
  /**
   * Loop mode for animations
   */
  public loopMode: AnimationLoopMode = AnimationLoopMode.REPEAT;
  
  /**
   * Whether to crossfade between animations
   */
  public crossFade: boolean = true;
  
  /**
   * Crossfade duration in seconds
   */
  public crossFadeDuration: number = 0.3;
  
  /**
   * Constructor
   * @param animations Array of animation clips to use
   */
  constructor(animations: THREE.AnimationClip[] = []) {
    super();
    this.animations = animations;
    
    // Log available animations for debugging
    if (this.animations.length > 0) {
      console.log(`AnimationComponent created with ${this.animations.length} animations:`);
      this.animations.forEach(anim => console.log(`- ${anim.name}`));
    }
  }
  
  /**
   * Get component requirements
   */
  public static override getRequirements(): ComponentClass[] {
    return [ThreeObject, MeshComponent];
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    const threeObject = entity.getComponent(ThreeObject);
    
    if (threeObject) {
      // Create animation mixer for the model
      this.mixer = new THREE.AnimationMixer(threeObject.object);
    }
  }
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  public override onDetach(entity: IEntity): void {
    // Stop all animations
    this.stopAllAnimations();
    
    // Clean up mixer
    this.mixer = null;
    this.actions.clear();
  }
  
  /**
   * Set animations from an array of animation clips
   * @param animations The animation clips to use
   */
  public setAnimations(animations: THREE.AnimationClip[]): void {
    // Clear existing actions as they reference old animations
    this.stopAllAnimations();
    this.actions.clear();
    
    this.animations = animations;
    
    // Log available animations for debugging
    if (this.animations.length > 0) {
      console.log(`Set ${this.animations.length} animations:`);
      this.animations.forEach(anim => console.log(`- ${anim.name}`));
    }
  }
  
  /**
   * Play an animation by name
   * @param name Name of the animation to play
   * @param loop Whether to loop the animation (defaults to component setting)
   * @param speed Playback speed (defaults to component setting)
   * @param loopMode Loop mode to use (defaults to component setting)
   * @returns The animation action or null if not found
   */
  public playAnimation(
    name: string, 
    loop?: boolean, 
    speed?: number,
    loopMode?: AnimationLoopMode
  ): THREE.AnimationAction | null {
    if (!this.mixer) return null;
    
    // Find the animation clip by name
    const clip = this.animations.find(a => a.name === name);
    if (!clip) {
      console.warn(`Animation "${name}" not found`);
      return null;
    }
    
    // Stop current animation if crossfade is disabled
    if (this.currentAnimation && !this.crossFade) {
      this.stopAnimation(this.currentAnimation);
    }
    
    // Create a new action or get the existing one
    let action = this.actions.get(name);
    if (!action) {
      action = this.mixer.clipAction(clip);
      this.actions.set(name, action);
    }
    
    // Configure the action
    const shouldLoop = loop !== undefined ? loop : this.loop;
    const mode = loopMode !== undefined ? loopMode : this.loopMode;
    
    // Convert loop mode to THREE.js loop mode
    let threeLoopMode: THREE.AnimationActionLoopStyles;
    if (!shouldLoop) {
      threeLoopMode = THREE.LoopOnce;
    } else {
      switch (mode) {
        case AnimationLoopMode.PING_PONG:
          threeLoopMode = THREE.LoopPingPong;
          break;
        case AnimationLoopMode.REPEAT:
          threeLoopMode = THREE.LoopRepeat;
          break;
        case AnimationLoopMode.NONE:
        default:
          threeLoopMode = THREE.LoopOnce;
          break;
      }
    }
    
    action.setLoop(threeLoopMode, Infinity);
    action.clampWhenFinished = !shouldLoop;
    action.timeScale = speed !== undefined ? speed : this.playbackSpeed;
    
    // Handle crossfade if needed
    if (this.currentAnimation && this.crossFade && this.currentAnimation !== name) {
      const currentAction = this.actions.get(this.currentAnimation);
      if (currentAction) {
        // Crossfade to the new animation
        action.reset();
        action.play();
        currentAction.crossFadeTo(action, this.crossFadeDuration, true);
      } else {
        action.reset();
        action.play();
      }
    } else {
      action.reset();
      action.play();
    }
    
    this.currentAnimation = name;
    return action;
  }
  
  /**
   * Play an animation in ping-pong mode (play forward, then backward, repeat)
   * @param name Name of the animation to play
   * @param speed Playback speed (defaults to component setting)
   * @returns The animation action or null if not found
   */
  public playPingPong(name: string, speed?: number): THREE.AnimationAction | null {
    return this.playAnimation(name, true, speed, AnimationLoopMode.PING_PONG);
  }
  
  /**
   * Stop an animation by name
   * @param name Name of the animation to stop
   */
  public stopAnimation(name: string): void {
    const action = this.actions.get(name);
    if (action) {
      action.stop();
      if (this.currentAnimation === name) {
        this.currentAnimation = null;
      }
    }
  }
  
  /**
   * Stop all playing animations
   */
  public stopAllAnimations(): void {
    this.actions.forEach(action => action.stop());
    this.currentAnimation = null;
  }
  
  /**
   * Update animations with delta time
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
  
  /**
   * Get the list of available animation names
   * @returns Array of animation names
   */
  public getAnimationNames(): string[] {
    return this.animations.map(clip => clip.name);
  }
  
  /**
   * Check if an animation exists
   * @param name Animation name
   * @returns Whether the animation exists
   */
  public hasAnimation(name: string): boolean {
    return this.animations.some(clip => clip.name === name);
  }
  
  /**
   * Serialize the component
   */
  public override serialize(): unknown {
    return {
      currentAnimation: this.currentAnimation,
      playbackSpeed: this.playbackSpeed,
      loop: this.loop,
      loopMode: this.loopMode,
      crossFade: this.crossFade,
      crossFadeDuration: this.crossFadeDuration
    };
  }
  
  /**
   * Deserialize the component
   * @param data Component data
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const animData = data as Record<string, any>;
    
    if (typeof animData.currentAnimation === 'string') {
      // We don't play the animation directly here because the mixer might not be ready
      // The system using this component should handle starting the animation
      this.currentAnimation = animData.currentAnimation;
    }
    
    if (typeof animData.playbackSpeed === 'number') this.playbackSpeed = animData.playbackSpeed;
    if (typeof animData.loop === 'boolean') this.loop = animData.loop;
    if (typeof animData.loopMode === 'string') this.loopMode = animData.loopMode as AnimationLoopMode;
    if (typeof animData.crossFade === 'boolean') this.crossFade = animData.crossFade;
    if (typeof animData.crossFadeDuration === 'number') this.crossFadeDuration = animData.crossFadeDuration;
  }
} 
import { Renderer } from '../../rendering/Renderer';
import { AssetDescriptor, AssetManager, PreloadConfig } from '../assets/AssetManager';

/**
 * Base State class for all game states
 */
export abstract class State {
  protected name: string;
  
  /**
   * Asset descriptors for preloading
   */
  protected assets: AssetDescriptor[] = [];
  
  /**
   * Asset manager instance
   */
  protected assetManager: AssetManager;
  
  constructor(name: string) {
    this.name = name;
    this.assetManager = AssetManager.getInstance();
  }
  
  /**
   * Called when the state is entered
   */
  abstract enter(): Promise<void>;
  
  /**
   * Called when the state is exited
   */
  abstract exit(): Promise<void>;
  
  /**
   * Update state logic
   * @param deltaTime Time since last frame in seconds
   */
  abstract update(deltaTime: number): void;
  
  /**
   * Setup any rendering related data (scenes, UI, etc)
   * @param renderer The renderer instance
   */
  abstract setupRenderingData(renderer: Renderer): void;
  
  /**
   * Get the state name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Define assets to preload for this state
   * Override this method in derived states to define assets
   */
  protected getAssetsToPreload(): AssetDescriptor[] {
    return this.assets;
  }
  
  /**
   * Preload assets needed by this state
   * @returns Promise that resolves when all assets are loaded
   */
  public async preloadAssets(): Promise<void> {
    const assets = this.getAssetsToPreload();
    
    if (assets.length === 0) {
      console.log(`No assets to preload for state: ${this.name}`);
      return Promise.resolve();
    }
    
    console.log(`Preloading ${assets.length} assets for state: ${this.name}`);
    
    const config: PreloadConfig = {
      assets
    };
    
    return this.assetManager.preload(config);
  }
} 
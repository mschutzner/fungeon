import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EventSystem } from '../events/EventSystem';
import { Config } from '../Config';

/**
 * Asset types supported by the asset manager
 */
export enum AssetType {
  TEXTURE = 'texture',
  MODEL = 'model',
  FONT = 'font',
  // More types can be added in the future (AUDIO, etc.)
}

/**
 * Interface for asset metadata
 */
export interface AssetDescriptor {
  type: AssetType;
  id: string;
  path: string;
}

/**
 * Interface for preload configurations
 */
export interface PreloadConfig {
  assets: AssetDescriptor[];
}

/**
 * Events emitted by the AssetManager
 */
export enum AssetEvents {
  ASSET_LOADED = 'asset:loaded',
  ASSET_ERROR = 'asset:error',
  PRELOAD_COMPLETE = 'asset:preload_complete',
  PRELOAD_PROGRESS = 'asset:preload_progress',
}

/**
 * Model loading result containing the extracted geometry
 */
export interface ModelLoadResult {
  geometry: THREE.BufferGeometry;
  originalModel: THREE.Group;
  animations: THREE.AnimationClip[];
  skeleton?: THREE.Skeleton;
  rootBone?: THREE.Bone;
}

/**
 * Font loading result containing the font info
 */
export interface FontLoadResult {
  charWidth: number;
  charHeight: number;
  charsPerRow: number;
  rows: number;
  canvas: HTMLCanvasElement;
  customWidths?: Map<number, number>;
  leading?: number;
}

/**
 * AssetManager is responsible for loading and caching assets from the public/assets directory
 */
export class AssetManager {
  private static instance: AssetManager;
  
  /**
   * Cache for loaded assets
   */
  private cache: Map<string, any> = new Map();
  
  /**
   * Loaders for different asset types
   */
  private textureLoader: THREE.TextureLoader;
  private modelLoader: GLTFLoader;
  
  /**
   * Base path for all assets
   */
  private basePath: string = 'public/assets/';
  
  /**
   * Event system for signaling asset loading events
   */
  private eventSystem: EventSystem;

  /**
   * Font info map
   */
  private fontInfo: Map<string, FontLoadResult> = new Map();
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.modelLoader = new GLTFLoader();
    this.eventSystem = EventSystem.getInstance();
    
    // Configure loaders
    this.textureLoader.setCrossOrigin('anonymous');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }
  
  /**
   * Set the base path for assets
   * @param path New base path
   */
  public setBasePath(path: string): void {
    this.basePath = path.endsWith('/') ? path : path + '/';
  }
  
  /**
   * Get the full path for an asset
   * @param path Relative path
   * @returns Full path
   */
  private getFullPath(path: string): string {
    // If path starts with http or https, assume it's an absolute URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // If path starts with ./ or /, assume it's relative to the project root
    if (path.startsWith('./') || path.startsWith('/')) {
      return path;
    }
    // Otherwise, prepend the base path
    return this.basePath + path;
  }
  
  /**
   * Load a texture asset
   * @param id Asset ID for caching
   * @param path Path to the texture file
   * @returns Promise that resolves with the loaded texture
   */
  public loadTexture(id: string, path: string): Promise<THREE.Texture> {
    // Check if the texture is already cached
    if (this.cache.has(id)) {
      return Promise.resolve(this.cache.get(id));
    }
    
    // Get the full path
    const fullPath = this.getFullPath(path);
    
    // Return a promise that wraps the Three.js loader
    return new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        fullPath,
        // onLoad callback
        (texture) => {
          this.cache.set(id, texture);
          this.eventSystem.publish(AssetEvents.ASSET_LOADED, { 
            type: AssetType.TEXTURE, 
            id, 
            asset: texture 
          });
          resolve(texture);
        },
        // onProgress callback (not used for textures)
        undefined,
        // onError callback
        (error) => {
          console.error(`Error loading texture: ${id}`, error);
          this.eventSystem.publish(AssetEvents.ASSET_ERROR, { 
            type: AssetType.TEXTURE, 
            id, 
            error 
          });
          reject(error);
        }
      );
    });
  }
  
  /**
   * Load a 3D model (glb/gltf) and extract the first mesh geometry
   * @param id Asset ID for caching
   * @param path Path to the model file (.glb or .gltf)
   * @returns Promise that resolves with the model loading result
   */
  public loadModel(id: string, path: string): Promise<ModelLoadResult> {
    // Check if the model is already cached
    if (this.cache.has(id)) {
      return Promise.resolve(this.cache.get(id));
    }
    
    // Get the full path
    const fullPath = this.getFullPath(path);
    
    // Return a promise that wraps the GLTFLoader
    return new Promise<ModelLoadResult>((resolve, reject) => {
      this.modelLoader.load(
        fullPath,
        // onLoad callback
        (gltf) => {
          // Extract the first mesh's geometry
          let geometry: THREE.BufferGeometry | null = null;
          let skeleton: THREE.Skeleton | undefined = undefined;
          let rootBone: THREE.Bone | undefined = undefined;
          
          // Find the first mesh with geometry and check for skeleton
          gltf.scene.traverse((child: THREE.Object3D) => {
            // If we haven't found geometry yet and this is a mesh with geometry
            if (!geometry && child instanceof THREE.Mesh && child.geometry) {
              geometry = child.geometry;
              
              // If this is a skinned mesh, extract the skeleton
              if (child instanceof THREE.SkinnedMesh && child.skeleton) {
                skeleton = child.skeleton;
                
                // Look for root bone of skeleton
                if (skeleton && skeleton.bones.length > 0) {
                  // Try to find the root bone (usually the one without a parent or the first in hierarchy)
                  let possibleRoot = skeleton.bones[0];
                  while (possibleRoot.parent instanceof THREE.Bone) {
                    possibleRoot = possibleRoot.parent;
                  }
                  rootBone = possibleRoot;
                }
              }
            }
          });
          
          // If no geometry was found, create an empty one
          if (!geometry) {
            console.warn(`No geometry found in model: ${id}`);
            geometry = new THREE.BufferGeometry();
          }
          
          const result: ModelLoadResult = {
            geometry: geometry,
            originalModel: gltf.scene,
            animations: gltf.animations || []
          };
          
          // Add skeleton and root bone if found
          if (skeleton) {
            result.skeleton = skeleton;
            console.log(`Skeleton found in model ${id} with ${(skeleton as THREE.Skeleton).bones.length} bones`);
            
            if (rootBone) {
              result.rootBone = rootBone;
              console.log(`Root bone found for model ${id}: ${(rootBone as THREE.Bone).name || 'unnamed'}`);
            }
          }
          
          // Cache the result
          this.cache.set(id, result);
          
          // Emit event
          this.eventSystem.publish(AssetEvents.ASSET_LOADED, { 
            type: AssetType.MODEL, 
            id, 
            asset: result 
          });
          
          resolve(result);
        },
        // onProgress callback
        (progress) => {
          // If needed, we could emit a progress event here
          // For now, we don't need it
        },
        // onError callback
        (error) => {
          console.error(`Error loading model: ${id}`, error);
          this.eventSystem.publish(AssetEvents.ASSET_ERROR, { 
            type: AssetType.MODEL, 
            id, 
            error 
          });
          reject(error);
        }
      );
    });
  }
  
  /**
   * Load a font asset
   * @param id Asset ID for caching
   * @param path Path to the font image file
   * @param charWidth Width of each character in pixels
   * @param charHeight Height of each character in pixels
   * @param customWidths Optional map of custom character widths
   * @param leading Optional line spacing
   * @returns Promise that resolves with the loaded font info
   */
  public loadFont(
    id: string, 
    path: string, 
    charWidth: number, 
    charHeight: number,
    customWidths?: { [key: string]: number },
    leading?: number
  ): Promise<FontLoadResult> {
    // Check if the font is already cached
    if (this.fontInfo.has(id)) {
      return Promise.resolve(this.fontInfo.get(id)!);
    }
    
    // Get the full path
    const fullPath = this.getFullPath(path);
    
    // Return a promise that wraps the image loading
    return new Promise<FontLoadResult>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate font metrics
        const charsPerRow = Math.floor(img.width / charWidth);
        const rows = Math.floor(img.height / charHeight);
        
        // Create offscreen canvas for the font atlas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context for font canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        // Create custom widths map if specified
        let customWidthsMap: Map<number, number> | undefined;
        if (customWidths) {
          customWidthsMap = new Map();
          for (const [char, width] of Object.entries(customWidths)) {
            if (char.length !== 1) {
              console.warn(`Invalid custom width key: "${char}". Must be a single character.`);
              continue;
            }
            const charCode = char.charCodeAt(0);
            customWidthsMap.set(charCode, width);
          }
        }
        
        const result: FontLoadResult = {
          charWidth,
          charHeight,
          charsPerRow,
          rows,
          canvas,
          customWidths: customWidthsMap,
          leading
        };
        
        // Store the font info
        this.fontInfo.set(id, result);
        
        // Emit event
        this.eventSystem.publish(AssetEvents.ASSET_LOADED, { 
          type: AssetType.FONT, 
          id, 
          asset: result 
        });
        
        resolve(result);
      };
      
      img.onerror = (err) => {
        console.error(`Failed to load font image: ${fullPath}`, err);
        this.eventSystem.publish(AssetEvents.ASSET_ERROR, { 
          type: AssetType.FONT, 
          id, 
          error: err 
        });
        reject(new Error(`Failed to load font image: ${fullPath}`));
      };
      
      img.src = fullPath;
    });
  }
  
  /**
   * Get an asset from the cache
   * @param id Asset ID
   * @returns The cached asset or undefined if not found
   */
  public getAsset(id: string): any | undefined {
    return this.cache.get(id);
  }
  
  /**
   * Get a texture from the cache
   * @param id Texture ID
   * @returns The cached texture or undefined if not found
   */
  public getTexture(id: string): THREE.Texture | undefined {
    const asset = this.cache.get(id);
    return asset instanceof THREE.Texture ? asset : undefined;
  }
  
  /**
   * Get a model from the cache
   * @param id Model ID
   * @returns The cached model result or undefined if not found
   */
  public getModel(id: string): ModelLoadResult | undefined {
    const asset = this.cache.get(id);
    return asset && asset.geometry ? asset as ModelLoadResult : undefined;
  }
  
  /**
   * Get a model geometry from the cache
   * @param id Model ID
   * @returns The cached model geometry or undefined if not found
   */
  public getModelGeometry(id: string): THREE.BufferGeometry | undefined {
    const model = this.getModel(id);
    return model ? model.geometry : undefined;
  }
  
  /**
   * Get model animations from the cache
   * @param id Model ID
   * @returns The cached model animations or empty array if not found
   */
  public getModelAnimations(id: string): THREE.AnimationClip[] {
    const model = this.getModel(id);
    return model ? model.animations : [];
  }
  
  /**
   * Get a font from the cache
   * @param id Font ID
   * @returns The cached font info or undefined if not found
   */
  public getFont(id: string): FontLoadResult | undefined {
    const asset = this.cache.get(id);
    return asset && asset.canvas ? asset as FontLoadResult : undefined;
  }
  
  /**
   * Check if an asset is already loaded
   * @param id Asset ID
   * @returns True if the asset is loaded
   */
  public isLoaded(id: string): boolean {
    return this.cache.has(id);
  }
  
  /**
   * Preload a set of assets
   * @param config Configuration with assets to preload
   * @returns Promise that resolves when all assets are loaded
   */
  public async preload(config: PreloadConfig): Promise<void> {
    const assetsToLoad = config.assets.filter(asset => !this.isLoaded(asset.id));
    const totalAssets = assetsToLoad.length;
    
    if (totalAssets === 0) {
      this.eventSystem.publish(AssetEvents.PRELOAD_COMPLETE, { assets: [] });
      return Promise.resolve();
    }
    
    let loadedAssets = 0;
    const loadingPromises: Promise<any>[] = [];
    const loadedAssetIds: string[] = [];
    
    // Create loading promises for each asset
    for (const asset of assetsToLoad) {
      const loadPromise = this.loadAsset(asset)
        .then(result => {
          loadedAssets++;
          loadedAssetIds.push(asset.id);
          
          // Emit progress event
          this.eventSystem.publish(AssetEvents.PRELOAD_PROGRESS, {
            current: loadedAssets,
            total: totalAssets,
            percentage: (loadedAssets / totalAssets) * 100,
            lastLoaded: asset.id
          });
          
          return result;
        })
        .catch(error => {
          console.error(`Failed to preload asset: ${asset.id}`, error);
          // Continue loading other assets even if one fails
          loadedAssets++;
          return null;
        });
      
      loadingPromises.push(loadPromise);
    }
    
    // Wait for all assets to load
    await Promise.all(loadingPromises);
    
    // Emit completion event
    this.eventSystem.publish(AssetEvents.PRELOAD_COMPLETE, {
      assets: loadedAssetIds
    });
  }
  
  /**
   * Load an asset based on its type
   * @param asset Asset descriptor
   * @returns Promise that resolves with the loaded asset
   */
  private loadAsset(asset: AssetDescriptor): Promise<any> {
    switch (asset.type) {
      case AssetType.TEXTURE:
        return this.loadTexture(asset.id, asset.path);
      case AssetType.MODEL:
        return this.loadModel(asset.id, asset.path);
      case AssetType.FONT:
        const config = Config.getInstance();
        const fontConfig = config.config.fonts[asset.id];
        if (!fontConfig) {
          return Promise.reject(new Error(`Font config not found: ${asset.id}`));
        }
        return this.loadFont(
          asset.id,
          asset.path,
          fontConfig.charWidth,
          fontConfig.charHeight,
          fontConfig.customWidths,
          fontConfig.leading
        );
      default:
        return Promise.reject(new Error(`Unsupported asset type: ${asset.type}`));
    }
  }
  
  /**
   * Clear specific assets from the cache
   * @param ids Asset IDs to clear (or all if not specified)
   */
  public clearCache(ids?: string[]): void {
    if (!ids) {
      // Clear all assets
      this.cache.forEach((asset) => {
        this.disposeAsset(asset);
      });
      this.cache.clear();
    } else {
      // Clear specified assets
      for (const id of ids) {
        const asset = this.cache.get(id);
        if (asset) {
          this.disposeAsset(asset);
          this.cache.delete(id);
        }
      }
    }
  }
  
  /**
   * Properly dispose of an asset to free memory
   * @param asset Asset to dispose
   */
  private disposeAsset(asset: any): void {
    if (asset instanceof THREE.Texture) {
      asset.dispose();
    } else if (asset && asset.geometry instanceof THREE.BufferGeometry) {
      // Dispose model geometry
      asset.geometry.dispose();
      
      // Dispose materials in the original model
      if (asset.originalModel) {
        asset.originalModel.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      }
    } else if (asset && asset.canvas instanceof HTMLCanvasElement) {
      // Dispose font canvas
      asset.canvas.width = 0;
      asset.canvas.height = 0;
    }
    // Add more asset type disposal logic as needed
  }

  /**
   * Get font information by name
   */
  public getFontInfo(fontName: string): FontLoadResult | undefined {
    return this.fontInfo.get(fontName);
  }

  /**
   * Check if a font is loaded
   */
  public isFontLoaded(fontName: string): boolean {
    return this.fontInfo.has(fontName);
  }

  /**
   * Get all loaded font names
   */
  public getLoadedFontNames(): string[] {
    return Array.from(this.fontInfo.keys());
  }

  /**
   * Get model skeleton from the cache
   * @param id Model ID
   * @returns The cached model skeleton or undefined if not found
   */
  public getModelSkeleton(id: string): THREE.Skeleton | undefined {
    const model = this.getModel(id);
    return model?.skeleton;
  }

  /**
   * Get model root bone from the cache
   * @param id Model ID
   * @returns The cached model root bone or undefined if not found
   */
  public getModelRootBone(id: string): THREE.Bone | undefined {
    const model = this.getModel(id);
    return model?.rootBone;
  }
} 
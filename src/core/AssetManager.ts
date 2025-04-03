import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { IWorld } from '../ecs/types';
import { Transform } from '../ecs/components/Transform';
import { ThreeObject } from '../ecs/components/ThreeObject';
import { MeshComponent, GeometryType } from '../ecs/components/MeshComponent';

/**
 * Asset type enum
 */
export enum AssetType {
  MODEL = 'model',
  TEXTURE = 'texture',
  AUDIO = 'audio',
}

/**
 * Asset loading status
 */
export enum AssetStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

/**
 * Asset cache entry
 */
interface AssetCacheEntry {
  type: AssetType;
  status: AssetStatus;
  data: any;
  error?: Error;
}

/**
 * Model loading options
 */
export interface ModelLoadOptions {
  wireframe?: boolean;
  color?: number;
}

/**
 * Asset Manager
 * Handles loading and caching of assets
 */
export class AssetManager {
  /**
   * Asset cache
   */
  private assetCache: Map<string, AssetCacheEntry> = new Map();
  
  /**
   * GLTF loader instance
   */
  private gltfLoader: GLTFLoader;
  
  /**
   * Reference to the world
   */
  private world: IWorld;
  
  /**
   * Constructor
   * @param world The world to create entities in
   */
  constructor(world: IWorld) {
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    console.log('AssetManager initialized');
  }
  
  /**
   * Get the base URL for assets
   */
  private getAssetBaseUrl(): string {
    return '/assets/';
  }
  
  /**
   * Get the full asset path
   * @param path Relative path from assets folder
   */
  private getAssetPath(path: string): string {
    // Make sure path doesn't start with a slash
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${this.getAssetBaseUrl()}${cleanPath}`;
  }
  
  /**
   * Load a GLTF model
   * @param path Path to the model (relative to assets folder)
   * @param options Loading options
   * @returns Promise that resolves when the model is loaded
   */
  public async loadModel(path: string, options: ModelLoadOptions = {}): Promise<THREE.Group> {
    const fullPath = this.getAssetPath(path);
    const cacheKey = `model:${path}`;
    
    // Check if the model is already in the cache
    if (this.assetCache.has(cacheKey)) {
      const entry = this.assetCache.get(cacheKey)!;
      
      // If the asset is already loaded, return it
      if (entry.status === AssetStatus.LOADED) {
        return Promise.resolve(entry.data.scene);
      }
      
      // If the asset failed to load, reject with the error
      if (entry.status === AssetStatus.ERROR) {
        return Promise.reject(entry.error);
      }
      
      // If the asset is currently loading, return a new promise that will resolve when it's loaded
      if (entry.status === AssetStatus.LOADING) {
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            const currentEntry = this.assetCache.get(cacheKey)!;
            if (currentEntry.status === AssetStatus.LOADED) {
              clearInterval(checkInterval);
              resolve(currentEntry.data.scene);
            } else if (currentEntry.status === AssetStatus.ERROR) {
              clearInterval(checkInterval);
              reject(currentEntry.error);
            }
          }, 100);
        });
      }
    }
    
    // Create a new cache entry
    this.assetCache.set(cacheKey, {
      type: AssetType.MODEL,
      status: AssetStatus.LOADING,
      data: null,
    });
    
    // Load the model
    try {
      console.log(`Loading model: ${fullPath}`);
      const gltf = await this.loadGLTF(fullPath);
      
      // Update cache
      this.assetCache.set(cacheKey, {
        type: AssetType.MODEL,
        status: AssetStatus.LOADED,
        data: gltf,
      });
      
      console.log(`Model loaded: ${path}`);
      return gltf.scene;
    } catch (error) {
      console.error(`Error loading model: ${path}`, error);
      
      // Update cache with error
      this.assetCache.set(cacheKey, {
        type: AssetType.MODEL,
        status: AssetStatus.ERROR,
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      
      throw error;
    }
  }
  
  /**
   * Load a GLTF file
   * @param url URL to the GLTF file
   * @returns Promise that resolves with the loaded GLTF
   */
  private loadGLTF(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        // onLoad callback
        (gltf) => {
          resolve(gltf);
        },
        // onProgress callback
        (xhr) => {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          console.log(`Loading model: ${Math.round(percentComplete)}% completed`);
        },
        // onError callback
        (error) => {
          reject(error);
        }
      );
    });
  }
  
  /**
   * Create entities from a loaded model
   * @param modelPath Path to the model (must be already loaded)
   * @param parentEntity Optional parent entity
   * @param options Model options
   * @returns Root entity containing the model hierarchy
   */
  public createEntitiesFromModel(
    modelPath: string,
    parentEntity: THREE.Object3D | null = null,
    options: ModelLoadOptions = {}
  ): Promise<THREE.Object3D> {
    return this.loadModel(modelPath, options)
      .then((modelScene) => {
        // Process the loaded model and create entities
        const rootObject = this.processModelHierarchy(modelScene, options);
        
        // Attach to parent if provided
        if (parentEntity) {
          parentEntity.add(rootObject);
        }
        
        return rootObject;
      });
  }
  
  /**
   * Process a model hierarchy and create entities
   * @param object The model object to process
   * @param options Model options
   * @returns The root entity
   */
  private processModelHierarchy(object: THREE.Object3D, options: ModelLoadOptions = {}): THREE.Object3D {
    // Create a root entity for this object
    const entityName = object.name || 'ModelEntity';
    const entity = this.world.createEntity(entityName);
    
    // Add transform component based on object transform
    const transform = new Transform(
      object.position.x,
      object.position.y,
      object.position.z
    );
    
    // Set rotation (convert from radians to degrees)
    const toDeg = (rad: number) => rad * (180 / Math.PI);
    transform.rotation.set(
      toDeg(object.rotation.x),
      toDeg(object.rotation.y),
      toDeg(object.rotation.z)
    );
    
    // Set scale
    transform.scale.set(
      object.scale.x,
      object.scale.y,
      object.scale.z
    );
    
    // Add components in dependency order: first Transform, then ThreeObject, then MeshComponent
    entity.addComponent(transform);
    
    // Create a new THREE.Object3D for this entity
    const entityObject = new THREE.Object3D();
    entityObject.name = entityName;
    
    // Add ThreeObject component
    const threeObject = new ThreeObject(entityObject);
    entity.addComponent(threeObject);
    
    // If this is a mesh, add a MeshComponent
    if (object instanceof THREE.Mesh) {
      const mesh = object as THREE.Mesh;
      
      // Create mesh component with MODEL type
      const meshComponent = new MeshComponent(GeometryType.MODEL);
      
      // Apply options
      if (options.wireframe !== undefined) {
        meshComponent.wireframe = options.wireframe;
      } else {
        meshComponent.wireframe = true; // Default to wireframe for now
      }
      
      if (options.color !== undefined) {
        meshComponent.color = options.color;
      }
      
      // Add the mesh component
      entity.addComponent(meshComponent);
      
      // Copy the geometry from the original mesh
      if (mesh.geometry) {
        entityObject.add(new THREE.Mesh(
          mesh.geometry.clone(),
          new THREE.MeshBasicMaterial({
            wireframe: meshComponent.wireframe,
            color: meshComponent.color,
          })
        ));
      }
    }
    
    // Process children recursively
    object.children.forEach((child) => {
      const childObject = this.processModelHierarchy(child, options);
      entityObject.add(childObject);
    });
    
    return entityObject;
  }
  
  /**
   * Clear the asset cache
   */
  public clearCache(): void {
    this.assetCache.clear();
    console.log('Asset cache cleared');
  }
  
  /**
   * Get an asset from the cache
   * @param path Path to the asset
   * @param type Asset type
   * @returns The asset or null if not found
   */
  public getAsset(path: string, type: AssetType): any | null {
    const cacheKey = `${type}:${path}`;
    const entry = this.assetCache.get(cacheKey);
    
    if (entry && entry.status === AssetStatus.LOADED) {
      return entry.data;
    }
    
    return null;
  }
  
  /**
   * Check if an asset is loaded
   * @param path Path to the asset
   * @param type Asset type
   * @returns True if the asset is loaded
   */
  public isAssetLoaded(path: string, type: AssetType): boolean {
    const cacheKey = `${type}:${path}`;
    const entry = this.assetCache.get(cacheKey);
    
    return entry?.status === AssetStatus.LOADED;
  }
} 
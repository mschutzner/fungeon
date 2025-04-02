import { System } from '../System';
import { IEntity, IWorld, IPrefab } from '../types';
import { World } from '../World';

/**
 * SerializationSystem
 * Handles saving and loading game data, prefabs, and scenes
 */
export class SerializationSystem extends System {
  /**
   * Prefab library
   */
  private prefabs: Map<string, IPrefab> = new Map();
  
  /**
   * Constructor
   * @param priority Priority of this system (higher priority systems are updated first)
   */
  constructor(priority: number = 0) {
    super(priority);
  }
  
  /**
   * Save the world to a JSON string
   * @returns A JSON string representing the world
   */
  public saveWorld(): string {
    if (!this.world) return '{}';
    
    // Serialize the world to a plain object
    const worldData = this.world.serialize();
    
    // Convert to a JSON string
    return JSON.stringify(worldData);
  }
  
  /**
   * Load the world from a JSON string
   * @param json The JSON string to load from
   * @returns True if the load was successful
   */
  public loadWorld(json: string): boolean {
    if (!this.world) return false;
    
    try {
      // Parse the JSON string
      const worldData = JSON.parse(json);
      
      // Deserialize the world from the plain object
      this.world.deserialize(worldData);
      
      return true;
    } catch (error) {
      console.error('Error loading world:', error);
      return false;
    }
  }
  
  /**
   * Register a prefab
   * @param prefab The prefab to register
   */
  public registerPrefab(prefab: IPrefab): void {
    this.prefabs.set(prefab.name, prefab);
  }
  
  /**
   * Get a prefab by name
   * @param name The name of the prefab
   * @returns The prefab, or null if not found
   */
  public getPrefab(name: string): IPrefab | null {
    return this.prefabs.get(name) || null;
  }
  
  /**
   * Create an entity from a prefab
   * @param prefabName The name of the prefab
   * @returns The created entity, or null if the prefab wasn't found
   */
  public instantiatePrefab(prefabName: string): IEntity | null {
    if (!this.world) return null;
    
    const prefab = this.prefabs.get(prefabName);
    if (!prefab) return null;
    
    return prefab.instantiate(this.world);
  }
  
  /**
   * Save a scene to a JSON string
   * @param name The name of the scene
   * @returns A JSON string representing the scene
   */
  public saveScene(name: string): string {
    if (!this.world) return '{}';
    
    // Create a scene object with metadata
    const scene = {
      name,
      timestamp: Date.now(),
      data: this.world.serialize()
    };
    
    // Convert to a JSON string
    return JSON.stringify(scene);
  }
  
  /**
   * Load a scene from a JSON string
   * @param json The JSON string to load from
   * @returns True if the load was successful
   */
  public loadScene(json: string): boolean {
    if (!this.world) return false;
    
    try {
      // Parse the JSON string
      const scene = JSON.parse(json);
      
      // Validate the scene
      if (!scene.data) {
        console.error('Invalid scene: missing data');
        return false;
      }
      
      // Deserialize the world from the scene data
      this.world.deserialize(scene.data);
      
      return true;
    } catch (error) {
      console.error('Error loading scene:', error);
      return false;
    }
  }
  
  /**
   * Create a prefab from an entity
   * @param entity The entity to create a prefab from
   * @param name The name of the prefab
   * @returns The created prefab
   */
  public createPrefabFromEntity(entity: IEntity, name: string): IPrefab {
    // Create a prefab that serializes the entity
    const prefab: IPrefab = {
      name,
      
      // Serialize the entity
      serialize(): unknown {
        return entity.serialize();
      },
      
      // Deserialize the entity data to create a new entity
      deserialize(data: unknown): void {
        // Nothing to do here, since we're not modifying the prefab
      },
      
      // Create a new entity from this prefab
      instantiate(world: IWorld): IEntity {
        // Create a new entity
        const newEntity = world.createEntity();
        
        // Serialize the original entity
        const entityData = entity.serialize();
        
        // Deserialize the entity data to the new entity
        newEntity.deserialize(entityData);
        
        return newEntity;
      }
    };
    
    // Register the prefab
    this.registerPrefab(prefab);
    
    return prefab;
  }
  
  /**
   * Save a prefab to a JSON string
   * @param prefabName The name of the prefab
   * @returns A JSON string representing the prefab
   */
  public savePrefab(prefabName: string): string {
    const prefab = this.prefabs.get(prefabName);
    if (!prefab) return '{}';
    
    // Serialize the prefab
    const prefabData = prefab.serialize();
    
    // Create a prefab object with metadata
    const prefabObject = {
      name: prefab.name,
      data: prefabData
    };
    
    // Convert to a JSON string
    return JSON.stringify(prefabObject);
  }
  
  /**
   * Load a prefab from a JSON string
   * @param json The JSON string to load from
   * @returns True if the load was successful
   */
  public loadPrefab(json: string): boolean {
    try {
      // Parse the JSON string
      const prefabObject = JSON.parse(json);
      
      // Validate the prefab
      if (!prefabObject.name || !prefabObject.data) {
        console.error('Invalid prefab: missing name or data');
        return false;
      }
      
      // Create a prefab
      const prefab: IPrefab = {
        name: prefabObject.name,
        
        // Return the prefab data directly
        serialize(): unknown {
          return prefabObject.data;
        },
        
        deserialize(data: unknown): void {
          // Nothing to do here, since we're not modifying the prefab
        },
        
        // Create a new entity from this prefab
        instantiate(world: IWorld): IEntity {
          // Create a new entity
          const newEntity = world.createEntity();
          
          // Deserialize the entity data to the new entity
          newEntity.deserialize(prefabObject.data);
          
          return newEntity;
        }
      };
      
      // Register the prefab
      this.registerPrefab(prefab);
      
      return true;
    } catch (error) {
      console.error('Error loading prefab:', error);
      return false;
    }
  }
  
  /**
   * System update (not used for serialization)
   */
  protected override onUpdate(deltaTime: number): void {
    // Serialization happens on demand, not every frame
  }
} 
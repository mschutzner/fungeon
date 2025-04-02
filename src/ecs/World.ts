import { Entity } from './Entity';
import { Component, ComponentClass, IEntity, ISystem, IWorld } from './types';
import * as THREE from 'three';
import { ThreeObject } from './components/ThreeObject';
import { Renderer } from '../rendering/Renderer';
import { ThreeSceneSystem } from './systems/ThreeSceneSystem';
import { CameraSystem } from './systems/CameraSystem';
import { ConstraintSystem } from './systems/ConstraintSystem';

/**
 * World implementation
 * The World manages entities, components, and systems
 */
export class World implements IWorld {
  /**
   * Entities in this world by ID
   */
  private entities: Map<number, Entity> = new Map();
  
  /**
   * Entities in this world by name
   */
  private entitiesByName: Map<string, Entity> = new Map();
  
  /**
   * Systems in this world
   */
  private systems: ISystem[] = [];
  
  /**
   * Component registry for serialization
   */
  private componentRegistry: Map<string, ComponentClass> = new Map();
  
  /**
   * Three.js scene for this world
   * Created by default in the constructor
   */
  private scene: THREE.Scene;
  
  /**
   * Reference to renderer
   */
  private renderer: Renderer | null = null;
  
  /**
   * Core systems
   */
  private threeSceneSystem: ThreeSceneSystem | null = null;
  private cameraSystem: CameraSystem | null = null;
  private constraintSystem: ConstraintSystem | null = null;
  
  /**
   * Constructor
   */
  constructor() {
    // Create a default scene
    this.scene = new THREE.Scene();
    console.log('Created new Three.js scene for World');
  }
  
  /**
   * Get the Three.js scene for this world
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * Check if the world has a scene
   */
  public hasScene(): boolean {
    return !!this.scene;
  }
  
  /**
   * Set the renderer for this world
   * This will automatically connect the renderer with the ECS
   * @param renderer The renderer to use
   */
  public setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
    
    // Connect renderer with ECS
    if (this.renderer) {
      // Set the world in the renderer
      this.renderer.setWorld(this);
      
      // Set the active scene
      this.renderer.setActiveScene(this.scene);
      
      console.log('Renderer connected with ECS world');
    }
  }
  
  /**
   * Get the renderer for this world
   */
  public getRenderer(): Renderer | null {
    return this.renderer;
  }
  
  /**
   * Initialize core systems required for Three.js integration
   * This will create and register ThreeSceneSystem and CameraSystem if they don't exist
   */
  public initializeCoreEcsSystems(): void {
    // Check if we already have a ThreeSceneSystem
    this.threeSceneSystem = this.getSystem(ThreeSceneSystem);
    if (!this.threeSceneSystem) {
      this.threeSceneSystem = new ThreeSceneSystem();
      this.registerSystem(this.threeSceneSystem);
    }
    
    // Check if we already have a CameraSystem
    this.cameraSystem = this.getSystem(CameraSystem);
    if (!this.cameraSystem) {
      this.cameraSystem = new CameraSystem();
      this.registerSystem(this.cameraSystem);
    }
    
    // Check if we already have a ConstraintSystem
    this.constraintSystem = this.getSystem(ConstraintSystem);
    if (!this.constraintSystem) {
      this.constraintSystem = new ConstraintSystem();
      this.registerSystem(this.constraintSystem);
    }
    
    console.log('Core ECS systems initialized');
  }
  
  /**
   * Get the ThreeSceneSystem
   */
  public getThreeSceneSystem(): ThreeSceneSystem | null {
    return this.threeSceneSystem;
  }
  
  /**
   * Get the CameraSystem
   */
  public getCameraSystem(): CameraSystem | null {
    return this.cameraSystem;
  }
  
  /**
   * Get the ConstraintSystem
   */
  public getConstraintSystem(): ConstraintSystem | null {
    return this.constraintSystem;
  }
  
  /**
   * Register a component class for serialization
   * @param name The name of the component
   * @param componentClass The component class
   */
  public registerComponent(name: string, componentClass: ComponentClass): void {
    this.componentRegistry.set(name, componentClass);
  }
  
  /**
   * Create a new entity
   * @param name Optional name for the entity
   * @returns The created entity
   */
  public createEntity(name?: string): IEntity {
    const entity = new Entity(this, name);
    
    // Add to entities map
    this.entities.set(entity.id, entity);
    
    // Add to named entities map if name is provided
    if (name) {
      this.entitiesByName.set(name, entity);
    }
    
    return entity;
  }
  
  /**
   * Get an entity by ID
   * @param id The entity ID
   * @returns The entity or null if not found
   */
  public getEntity(id: number): IEntity | null {
    return this.entities.get(id) || null;
  }
  
  /**
   * Get an entity by name
   * @param name The entity name
   * @returns The entity or null if not found
   */
  public getEntityByName(name: string): IEntity | null {
    return this.entitiesByName.get(name) || null;
  }
  
  /**
   * Get all entities
   * @returns An array of all entities
   */
  public getAllEntities(): IEntity[] {
    return Array.from(this.entities.values());
  }
  
  /**
   * Get all active entities
   * @returns An array of all active entities
   */
  public getActiveEntities(): IEntity[] {
    return Array.from(this.entities.values()).filter(entity => entity.active);
  }
  
  /**
   * Destroy an entity
   * @param entity The entity or entity ID to destroy
   * @returns True if the entity was destroyed, false if it wasn't found
   */
  public destroyEntity(entity: IEntity | number): boolean {
    const id = typeof entity === 'number' ? entity : entity.id;
    const entityToDestroy = this.entities.get(id);
    
    if (!entityToDestroy) return false;
    
    // Remove from named entities map if it has a name
    if (entityToDestroy.name) {
      this.entitiesByName.delete(entityToDestroy.name);
    }
    
    // Remove all components
    entityToDestroy.removeAllComponents();
    
    // Remove from entities map
    this.entities.delete(id);
    
    return true;
  }
  
  /**
   * Register a system
   * @param system The system to register
   * @returns This world for method chaining
   */
  public registerSystem(system: ISystem): this {
    // Initialize the system
    system.initialize(this);
    
    // Add to systems array
    this.systems.push(system);
    
    // Sort systems by priority (higher priority first)
    this.systems.sort((a, b) => b.priority - a.priority);
    
    return this;
  }
  
  /**
   * Unregister a system
   * @param system The system or system ID to unregister
   * @returns True if the system was unregistered, false if it wasn't found
   */
  public unregisterSystem(system: ISystem | number): boolean {
    const id = typeof system === 'number' ? system : system.id;
    const index = this.systems.findIndex(s => s.id === id);
    
    if (index === -1) return false;
    
    // Clean up the system
    this.systems[index].cleanup();
    
    // Remove from systems array
    this.systems.splice(index, 1);
    
    return true;
  }
  
  /**
   * Get a system by type
   * @param systemClass The system class to get
   * @returns The system or null if not found
   */
  public getSystem<T extends ISystem>(systemClass: new (...args: any[]) => T): T | null {
    const system = this.systems.find(s => s instanceof systemClass);
    return system as T || null;
  }
  
  /**
   * Update all systems
   * @param deltaTime Time since the last update in seconds
   */
  public update(deltaTime: number): void {
    // Update all systems
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }
  }
  
  /**
   * Query for entities with specific components
   * @param componentClasses The component classes to query for
   * @returns An array of entities with all the specified components
   */
  public query<T extends Component>(...componentClasses: ComponentClass<T>[]): IEntity[] {
    // If no component classes are specified, return all entities
    if (componentClasses.length === 0) {
      return this.getActiveEntities();
    }
    
    // Filter entities that have all specified components
    return this.getActiveEntities().filter(entity => {
      return componentClasses.every(componentClass => entity.hasComponent(componentClass));
    });
  }
  
  /**
   * Clear all entities and systems
   */
  public clear(): void {
    // Clean up Three.js resources if the scene exists
    if (this.scene) {
      this.disposeThreeObjects();
      
      // Clear Three.js scene
      while (this.scene.children.length > 0) { 
        this.scene.remove(this.scene.children[0]); 
      }
    }
    
    // Clean up systems
    this.systems.forEach(system => system.cleanup());
    
    // Clear all entities
    this.entities.forEach(entity => entity.removeAllComponents());
    
    // Clear all maps and arrays
    this.entities.clear();
    this.entitiesByName.clear();
    this.systems = [];
    
    // Clear renderer reference
    this.renderer = null;
    this.threeSceneSystem = null;
    this.cameraSystem = null;
    this.constraintSystem = null;
    
    // Create a new scene
    this.scene = new THREE.Scene();
  }
  
  /**
   * Dispose Three.js objects
   * @private
   */
  private disposeThreeObjects(): void {
    // Only process if we have a scene
    if (!this.scene) return;
    
    this.entities.forEach(entity => {
      const threeObj = entity.getComponent(ThreeObject);
      if (threeObj && threeObj.object) {
        // Remove from parent
        if (threeObj.object.parent) {
          threeObj.object.parent.remove(threeObj.object);
        }
        
        // Dispose geometries and materials
        if (threeObj.object instanceof THREE.Mesh) {
          if (threeObj.object.geometry) {
            threeObj.object.geometry.dispose();
          }
          
          if (threeObj.object.material) {
            if (Array.isArray(threeObj.object.material)) {
              threeObj.object.material.forEach(material => material.dispose());
            } else {
              threeObj.object.material.dispose();
            }
          }
        }
      }
    });
  }
  
  /**
   * Create a component instance by name
   * Used for deserialization
   * @param name The component class name
   * @returns A new component instance, or null if the component class is not registered
   */
  private createComponentByName(name: string): Component | null {
    const componentClass = this.componentRegistry.get(name);
    if (!componentClass) return null;
    
    return new componentClass();
  }
  
  /**
   * Serialize this world to a plain object
   * @returns A plain object representation of this world
   */
  public serialize(): unknown {
    const entities: unknown[] = [];
    
    // Serialize all entities
    this.entities.forEach(entity => {
      entities.push(entity.serialize());
    });
    
    return {
      entities
    };
  }
  
  /**
   * Deserialize this world from a plain object
   * @param data The data to deserialize from
   */
  public deserialize(data: unknown): void {
    // Clear existing entities and systems
    this.clear();
    
    if (typeof data !== 'object' || data === null) return;
    
    const worldData = data as Record<string, unknown>;
    const entitiesData = worldData.entities as unknown[];
    
    if (!Array.isArray(entitiesData)) return;
    
    // Create and deserialize entities
    entitiesData.forEach(entityData => {
      if (typeof entityData !== 'object' || entityData === null) return;
      
      const data = entityData as Record<string, unknown>;
      const name = typeof data.name === 'string' ? data.name : undefined;
      
      // Create the entity
      const entity = this.createEntity(name) as Entity;
      
      // Deserialize entity data
      entity.deserialize(entityData);
      
      // Add components to the entity
      const componentsData = data.components as Record<string, unknown[]>;
      
      if (typeof componentsData === 'object' && componentsData !== null) {
        // Iterate through component types
        Object.entries(componentsData).forEach(([componentName, componentDataArray]) => {
          if (!Array.isArray(componentDataArray)) return;
          
          // Create and add each component
          componentDataArray.forEach(componentData => {
            const component = this.createComponentByName(componentName);
            if (!component) return;
            
            // Deserialize the component
            component.deserialize(componentData);
            
            // Add the component to the entity
            entity.addComponent(component);
          });
        });
      }
    });
  }
} 
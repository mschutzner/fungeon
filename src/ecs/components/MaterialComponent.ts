import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from './ThreeObject';
import { MeshComponent } from './MeshComponent';

/**
 * Interface for material options
 */
export interface MaterialOptions {
  color?: number;
  transparent?: boolean;
  opacity?: number;
  map?: THREE.Texture | null;
  emissive?: number;
  emissiveIntensity?: number;
  side?: THREE.Side;
}

/**
 * Component that manages Three.js materials
 * Initially focuses on MeshLambertMaterial
 */
export class MaterialComponent extends BaseComponent {
  /**
   * The Three.js material
   */
  private material: THREE.MeshLambertMaterial | null = null;
  
  /**
   * Material options
   */
  private options: MaterialOptions = {
    color: 0x808080,
    transparent: false,
    opacity: 1.0,
    map: null,
    emissive: 0x000000,
    emissiveIntensity: 1.0,
    side: THREE.DoubleSide
  };
  
  /**
   * Constructor
   * @param options Material options
   */
  constructor(options: MaterialOptions = {}) {
    super();
    this.setOptions(options);
    this.createMaterial();
  }
  
  /**
   * Define dependencies
   */
  public static override getRequirements(): ComponentClass[] {
    return [ThreeObject, MeshComponent];
  }
  
  /**
   * Set material options
   * @param options Options to apply
   */
  public setOptions(options: MaterialOptions): void {
    // Merge provided options with defaults
    this.options = {
      ...this.options,
      ...options
    };
    
    // Update material if it exists
    if (this.material) {
      this.updateMaterial();
    }
  }
  
  /**
   * Get current material options
   */
  public getOptions(): MaterialOptions {
    return { ...this.options };
  }
  
  /**
   * Create the material based on current settings
   */
  private createMaterial(): void {
    // Dispose existing material
    if (this.material) {
      this.material.dispose();
    }
    
    if(this.options.map) {
      this.options.map.colorSpace = THREE.SRGBColorSpace;
    }

    // Create new material
    this.material = new THREE.MeshLambertMaterial({
      color: this.options.color,
      transparent: this.options.transparent,
      opacity: this.options.opacity,
      map: this.options.map,
      emissive: this.options.emissive,
      emissiveIntensity: this.options.emissiveIntensity,
      side: this.options.side
    });
  }
  
  /**
   * Get the Three.js material
   */
  public getMaterial(): THREE.MeshLambertMaterial | null {
    return this.material;
  }
  
  /**
   * Set material color
   * @param color New color value
   */
  public setColor(color: number): void {
    this.options.color = color;
    if (this.material) {
      this.material.color.setHex(color);
    }
  }
  
  /**
   * Set emissive color
   * @param color New emissive color value
   * @param intensity Optional emissive intensity
   */
  public setEmissive(color: number, intensity?: number): void {
    this.options.emissive = color;
    if (intensity !== undefined) {
      this.options.emissiveIntensity = intensity;
    }
    
    if (this.material) {
      this.material.emissive.setHex(color);
      if (intensity !== undefined) {
        this.material.emissiveIntensity = intensity;
      }
    }
  }
  
  /**
   * Set material transparency settings
   * @param transparent Whether material is transparent
   * @param opacity Opacity value (0.0-1.0)
   */
  public setTransparency(transparent: boolean, opacity: number = 1.0): void {
    this.options.transparent = transparent;
    this.options.opacity = opacity;
    if (this.material) {
      this.material.transparent = transparent;
      this.material.opacity = opacity;
    }
  }
  
  /**
   * Set material texture map
   * @param texture The texture to use, or null to clear
   */
  public setTexture(texture: THREE.Texture | null): void {
    this.options.map = texture;
    if (this.material) {
      this.material.map = texture;
      this.material.needsUpdate = true;
    }
  }

  /**
   * Set the side of the material
   * @param side The side to use
   */
  public setSide(side: THREE.Side): void {
    this.options.side = side;
    if (this.material) {
      this.material.side = side;
    }
  }
  
  /**
   * Update an existing mesh with this material
   * @param mesh The mesh to update
   */
  public applyToMesh(mesh: THREE.Mesh): void {
    if (!this.material) return;
    
    // If the mesh already has a material, dispose it
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    } else if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    }
    
    // Apply the new material
    mesh.material = this.material;
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    // Apply material to the entity's mesh component if it exists
    const meshComponent = entity.getComponent(MeshComponent);
    if (meshComponent) {
      // Create material if it doesn't exist yet
      if (!this.material) {
        this.createMaterial();
      }
      
      // Get the ThreeObject to find the mesh
      const threeObject = entity.getComponent(ThreeObject);
      if (threeObject && threeObject.object instanceof THREE.Mesh) {
        this.applyToMesh(threeObject.object);
      }
    }
  }
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  public override onDetach(entity: IEntity): void {
    // Dispose resources
    this.dispose();
  }
  
  /**
   * Dispose resources when no longer needed
   */
  private dispose(): void {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
  
  /**
   * Update material with current settings
   */
  public updateMaterial(): void {
    this.createMaterial();
    
    // Update mesh if entity has ThreeObject with mesh
    const entity = this.entity;
    if (entity && this.material) {
      const threeObject = entity.getComponent(ThreeObject);
      if (threeObject && threeObject.object instanceof THREE.Mesh) {
        this.applyToMesh(threeObject.object);
      }
    }
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      options: {
        color: this.options.color,
        transparent: this.options.transparent,
        opacity: this.options.opacity,
        emissive: this.options.emissive,
        emissiveIntensity: this.options.emissiveIntensity,
        side: this.options.side,
        // Note: Textures cannot be directly serialized
        // In a real implementation, we would store the texture path/id
        hasTexture: this.options.map !== null
      }
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const componentData = data as Record<string, any>;
    
    if (componentData.options && typeof componentData.options === 'object') {
      const options: MaterialOptions = {};
      
      const optionsData = componentData.options;
      
      // Restore properties
      if (typeof optionsData.color === 'number') options.color = optionsData.color;
      if (typeof optionsData.transparent === 'boolean') options.transparent = optionsData.transparent;
      if (typeof optionsData.opacity === 'number') options.opacity = optionsData.opacity;
      if (typeof optionsData.emissive === 'number') options.emissive = optionsData.emissive;
      if (typeof optionsData.emissiveIntensity === 'number') options.emissiveIntensity = optionsData.emissiveIntensity;
      if (typeof optionsData.side === 'number') options.side = optionsData.side;
      // Apply the options
      this.setOptions(options);
    }
    
    // Note: Texture would be loaded by AssetManager in a real implementation
  }
} 
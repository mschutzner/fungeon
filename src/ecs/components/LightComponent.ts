import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from './ThreeObject';
import { Transform } from './Transform';

/**
 * Light type enum
 */
export enum LightType {
  POINT = 'point',
}

/**
 * Component for managing lights in the scene
 * Currently only supports point lights
 */
export class LightComponent extends BaseComponent {
  /**
   * The THREE.js light object
   */
  private light: THREE.Light | null = null;
  
  /**
   * Type of light
   */
  public lightType: LightType = LightType.POINT;
  
  /**
   * Color of the light
   */
  public color: number = 0xffffff;
  
  /**
   * Intensity of the light
   */
  public intensity: number = 1.0;
  
  /**
   * Distance that the light reaches (point lights only)
   * Default is 0, which means infinite distance
   */
  public distance: number = 0;
  
  /**
   * The rate at which the intensity of the light decreases with distance (point lights only)
   * Default is 1 (linear decay)
   */
  public decay: number = 1;
  
  /**
   * Constructor
   * @param lightType Type of light
   * @param color Color of the light
   * @param intensity Intensity of the light
   */
  constructor(
    lightType: LightType = LightType.POINT, 
    color: number = 0xffffff, 
    intensity: number = 1.0
  ) {
    super();
    this.lightType = lightType;
    this.color = color;
    this.intensity = intensity;
  }
  
  /**
   * LightComponent requires Transform and ThreeObject
   */
  public static override getRequirements(): ComponentClass[] {
    return [Transform, ThreeObject];
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    // Create light
    this.createLight();
    
    // Set the light as the ThreeObject
    const threeObject = entity.getComponent(ThreeObject);
    if (threeObject && this.light) {
      threeObject.setObject(this.light);
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
   * Create the light based on current settings
   */
  private createLight(): void {
    // Dispose existing light
    this.disposeLight();
    
    // Create new light based on type
    switch (this.lightType) {
      case LightType.POINT:
      default:
        // Point light (emits in all directions)
        const pointLight = new THREE.PointLight(
          this.color,
          this.intensity,
          this.distance,
          this.decay
        );
        
        // Add debug helper if in development mode
        if (process.env.NODE_ENV === 'development') {
          const helper = new THREE.PointLightHelper(pointLight, 0.2);
          pointLight.add(helper);
        }
        
        this.light = pointLight;
        break;
    }
  }
  
  /**
   * Dispose existing light
   */
  private disposeLight(): void {
    this.light = null;
  }
  
  /**
   * Dispose resources when no longer needed
   */
  private dispose(): void {
    this.disposeLight();
  }
  
  /**
   * Update the light with current settings
   */
  public updateLight(): void {
    this.createLight();
    
    // Update ThreeObject if entity has one
    const entity = this.entity;
    if (entity && this.light) {
      const threeObject = entity.getComponent(ThreeObject);
      if (threeObject) {
        threeObject.setObject(this.light);
      }
    }
  }
  
  /**
   * Set the color of the light
   * @param color The color to set
   */
  public setColor(color: number): void {
    this.color = color;
    if (this.light) {
      this.light.color.set(color);
    }
  }
  
  /**
   * Set the intensity of the light
   * @param intensity The intensity to set
   */
  public setIntensity(intensity: number): void {
    this.intensity = intensity;
    if (this.light) {
      this.light.intensity = intensity;
    }
  }
  
  /**
   * Set the distance of the point light
   * @param distance The distance to set
   */
  public setDistance(distance: number): void {
    this.distance = distance;
    if (this.light && this.light instanceof THREE.PointLight) {
      this.light.distance = distance;
    }
  }
  
  /**
   * Set the decay rate of the point light
   * @param decay The decay rate to set
   */
  public setDecay(decay: number): void {
    this.decay = decay;
    if (this.light && this.light instanceof THREE.PointLight) {
      this.light.decay = decay;
    }
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      lightType: this.lightType,
      color: this.color,
      intensity: this.intensity,
      distance: this.distance,
      decay: this.decay,
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const lightData = data as Record<string, any>;
    
    // Restore properties
    if (lightData.lightType) this.lightType = lightData.lightType;
    if (typeof lightData.color === 'number') this.color = lightData.color;
    if (typeof lightData.intensity === 'number') this.intensity = lightData.intensity;
    if (typeof lightData.distance === 'number') this.distance = lightData.distance;
    if (typeof lightData.decay === 'number') this.decay = lightData.decay;
    
    // Recreate the light with restored properties
    this.updateLight();
  }
} 
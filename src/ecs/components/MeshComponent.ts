import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from './ThreeObject';

/**
 * Enum for basic geometry types
 */
export enum GeometryType {
  BOX = 'box',
  SPHERE = 'sphere',
  CYLINDER = 'cylinder',
  PLANE = 'plane',
  TORUS = 'torus',
  CONE = 'cone',
  DEBUG_AXIS = 'debugAxis',
  GRID = 'grid',
  PANE = 'pane',
  MODEL = 'model',
}

/**
 * Component that creates and manages Three.js meshes
 * Initially focuses on wireframe rendering
 */
export class MeshComponent extends BaseComponent {
  /**
   * The geometry of the mesh
   */
  private geometry: THREE.BufferGeometry | null = null;
  
  /**
   * The material of the mesh
   */
  private material: THREE.Material | null = null;
  
  /**
   * The Three.js mesh
   */
  private mesh: THREE.Mesh | null = null;
  
  /**
   * The skeleton for skinned meshes
   */
  private skeleton: THREE.Skeleton | null = null;
  
  /**
   * The root bone for the skeleton
   */
  private rootBone: THREE.Bone | null = null;
  
  /**
   * Type of geometry to create
   */
  public geometryType: GeometryType = GeometryType.BOX;
  
  /**
   * Whether to render as wireframe
   */
  public wireframe: boolean = true;
  
  /**
   * Color of the mesh
   */
  public color: number = 0x00ff00;
  
  /**
   * Size parameters for the geometry
   */
  public size: { width: number; height: number; depth: number } = { 
    width: 1, height: 1, depth: 1 
  };
  
  /**
   * Radius for sphere, cylinder, and torus geometries
   */
  public radius: number = 0.5;
  
  /**
   * Number of segments for curved geometries
   */
  public segments: number = 8;
  
  /**
   * Constructor
   * @param geometryType Type of geometry to create
   * @param color Color of the mesh
   * @param geometry Optional BufferGeometry to use when geometryType is MODEL
   * @param skeleton Optional skeleton for skinned meshes
   * @param rootBone Optional root bone for the skeleton
   */
  constructor(
    geometryType: GeometryType = GeometryType.BOX, 
    color: number = 0x00ff00,
    geometry?: THREE.BufferGeometry,
    skeleton?: THREE.Skeleton,
    rootBone?: THREE.Bone
  ) {
    super();
    this.geometryType = geometryType;
    this.color = color;
    
    // If geometry is provided and type is MODEL, set it directly
    if (geometryType === GeometryType.MODEL && geometry) {
      console.log('Setting geometry directly');
      this.geometry = geometry;
    }
    
    // Store the skeleton and root bone if provided
    if (skeleton) {
      console.log('Setting skeleton with', skeleton.bones.length, 'bones');
      this.skeleton = skeleton;
    }
    
    if (rootBone) {
      console.log('Setting root bone:', rootBone.name || 'unnamed');
      this.rootBone = rootBone;
    }
  }
  
  /**
   * In Phase 7, we don't enforce dependencies yet
   */
  public static override getRequirements(): ComponentClass[] {
    // Update dependencies for proper model loading
    return [ThreeObject];
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    // Create Three.js objects
    this.createGeometry();
    this.createMaterial();
    this.createMesh();
    
    // Check if the entity has a ThreeObject component
    if (entity.hasComponent(ThreeObject)) {
      // Update existing ThreeObject
      const threeObject = entity.getComponent(ThreeObject)!;
      threeObject.setObject(this.mesh!);
      console.log(`Updated ThreeObject on entity ${entity.name || entity.id} with mesh`);
    } else {
      // In Phase 7, we should auto-add ThreeObject to make the integration easier
      console.log(`Adding ThreeObject to entity ${entity.name || entity.id}`);
      entity.addComponent(new ThreeObject(new THREE.Vector3(0, 0, 0), this.mesh!));
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
   * Create the geometry based on the current settings
   */
  private createGeometry(): void {
    // Dispose existing geometry
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    // Create new geometry based on type
    switch (this.geometryType) {
      case GeometryType.BOX:
        this.geometry = new THREE.BoxGeometry(
          this.size.width,
          this.size.height,
          this.size.depth
        );
        break;
      case GeometryType.SPHERE:
        this.geometry = new THREE.SphereGeometry(
          this.radius,
          this.segments,
          this.segments
        );
        break;
      case GeometryType.CYLINDER:
        this.geometry = new THREE.CylinderGeometry(
          this.radius,
          this.radius,
          this.size.height,
          this.segments
        );
        break;
      case GeometryType.CONE:
        this.geometry = new THREE.ConeGeometry(
          this.radius,
          this.size.height,
          this.segments
        );
        break;
      case GeometryType.PLANE:
        this.geometry = new THREE.PlaneGeometry(
          this.size.width,
          this.size.height
        );
        break;
      case GeometryType.TORUS:
        this.geometry = new THREE.TorusGeometry(
          this.radius,
          this.radius / 3,
          16,
          this.segments
        );
        break;
      case GeometryType.GRID:
        // Create a grid geometry that's flat on the XZ plane
        const gridSize = Math.max(this.size.width, this.size.depth);
        const gridDivisions = this.segments > 0 ? this.segments : 10;
        this.geometry = new THREE.BufferGeometry();
        
        // Calculate grid lines
        const gridVertices: number[] = [];
        const halfSize = gridSize / 2;
        const step = gridSize / gridDivisions;
        
        // Create grid lines along X axis
        for (let i = 0; i <= gridDivisions; i++) {
          const x = -halfSize + i * step;
          gridVertices.push(x, 0, -halfSize, x, 0, halfSize);
        }
        
        // Create grid lines along Z axis
        for (let i = 0; i <= gridDivisions; i++) {
          const z = -halfSize + i * step;
          gridVertices.push(-halfSize, 0, z, halfSize, 0, z);
        }
        
        // Set the vertices
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
        break;
      case GeometryType.PANE:
        // Create a solid pane (similar to plane but optimized for large flat surfaces)
        this.geometry = new THREE.PlaneGeometry(
          this.size.width,
          this.size.height,
          1,  // Only need minimal segments for a flat pane
          1
        );
        break;
      case GeometryType.DEBUG_AXIS:
        // Create a custom geometry for axis visualization
        // This will have 3 lines representing X, Y, Z axes with different colors
        this.geometry = new THREE.BufferGeometry();
        
        // Define vertices for three axes (origin to 1 unit in each direction)
        const axisVertices = new Float32Array([
          // X axis (red)
          0, 0, 0,  // origin
          1, 0, 0,  // +X
          
          // Y axis (green)
          0, 0, 0,  // origin
          0, 1, 0,  // +Y
          
          // Z axis (blue)
          0, 0, 0,  // origin
          0, 0, 1   // +Z
        ]);
        
        // Define colors for each vertex
        const colors = new Float32Array([
          // X axis (red)
          1, 0, 0,  // red
          1, 0, 0,  // red
          
          // Y axis (green)
          0, 1, 0,  // green
          0, 1, 0,  // green
          
          // Z axis (blue)
          0, 0, 1,  // blue
          0, 0, 1   // blue
        ]);
        
        // Add attributes to the geometry
        this.geometry.setAttribute('position', new THREE.BufferAttribute(axisVertices, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        break;
      case GeometryType.MODEL:
        if(!this.geometry) {
          // For MODEL type, we'll create a placeholder geometry
          // The actual model geometry will be loaded by the AssetManager
          this.geometry = new THREE.BufferGeometry();
        }
        break;
      default:
        // Default to box if unknown type
        this.geometry = new THREE.BoxGeometry(
          this.size.width,
          this.size.height,
          this.size.depth
        );
    }
  }
  
  /**
   * Create the material based on the current settings
   */
  private createMaterial(): void {
    // Dispose existing material
    if (this.material) {
      this.material.dispose();
    }
    
    // Create specific material based on geometry type
    if (this.geometryType === GeometryType.DEBUG_AXIS) {
      // For debug axis, use a LineBasicMaterial with vertex colors
      this.material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2  // Note: Line width may not work on all platforms due to WebGL limitations
      });
    } else if (this.geometryType === GeometryType.GRID) {
      // For grid, use a LineBasicMaterial with color
      this.material = new THREE.LineBasicMaterial({
        color: this.color,
        linewidth: 1  // Note: Line width may not work on all platforms due to WebGL limitations
      });
    } else if (this.geometryType === GeometryType.MODEL) {
      // For models, use MeshBasicMaterial for consistent wireframe rendering
      this.material = new THREE.MeshBasicMaterial({
        color: this.color,
        wireframe: this.wireframe,
      });
    } else {
      // For other geometry types, use the standard material
      this.material = new THREE.MeshBasicMaterial({
        color: this.color,
        wireframe: this.wireframe,
      });
    }
  }
  
  /**
   * Create the mesh using the current geometry and material
   */
  private createMesh(): void {
    // Make sure we have geometry and material
    if (!this.geometry || !this.material) return;
    
    // Dispose existing mesh
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      } else if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      }
    }
    
    // Create new mesh with the geometry and material
    if (this.geometryType === GeometryType.DEBUG_AXIS) {
      // For debug axis, use LineSegments instead of Mesh
      const lineSegments = new THREE.LineSegments(this.geometry, this.material);
      this.mesh = lineSegments as unknown as THREE.Mesh;
    } else if (this.geometryType === GeometryType.GRID) {
      // For grid, use LineSegments instead of Mesh
      const lineSegments = new THREE.LineSegments(this.geometry, this.material);
      this.mesh = lineSegments as unknown as THREE.Mesh;
    } else if (this.skeleton && this.geometryType === GeometryType.MODEL) {
      // Create a skinned mesh for models with skeletons
      console.log('Creating SkinnedMesh with skeleton');
      const skinnedMesh = new THREE.SkinnedMesh(this.geometry, this.material);
      
      // Bind the skeleton to the mesh
      skinnedMesh.bind(this.skeleton, skinnedMesh.matrixWorld);
      
      // If we have a root bone, add it to the mesh
      if (this.rootBone) {
        console.log('Adding root bone to SkinnedMesh');
        skinnedMesh.add(this.rootBone);
      }
      
      this.mesh = skinnedMesh;
    } else {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    }
    
    // Set the name
    this.mesh.name = 'mesh_' + this.geometryType;
  }
  
  /**
   * Update the mesh with current settings
   */
  public updateMesh(): void {
    this.createGeometry();
    this.createMaterial();
    
    if (this.mesh) {
      // Update existing mesh with new geometry and material
      this.mesh.geometry = this.geometry!;
      this.mesh.material = this.material!;
    } else {
      // Create new mesh
      this.createMesh();
    }
    
    // Update ThreeObject if entity has one
    const entity = this.entity;
    if (entity && this.mesh) {
      const threeObject = entity.getComponent(ThreeObject);
      if (threeObject) {
        threeObject.setObject(this.mesh);
      }
    }
  }
  
  /**
   * Set the geometry directly (for use with model geometries)
   * @param geometry The BufferGeometry to use
   */
  public setGeometry(geometry: THREE.BufferGeometry): void {
    // Dispose existing geometry
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    // Set the new geometry
    this.geometry = geometry;
    
    // Update or create material if needed
    if (!this.material) {
      this.createMaterial();
    }
    
    // Update or create the mesh
    if (this.mesh) {
      this.mesh.geometry = this.geometry;
      
      // If we have a skeleton and this is a SkinnedMesh, rebind it
      if (this.skeleton && this.mesh instanceof THREE.SkinnedMesh) {
        this.mesh.bind(this.skeleton, this.mesh.matrixWorld);
      }
    } else {
      this.createMesh();
    }
    
    // Update ThreeObject if entity has one
    const entity = this.entity;
    if (entity && this.mesh) {
      const threeObject = entity.getComponent(ThreeObject);
      if (threeObject) {
        threeObject.setObject(this.mesh);
      }
    }
  }
  
  /**
   * Set the skeleton for this mesh
   * @param skeleton The skeleton to use
   * @param rootBone Optional root bone
   */
  public setSkeleton(skeleton: THREE.Skeleton, rootBone?: THREE.Bone): void {
    this.skeleton = skeleton;
    
    if (rootBone) {
      this.rootBone = rootBone;
    }
    
    // If we already have a mesh, recreate it to use the skeleton
    if (this.mesh) {
      this.createMesh();
      
      // Update ThreeObject if entity has one
      const entity = this.entity;
      if (entity) {
        const threeObject = entity.getComponent(ThreeObject);
        if (threeObject) {
          threeObject.setObject(this.mesh);
        }
      }
    }
  }
  
  /**
   * Get the current skeleton
   * @returns The skeleton or null if none
   */
  public getSkeleton(): THREE.Skeleton | null {
    return this.skeleton;
  }
  
  /**
   * Check if this mesh has a skeleton
   * @returns True if this mesh has a skeleton
   */
  public hasSkeleton(): boolean {
    return this.skeleton !== null;
  }
  
  /**
   * Dispose resources when no longer needed
   */
  private dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    
    this.mesh = null;
    this.skeleton = null;
    this.rootBone = null;
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      geometryType: this.geometryType,
      wireframe: this.wireframe,
      color: this.color,
      size: { ...this.size },
      radius: this.radius,
      segments: this.segments,
      hasSkeleton: this.skeleton !== null,
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const meshData = data as Record<string, any>;
    
    // Restore properties
    if (meshData.geometryType) this.geometryType = meshData.geometryType;
    if (typeof meshData.wireframe === 'boolean') this.wireframe = meshData.wireframe;
    if (typeof meshData.color === 'number') this.color = meshData.color;
    
    // Restore size
    if (meshData.size && typeof meshData.size === 'object') {
      if (typeof meshData.size.width === 'number') this.size.width = meshData.size.width;
      if (typeof meshData.size.height === 'number') this.size.height = meshData.size.height;
      if (typeof meshData.size.depth === 'number') this.size.depth = meshData.size.depth;
    }
    
    // Restore other parameters
    if (typeof meshData.radius === 'number') this.radius = meshData.radius;
    if (typeof meshData.segments === 'number') this.segments = meshData.segments;
    
    // Note: We don't restore the skeleton from serialization
    // Skeletons are complex objects that should be loaded from the model
    // The actual skeleton will need to be set using setSkeleton after deserialization
    
    // Recreate the mesh with restored properties
    this.updateMesh();
  }
} 
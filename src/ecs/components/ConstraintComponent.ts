import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { Transform, Vector3, Rotation } from './Transform';

/**
 * Enum defining constraint types
 */
export enum ConstraintType {
  TRACK_TO = 'trackTo',
  LOOK_AT = 'lookAt',
  COPY_TRANSFORM = 'copyTransform',
  LIMIT = 'limit',
  DISTANCE = 'distance',
  LOCK = 'lock',
  PATH_FOLLOW = 'pathFollow',
  ORIENT = 'orient',
  PIVOT = 'pivot',
  SPRING = 'spring',
  FLOOR = 'floor'
}

/**
 * Enum for defining the coordinate axes
 */
export enum Axis {
  POSITIVE_X = 'posX',
  NEGATIVE_X = 'negX',
  POSITIVE_Y = 'posY',
  NEGATIVE_Y = 'negY',
  POSITIVE_Z = 'posZ',
  NEGATIVE_Z = 'negZ'
}

/**
 * Export the TrackAxis and UpAxis as aliases of Axis for backward compatibility
 */
export type TrackAxis = Axis;
export type UpAxis = Axis;

// Export the enum values directly
export const TrackAxis = Axis;
export const UpAxis = Axis;

/**
 * Enum for specifying which transform components to copy
 */
export enum TransformComponent {
  POSITION = 'position',
  ROTATION = 'rotation',
  SCALE = 'scale',
  ALL = 'all'
}

/**
 * Base interface for all constraints
 */
export interface Constraint {
  type: ConstraintType;
  enabled: boolean;
  priority: number; // Higher priority constraints are applied first (default is 0)
  influence: number; // How much the constraint affects the transform (0-1)
}

/**
 * TrackTo constraint makes an entity point toward a target
 */
export interface TrackToConstraint extends Constraint {
  targetEntityId: number | null; // ID of the target entity
  trackAxis: Axis; // Which local axis points to the target
  upAxis: Axis; // Which local axis aligns with the global up vector
  offset: THREE.Euler; // Additional offset rotation applied after tracking
}

/**
 * LookAt constraint makes an entity look directly at a target
 * Simpler version of TrackTo without the up axis configuration
 */
export interface LookAtConstraint extends Constraint {
  targetEntityId: number | null; // ID of the target entity
  offset: THREE.Euler; // Additional offset rotation applied after looking
}

/**
 * CopyTransform constraint copies transform properties from another entity
 */
export interface CopyTransformConstraint extends Constraint {
  sourceEntityId: number | null; // ID of the source entity
  components: TransformComponent[]; // Which components to copy
  offset: {
    position?: Vector3; // Position offset
    rotation?: Rotation; // Rotation offset
    scale?: Vector3; // Scale offset
  };
  mixWeight: number; // How much to blend between original and copied (0-1)
}

/**
 * Limit constraint restricts transform values within boundaries
 */
export interface LimitConstraint extends Constraint {
  position?: {
    min?: Vector3; // Minimum position values
    max?: Vector3; // Maximum position values
  };
  rotation?: {
    min?: Rotation; // Minimum rotation values
    max?: Rotation; // Maximum rotation values
  };
  scale?: {
    min?: Vector3; // Minimum scale values
    max?: Vector3; // Maximum scale values
  };
}

/**
 * Distance constraint maintains a specific distance from a target
 */
export interface DistanceConstraint extends Constraint {
  targetEntityId: number | null; // ID of the target entity
  minDistance?: number; // Minimum distance to maintain
  maxDistance?: number; // Maximum distance to maintain
  springiness?: number; // How springy the constraint is (0-1)
}

/**
 * Lock constraint prevents changes to specific transform components
 */
export interface LockConstraint extends Constraint {
  position?: boolean[]; // Lock X, Y, Z position [x, y, z]
  rotation?: boolean[]; // Lock X, Y, Z rotation [x, y, z]
  scale?: boolean[]; // Lock X, Y, Z scale [x, y, z]
  initialPosition?: Vector3; // Initial position to lock to
  initialRotation?: Rotation; // Initial rotation to lock to
  initialScale?: Vector3; // Initial scale to lock to
}

/**
 * Path point on a 3D path
 */
export interface PathPoint {
  position: Vector3;
  rotation?: Rotation;
  handleIn?: Vector3; // For curved paths
  handleOut?: Vector3; // For curved paths
}

/**
 * PathFollow constraint makes an entity follow a predefined path
 */
export interface PathFollowConstraint extends Constraint {
  path: PathPoint[]; // Array of points defining the path
  loop: boolean; // Whether the path loops
  speed: number; // Movement speed along the path
  currentDistance: number; // Current distance traveled along the path
  alignToPath: boolean; // Whether to align rotation to the path's direction
}

/**
 * Orient constraint matches the orientation of another entity
 */
export interface OrientConstraint extends Constraint {
  targetEntityId: number | null; // ID of the target entity
  offset: Rotation; // Rotation offset
  mixWeight: number; // How much to blend between original and target rotation (0-1)
}

/**
 * Pivot constraint makes an entity rotate around a defined point
 */
export interface PivotConstraint extends Constraint {
  pivot: Vector3; // Pivot point in world space
  rotationAxis: Axis; // Axis to rotate around
  rotationSpeed: number; // Rotation speed in degrees per second
  radius: number; // Distance from pivot
  currentAngle: number; // Current angle in degrees
}

/**
 * Spring constraint creates a springy connection between entities
 */
export interface SpringConstraint extends Constraint {
  targetEntityId: number | null; // ID of the target entity
  restLength: number; // Rest length of the spring
  stiffness: number; // Spring stiffness
  damping: number; // Spring damping
}

/**
 * Floor constraint keeps an entity above a certain height
 */
export interface FloorConstraint extends Constraint {
  height: number; // Floor height
  bounceAmount: number; // How much to bounce when hitting the floor
  offset: number; // Additional height offset (e.g., for entity radius)
}

/**
 * Component that applies constraints to an entity's transform
 */
export class ConstraintComponent extends BaseComponent {
  /**
   * List of constraints applied to this entity
   */
  private constraints: Constraint[] = [];
  
  /**
   * Require Transform component
   */
  public static override getRequirements(): ComponentClass[] {
    return [Transform];
  }
  
  /**
   * Add a TrackTo constraint
   * @param targetEntityId The entity to track
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addTrackTo(
    targetEntityId: number,
    options: {
      trackAxis?: Axis,
      upAxis?: Axis,
      offset?: THREE.Euler,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: TrackToConstraint = {
      type: ConstraintType.TRACK_TO,
      targetEntityId,
      trackAxis: options.trackAxis || Axis.NEGATIVE_Z, // -Z is forward in many systems
      upAxis: options.upAxis || Axis.POSITIVE_Y, // Y is typically up in local space
      offset: options.offset || new THREE.Euler(0, 0, 0),
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a LookAt constraint
   * @param targetEntityId The entity to look at
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addLookAt(
    targetEntityId: number,
    options: {
      offset?: THREE.Euler,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: LookAtConstraint = {
      type: ConstraintType.LOOK_AT,
      targetEntityId,
      offset: options.offset || new THREE.Euler(0, 0, 0),
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a CopyTransform constraint
   * @param sourceEntityId The entity to copy from
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addCopyTransform(
    sourceEntityId: number,
    options: {
      components?: TransformComponent[],
      offset?: {
        position?: Vector3,
        rotation?: Rotation,
        scale?: Vector3
      },
      mixWeight?: number,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: CopyTransformConstraint = {
      type: ConstraintType.COPY_TRANSFORM,
      sourceEntityId,
      components: options.components || [TransformComponent.ALL],
      offset: options.offset || {},
      mixWeight: options.mixWeight !== undefined ? options.mixWeight : 1.0,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a Limit constraint
   * @param options Limit configuration
   * @returns This component for method chaining
   */
  public addLimit(
    options: {
      position?: {
        min?: Vector3,
        max?: Vector3
      },
      rotation?: {
        min?: Rotation,
        max?: Rotation
      },
      scale?: {
        min?: Vector3,
        max?: Vector3
      },
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: LimitConstraint = {
      type: ConstraintType.LIMIT,
      position: options.position,
      rotation: options.rotation,
      scale: options.scale,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a Distance constraint
   * @param targetEntityId The entity to maintain distance from
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addDistance(
    targetEntityId: number,
    options: {
      minDistance?: number,
      maxDistance?: number,
      springiness?: number,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: DistanceConstraint = {
      type: ConstraintType.DISTANCE,
      targetEntityId,
      minDistance: options.minDistance,
      maxDistance: options.maxDistance,
      springiness: options.springiness !== undefined ? options.springiness : 0.5,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a Lock constraint
   * @param options Lock configuration
   * @returns This component for method chaining
   */
  public addLock(
    options: {
      position?: boolean[],
      rotation?: boolean[],
      scale?: boolean[],
      initialPosition?: Vector3,
      initialRotation?: Rotation, 
      initialScale?: Vector3,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: LockConstraint = {
      type: ConstraintType.LOCK,
      position: options.position,
      rotation: options.rotation,
      scale: options.scale,
      initialPosition: options.initialPosition ? new Vector3().copy(options.initialPosition) : undefined,
      initialRotation: options.initialRotation ? new Rotation().copy(options.initialRotation) : undefined,
      initialScale: options.initialScale ? new Vector3().copy(options.initialScale) : undefined,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a PathFollow constraint
   * @param path Array of points defining the path
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addPathFollow(
    path: PathPoint[],
    options: {
      loop?: boolean,
      speed?: number,
      alignToPath?: boolean,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: PathFollowConstraint = {
      type: ConstraintType.PATH_FOLLOW,
      path,
      loop: options.loop !== undefined ? options.loop : false,
      speed: options.speed !== undefined ? options.speed : 1.0,
      currentDistance: 0,
      alignToPath: options.alignToPath !== undefined ? options.alignToPath : true,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add an Orient constraint
   * @param targetEntityId The entity to orient to
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addOrient(
    targetEntityId: number,
    options: {
      offset?: Rotation,
      mixWeight?: number,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: OrientConstraint = {
      type: ConstraintType.ORIENT,
      targetEntityId,
      offset: options.offset || new Rotation(0, 0, 0),
      mixWeight: options.mixWeight !== undefined ? options.mixWeight : 1.0,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a Pivot constraint
   * @param pivot Pivot point in world space
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addPivot(
    pivot: Vector3,
    options: {
      rotationAxis?: Axis,
      rotationSpeed?: number,
      radius?: number,
      currentAngle?: number,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: PivotConstraint = {
      type: ConstraintType.PIVOT,
      pivot,
      rotationAxis: options.rotationAxis || Axis.POSITIVE_Y,
      rotationSpeed: options.rotationSpeed !== undefined ? options.rotationSpeed : 90,
      radius: options.radius !== undefined ? options.radius : 1.0,
      currentAngle: options.currentAngle !== undefined ? options.currentAngle : 0,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a Spring constraint
   * @param targetEntityId The entity to connect with a spring
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addSpring(
    targetEntityId: number,
    options: {
      restLength?: number,
      stiffness?: number,
      damping?: number,
      enabled?: boolean
    } = {}
  ): this {
    const constraint: SpringConstraint = {
      type: ConstraintType.SPRING,
      targetEntityId,
      restLength: options.restLength !== undefined ? options.restLength : 1.0,
      stiffness: options.stiffness !== undefined ? options.stiffness : 0.5,
      damping: options.damping !== undefined ? options.damping : 0.3,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: 0,
      influence: 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add a Floor constraint
   * @param height Floor height
   * @param options Additional options
   * @returns This component for method chaining
   */
  public addFloor(
    height: number,
    options: {
      bounceAmount?: number,
      offset?: number,
      enabled?: boolean,
      priority?: number,
      influence?: number
    } = {}
  ): this {
    const constraint: FloorConstraint = {
      type: ConstraintType.FLOOR,
      height,
      bounceAmount: options.bounceAmount !== undefined ? options.bounceAmount : 0,
      offset: options.offset !== undefined ? options.offset : 0,
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority !== undefined ? options.priority : 0,
      influence: options.influence !== undefined ? options.influence : 1.0
    };
    
    this.constraints.push(constraint);
    return this;
  }
  
  /**
   * Get all constraints
   */
  public getConstraints(): Constraint[] {
    return this.constraints;
  }
  
  /**
   * Get all constraints of a specific type
   * @param type The constraint type
   */
  public getConstraintsByType<T extends Constraint>(type: ConstraintType): T[] {
    return this.constraints.filter(
      constraint => constraint.type === type
    ) as T[];
  }
  
  /**
   * Get TrackTo constraints
   */
  public getTrackToConstraints(): TrackToConstraint[] {
    return this.getConstraintsByType<TrackToConstraint>(ConstraintType.TRACK_TO);
  }

  /**
   * Get LookAt constraints
   */
  public getLookAtConstraints(): LookAtConstraint[] {
    return this.getConstraintsByType<LookAtConstraint>(ConstraintType.LOOK_AT);
  }

  /**
   * Get CopyTransform constraints
   */
  public getCopyTransformConstraints(): CopyTransformConstraint[] {
    return this.getConstraintsByType<CopyTransformConstraint>(ConstraintType.COPY_TRANSFORM);
  }

  /**
   * Get Limit constraints
   */
  public getLimitConstraints(): LimitConstraint[] {
    return this.getConstraintsByType<LimitConstraint>(ConstraintType.LIMIT);
  }

  /**
   * Get Distance constraints
   */
  public getDistanceConstraints(): DistanceConstraint[] {
    return this.getConstraintsByType<DistanceConstraint>(ConstraintType.DISTANCE);
  }

  /**
   * Get Lock constraints
   */
  public getLockConstraints(): LockConstraint[] {
    return this.getConstraintsByType<LockConstraint>(ConstraintType.LOCK);
  }

  /**
   * Get PathFollow constraints
   */
  public getPathFollowConstraints(): PathFollowConstraint[] {
    return this.getConstraintsByType<PathFollowConstraint>(ConstraintType.PATH_FOLLOW);
  }

  /**
   * Get Orient constraints
   */
  public getOrientConstraints(): OrientConstraint[] {
    return this.getConstraintsByType<OrientConstraint>(ConstraintType.ORIENT);
  }

  /**
   * Get Pivot constraints
   */
  public getPivotConstraints(): PivotConstraint[] {
    return this.getConstraintsByType<PivotConstraint>(ConstraintType.PIVOT);
  }

  /**
   * Get Spring constraints
   */
  public getSpringConstraints(): SpringConstraint[] {
    return this.getConstraintsByType<SpringConstraint>(ConstraintType.SPRING);
  }

  /**
   * Get Floor constraints
   */
  public getFloorConstraints(): FloorConstraint[] {
    return this.getConstraintsByType<FloorConstraint>(ConstraintType.FLOOR);
  }
  
  /**
   * Enable or disable a constraint
   * @param index Index of the constraint
   * @param enabled Whether the constraint is enabled
   */
  public setConstraintEnabled(index: number, enabled: boolean): void {
    if (index >= 0 && index < this.constraints.length) {
      const constraint = this.constraints[index];
      
      // Update enabled state
      constraint.enabled = enabled;
      
      // If enabling a Lock constraint, update initial transform values from the entity this component is attached to
      if (enabled && constraint.type === ConstraintType.LOCK && this.entity) {
        const lockConstraint = constraint as LockConstraint;
        const transform = this.entity.getComponent(Transform);
        
        if (transform) {
          // Update initial position, rotation, and scale to current values
          lockConstraint.initialPosition = new Vector3(
            transform.position.x, 
            transform.position.y, 
            transform.position.z
          );
          
          lockConstraint.initialRotation = new Rotation(
            transform.rotation.x, 
            transform.rotation.y, 
            transform.rotation.z
          );
          
          lockConstraint.initialScale = new Vector3(
            transform.scale.x, 
            transform.scale.y, 
            transform.scale.z
          );
        }
      }
    }
  }
  
  /**
   * Remove a constraint
   * @param index Index of the constraint to remove
   */
  public removeConstraint(index: number): void {
    if (index >= 0 && index < this.constraints.length) {
      this.constraints.splice(index, 1);
    }
  }
  
  /**
   * Clear all constraints
   */
  public clearConstraints(): void {
    this.constraints = [];
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      constraints: this.constraints.map(constraint => {
        // Handle serialization for each constraint type
        switch (constraint.type) {
          case ConstraintType.TRACK_TO:
            const trackTo = constraint as TrackToConstraint;
            return {
              type: trackTo.type,
              enabled: trackTo.enabled,
              targetEntityId: trackTo.targetEntityId,
              trackAxis: trackTo.trackAxis,
              upAxis: trackTo.upAxis,
              offset: {
                x: trackTo.offset.x,
                y: trackTo.offset.y,
                z: trackTo.offset.z
              },
              priority: trackTo.priority,
              influence: trackTo.influence
            };
            
          case ConstraintType.LOOK_AT:
            const lookAt = constraint as LookAtConstraint;
            return {
              type: lookAt.type,
              enabled: lookAt.enabled,
              targetEntityId: lookAt.targetEntityId,
              offset: {
                x: lookAt.offset.x,
                y: lookAt.offset.y,
                z: lookAt.offset.z
              },
              priority: lookAt.priority,
              influence: lookAt.influence
            };
            
          // Serialize other constraint types similarly
          // For brevity, we're just returning a basic version for the others
          default:
            return {
              type: constraint.type,
              enabled: constraint.enabled,
              priority: constraint.priority,
              influence: constraint.influence
            };
        }
      })
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const componentData = data as Record<string, unknown>;
    const constraintsData = componentData.constraints as unknown[];
    
    if (!Array.isArray(constraintsData)) return;
    
    this.constraints = [];
    
    for (const constraintData of constraintsData) {
      if (typeof constraintData !== 'object' || constraintData === null) continue;
      
      const cData = constraintData as Record<string, unknown>;
      const type = cData.type as ConstraintType;
      
      // Handle deserialization for each constraint type
      switch (type) {
        case ConstraintType.TRACK_TO:
          const offsetData = cData.offset as Record<string, number>;
          
          const trackTo: TrackToConstraint = {
            type: ConstraintType.TRACK_TO,
            enabled: cData.enabled as boolean,
            targetEntityId: cData.targetEntityId as number,
            trackAxis: cData.trackAxis as Axis,
            upAxis: cData.upAxis as Axis,
            offset: new THREE.Euler(
              offsetData.x,
              offsetData.y,
              offsetData.z
            ),
            priority: cData.priority as number,
            influence: cData.influence as number
          };
          
          this.constraints.push(trackTo);
          break;
          
        case ConstraintType.LOOK_AT:
          const lookAtOffsetData = cData.offset as Record<string, number>;
          
          const lookAt: LookAtConstraint = {
            type: ConstraintType.LOOK_AT,
            enabled: cData.enabled as boolean,
            targetEntityId: cData.targetEntityId as number,
            offset: new THREE.Euler(
              lookAtOffsetData.x,
              lookAtOffsetData.y,
              lookAtOffsetData.z
            ),
            priority: cData.priority as number,
            influence: cData.influence as number
          };
          
          this.constraints.push(lookAt);
          break;
          
        // Add deserialization for other constraint types as needed
        // For now, we're only supporting basic deserialization
      }
    }
  }
} 
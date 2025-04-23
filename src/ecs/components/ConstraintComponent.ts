import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from './ThreeObject';
import { CurveComponent } from './CurveComponent';

/**
 * Types of constraints that can be applied to entities
 */
export enum ConstraintType {
  TRACK_TO = 'trackTo',
  PATH_FOLLOW = 'pathFollow',
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
  trackAxis: THREE.Vector3; // Which local axis points to the target
  upAxis: THREE.Vector3; // Which axis aligns with the world up vector
  offset: THREE.Euler; // Additional offset rotation applied after tracking
}

/**
 * PathFollow constraint makes an entity follow a path defined by a CurveComponent
 */
export interface PathFollowConstraint extends Constraint {
  pathEntityId: number; // ID of the entity with the CurveComponent
  distance: number; // Distance along the path (0-1)
  rotateToFace: boolean; // Whether entity should rotate to face movement direction
  trackAxis: THREE.Vector3; // Which local axis should align with the path direction
  upAxis: THREE.Vector3; // Which axis aligns with the world up vector
  loop: boolean; // Whether to loop back to the start when reaching the end
  offset: THREE.Vector3; // Optional offset from the path
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
   * Requires ThreeObject to have something to constrain
   */
  public static override getRequirements(): ComponentClass[] {
    return [ThreeObject];
  }

  /**
   * Constructor
   */
  constructor() {
    super();
  }

  /**
   * Add a constraint to this component
   * @param constraint The constraint to add
   */
  public addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
    
    // Sort constraints by priority (higher first)
    this.constraints.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a constraint by type
   * @param type The type of constraint to remove
   * @returns True if a constraint was removed
   */
  public removeConstraint(type: ConstraintType): boolean {
    const initialLength = this.constraints.length;
    this.constraints = this.constraints.filter(c => c.type !== type);
    return this.constraints.length !== initialLength;
  }

  /**
   * Get all constraints
   */
  public getConstraints(): Constraint[] {
    return this.constraints;
  }

  /**
   * Get constraints of a specific type
   * @param type The type of constraints to get
   */
  public getConstraintsByType<T extends Constraint>(type: ConstraintType): T[] {
    return this.constraints.filter(c => c.type === type) as T[];
  }

  /**
   * Create a TrackTo constraint
   * @param targetEntityId The entity to track
   * @param trackAxis Which axis should point to the target (defaults to -Z forward)
   * @param upAxis Which axis should align with the world up vector (defaults to +Y up)
   * @param influence How much influence the constraint has (0-1)
   * @param priority Priority of the constraint (higher = applied first)
   * @param offset Additional rotation offset
   * @returns The created constraint
   */
  public createTrackToConstraint(
    targetEntityId: number,
    trackAxis: THREE.Vector3 = new THREE.Vector3(0, 0, -1), // Default to -Z (forward)
    upAxis: THREE.Vector3 = new THREE.Vector3(0, 1, 0), // Default to +Y (up)
    influence: number = 1.0,
    priority: number = 0,
    offset: THREE.Euler = new THREE.Euler()
  ): TrackToConstraint {
    // Make sure the vectors are normalized
    const normalizedTrackAxis = trackAxis.clone().normalize();
    const normalizedUpAxis = upAxis.clone().normalize();
    
    const constraint: TrackToConstraint = {
      type: ConstraintType.TRACK_TO,
      enabled: true,
      priority,
      influence,
      targetEntityId,
      trackAxis: normalizedTrackAxis,
      upAxis: normalizedUpAxis,
      offset
    };
    
    this.addConstraint(constraint);
    return constraint;
  }

  /**
   * Create a PathFollow constraint that follows a path defined by a CurveComponent
   * @param pathEntityId ID of the entity with the CurveComponent
   * @param distance Initial distance along the path (0-1)
   * @param rotateToFace Whether entity should rotate to face movement direction
   * @param trackAxis Which axis should align with the path direction (defaults to -Z forward)
   * @param upAxis Which axis should align with the world up vector (defaults to +Y up)
   * @param loop Whether to loop when reaching the end of the path
   * @param offset Optional offset from the path
   * @param influence How much influence the constraint has (0-1)
   * @param priority Priority of the constraint (higher = applied first)
   * @returns The created constraint
   */
  public createPathFollowConstraint(
    pathEntityId: number,
    distance: number = 0,
    rotateToFace: boolean = true,
    trackAxis: THREE.Vector3 = new THREE.Vector3(0, 0, -1), // Default to -Z (forward)
    upAxis: THREE.Vector3 = new THREE.Vector3(0, 1, 0), // Default to +Y (up)
    loop: boolean = true,
    offset: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    influence: number = 1.0,
    priority: number = 0
  ): PathFollowConstraint {
    // Make sure the vectors are normalized
    const normalizedTrackAxis = trackAxis.clone().normalize();
    const normalizedUpAxis = upAxis.clone().normalize();
    
    const constraint: PathFollowConstraint = {
      type: ConstraintType.PATH_FOLLOW,
      enabled: true,
      priority,
      influence,
      pathEntityId,
      distance: Math.max(0, Math.min(1, distance)), // Clamp to 0-1
      rotateToFace,
      trackAxis: normalizedTrackAxis,
      upAxis: normalizedUpAxis,
      loop,
      offset: offset.clone()
    };
    
    this.addConstraint(constraint);
    return constraint;
  }
  
  /**
   * Update the distance along the path for a PathFollow constraint
   * @param distance New distance along the path (0-1)
   * @returns True if the constraint was found and updated
   */
  public updatePathDistance(distance: number): boolean {
    const pathConstraints = this.getConstraintsByType<PathFollowConstraint>(ConstraintType.PATH_FOLLOW);
    if (pathConstraints.length === 0) return false;
    
    // Update the first path constraint found (most common case)
    pathConstraints[0].distance = distance;
    return true;
  }
  
  /**
   * Get the current distance along the path for the first PathFollow constraint
   * @returns The current distance (0-1) or -1 if no constraint found
   */
  public getPathDistance(): number {
    const pathConstraints = this.getConstraintsByType<PathFollowConstraint>(ConstraintType.PATH_FOLLOW);
    if (pathConstraints.length === 0) return -1;
    
    return pathConstraints[0].distance;
  }

  /**
   * Set whether the PathFollow constraint should loop when reaching the end
   * @param loop Whether the path should loop
   * @returns True if the constraint was found and updated
   */
  public setLooping(loop: boolean): boolean {
    const pathConstraints = this.getConstraintsByType<PathFollowConstraint>(ConstraintType.PATH_FOLLOW);
    if (pathConstraints.length === 0) return false;
    
    // Update all path constraints
    for (const constraint of pathConstraints) {
      constraint.loop = loop;
    }
    
    return true;
  }

  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      constraints: this.constraints.map(c => {
        // Handle Euler and Vector3 serialization
        if (c.type === ConstraintType.TRACK_TO) {
          const trackTo = c as TrackToConstraint;
          return {
            ...trackTo,
            trackAxis: {
              x: trackTo.trackAxis.x,
              y: trackTo.trackAxis.y,
              z: trackTo.trackAxis.z
            },
            upAxis: {
              x: trackTo.upAxis.x,
              y: trackTo.upAxis.y,
              z: trackTo.upAxis.z
            },
            offset: {
              x: trackTo.offset.x,
              y: trackTo.offset.y,
              z: trackTo.offset.z,
              order: trackTo.offset.order
            }
          };
        } else if (c.type === ConstraintType.PATH_FOLLOW) {
          const pathFollow = c as PathFollowConstraint;
          return {
            ...pathFollow,
            trackAxis: {
              x: pathFollow.trackAxis.x,
              y: pathFollow.trackAxis.y,
              z: pathFollow.trackAxis.z
            },
            upAxis: {
              x: pathFollow.upAxis.x,
              y: pathFollow.upAxis.y,
              z: pathFollow.upAxis.z
            },
            offset: {
              x: pathFollow.offset.x,
              y: pathFollow.offset.y,
              z: pathFollow.offset.z
            }
          };
        }
        return c;
      })
    };
  }

  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const constraintData = data as Record<string, any>;
    
    if (Array.isArray(constraintData.constraints)) {
      this.constraints = [];
      
      for (const constraintItem of constraintData.constraints) {
        if (constraintItem.type === ConstraintType.TRACK_TO) {
          // Convert Vector3 data back to THREE.Vector3
          const trackAxis = new THREE.Vector3(
            constraintItem.trackAxis.x,
            constraintItem.trackAxis.y,
            constraintItem.trackAxis.z
          );
          
          const upAxis = new THREE.Vector3(
            constraintItem.upAxis.x,
            constraintItem.upAxis.y,
            constraintItem.upAxis.z
          );
          
          // Convert offset data back to THREE.Euler
          const offset = new THREE.Euler(
            constraintItem.offset.x,
            constraintItem.offset.y,
            constraintItem.offset.z,
            constraintItem.offset.order || 'XYZ'
          );
          
          this.addConstraint({
            ...constraintItem,
            trackAxis,
            upAxis,
            offset
          });
        } else if (constraintItem.type === ConstraintType.PATH_FOLLOW) {
          // Convert Vector3 data back to THREE.Vector3
          const trackAxis = new THREE.Vector3(
            constraintItem.trackAxis?.x || 0,
            constraintItem.trackAxis?.y || 0,
            constraintItem.trackAxis?.z || -1
          );
          
          const upAxis = new THREE.Vector3(
            constraintItem.upAxis?.x || 0,
            constraintItem.upAxis?.y || 1,
            constraintItem.upAxis?.z || 0
          );
          
          const offset = new THREE.Vector3(
            constraintItem.offset?.x || 0,
            constraintItem.offset?.y || 0,
            constraintItem.offset?.z || 0
          );
          
          this.addConstraint({
            ...constraintItem,
            trackAxis,
            upAxis,
            offset
          });
        }
      }
    }
  }
} 
import * as THREE from 'three';
import { IEntity, ISystem, IWorld, ComponentClass } from '../types';
import {
  ConstraintComponent,
  ConstraintType,
  TrackToConstraint,
  LookAtConstraint,
  CopyTransformConstraint,
  LimitConstraint,
  DistanceConstraint,
  LockConstraint,
  PathFollowConstraint,
  OrientConstraint,
  PivotConstraint,
  SpringConstraint,
  FloorConstraint,
  Axis,
  TransformComponent
} from '../components/ConstraintComponent';
import { Transform, Vector3, Rotation } from '../components/Transform';
import { MeshComponent, GeometryType } from '../components/MeshComponent';

/**
 * Simple velocity component for physics-based constraints
 */
interface IVelocityLike {
  x: number;
  y: number;
  z: number;
}

/**
 * System that processes constraints on entity transforms
 */
export class ConstraintSystem implements ISystem {
  /**
   * Unique ID for this system
   */
  readonly id: number = Math.floor(Math.random() * 1000000);
  
  /**
   * Priority of this system
   * This should run after physics but before camera and render systems
   */
  readonly priority: number = 300;
  
  /**
   * Whether this system is enabled
   */
  enabled: boolean = true;
  
  /**
   * Reference to the world
   */
  private world!: IWorld;
  
  /**
   * Temporary vectors and quaternions for calculations
   * Reused to avoid garbage collection
   */
  private tmpVec1 = new THREE.Vector3();
  private tmpVec2 = new THREE.Vector3();
  private tmpVec3 = new THREE.Vector3();
  private tmpVec4 = new THREE.Vector3();
  private tmpQuat = new THREE.Quaternion();
  private tmpQuat2 = new THREE.Quaternion();
  private tmpMat = new THREE.Matrix4();
  private tmpEuler = new THREE.Euler();
  private tmpMat2 = new THREE.Matrix4();
  
  /**
   * World up vector - Y-up is the standard in most 3D applications
   */
  private worldUp = new THREE.Vector3(0, 1, 0);

  /**
   * For time-based constraints
   */
  private lastUpdateTime: number = 0;
  
  /**
   * Initialize the system
   * @param world The world this system belongs to
   */
  initialize(world: IWorld): void {
    this.world = world;
    this.lastUpdateTime = performance.now() / 1000;
    console.log('ConstraintSystem initialized');
  }
  
  /**
   * Update the system
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Get all entities with ConstraintComponent and Transform
    // Use any to bypass type checking since we know these components exist
    const constraintComponentClass = ConstraintComponent as unknown as ComponentClass;
    const transformClass = Transform as unknown as ComponentClass;
    const entities = this.world.query(constraintComponentClass, transformClass);
    
    // Update current time for time-based constraints
    const currentTime = performance.now() / 1000;
    const realDeltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Process each entity's constraints
    for (const entity of entities) {
      this.processEntityConstraints(entity, realDeltaTime);
    }
  }
  
  /**
   * Process all constraints for an entity
   * @param entity The entity to process
   * @param deltaTime Time elapsed since last update
   */
  private processEntityConstraints(entity: IEntity, deltaTime: number): void {
    const constraintComponent = entity.getComponent(ConstraintComponent)!;
    const transform = entity.getComponent(Transform)!;
    
    // Store original transform values in case we need to blend or revert
    const originalPosition = new Vector3().copy(transform.position);
    const originalRotation = new Rotation().copy(transform.rotation);
    const originalScale = new Vector3().copy(transform.scale);
    
    // Get all enabled constraints and sort them by priority (higher priority first)
    const allConstraints = constraintComponent.getConstraints()
      .filter(c => c.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    // Process all constraints in priority order
    for (const constraint of allConstraints) {
      switch (constraint.type) {
        case ConstraintType.FLOOR:
          this.applyFloorConstraint(entity, transform, constraint as FloorConstraint);
          break;
          
        case ConstraintType.PATH_FOLLOW:
          this.applyPathFollowConstraint(entity, transform, constraint as PathFollowConstraint, deltaTime);
          break;
          
        case ConstraintType.PIVOT:
          this.applyPivotConstraint(entity, transform, constraint as PivotConstraint, deltaTime);
          break;
          
        case ConstraintType.DISTANCE:
          this.applyDistanceConstraint(entity, transform, constraint as DistanceConstraint);
          break;
          
        case ConstraintType.SPRING:
          this.applySpringConstraint(entity, transform, constraint as SpringConstraint, deltaTime);
          break;
          
        case ConstraintType.COPY_TRANSFORM:
          this.applyCopyTransformConstraint(entity, transform, constraint as CopyTransformConstraint);
          break;
          
        case ConstraintType.LOCK:
          this.applyLockConstraint(entity, transform, constraint as LockConstraint, originalPosition, originalRotation, originalScale);
          break;
          
        case ConstraintType.LIMIT:
          this.applyLimitConstraint(entity, transform, constraint as LimitConstraint);
          break;
          
        case ConstraintType.ORIENT:
          this.applyOrientConstraint(entity, transform, constraint as OrientConstraint, originalRotation);
          break;
          
        case ConstraintType.LOOK_AT:
          this.applyLookAtConstraint(entity, transform, constraint as LookAtConstraint);
          break;
          
        case ConstraintType.TRACK_TO:
          this.applyTrackToConstraint(entity, transform, constraint as TrackToConstraint);
          break;
      }
    }
  }
  
  /**
   * Convert a Vector3 from our ECS to Three.js Vector3
   */
  private toThreeVector(v: { x: number, y: number, z: number }): THREE.Vector3 {
    return new THREE.Vector3(v.x, v.y, v.z);
  }
  
  /**
   * Convert Rotation (in degrees) to Three.js Euler (in radians)
   */
  private toThreeEuler(r: { x: number, y: number, z: number }): THREE.Euler {
    const toRad = (deg: number) => deg * (Math.PI / 180);
    return new THREE.Euler(toRad(r.x), toRad(r.y), toRad(r.z));
  }

  /**
   * Convert THREE.Euler (in radians) to our Rotation (in degrees)
   */
  private fromThreeEuler(e: THREE.Euler): Rotation {
    const toDeg = (rad: number) => rad * (180 / Math.PI);
    return new Rotation(toDeg(e.x), toDeg(e.y), toDeg(e.z));
  }

  /**
   * Apply a LookAt constraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The LookAt constraint to apply
   */
  private applyLookAtConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: LookAtConstraint
  ): void {
    // Get the target entity
    if (constraint.targetEntityId === null) return;
    
    const targetEntity = this.world.getEntity(constraint.targetEntityId);
    if (!targetEntity) return;
    
    const targetTransform = targetEntity.getComponent(Transform);
    if (!targetTransform) return;
    
    // Get source and target positions in Three.js format
    const sourcePos = this.toThreeVector(transform.position);
    const targetPos = this.toThreeVector(targetTransform.position);
    
    // Store the original rotation for blending
    const originalRotation = new Rotation().copy(transform.rotation);
    
    // Create a lookAt matrix
    this.tmpMat.identity();
    this.tmpMat.lookAt(sourcePos, targetPos, this.worldUp);
    
    // Convert to quaternion then to euler
    this.tmpQuat.setFromRotationMatrix(this.tmpMat);
    this.tmpEuler.setFromQuaternion(this.tmpQuat);
    
    // Add the offset rotation
    this.tmpEuler.x += constraint.offset.x;
    this.tmpEuler.y += constraint.offset.y;
    this.tmpEuler.z += constraint.offset.z;
    
    // Convert to our Rotation format
    const newRotation = this.fromThreeEuler(this.tmpEuler);
    
    // Apply the influence factor - blend between original and new rotation
    if (constraint.influence < 1.0) {
      // Linear interpolation between original and new rotation based on influence
      newRotation.x = originalRotation.x + (newRotation.x - originalRotation.x) * constraint.influence;
      newRotation.y = originalRotation.y + (newRotation.y - originalRotation.y) * constraint.influence;
      newRotation.z = originalRotation.z + (newRotation.z - originalRotation.z) * constraint.influence;
    }
    
    // Apply the resulting rotation
    transform.rotation.copy(newRotation);
  }

  /**
   * Apply a LimitConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Limit constraint to apply
   */
  private applyLimitConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: LimitConstraint
  ): void {
    // Store original transform for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    const originalRotation = new Rotation().copy(transform.rotation);
    const originalScale = new Vector3().copy(transform.scale);
    
    const newPosition = new Vector3().copy(transform.position);
    const newRotation = new Rotation().copy(transform.rotation);
    const newScale = new Vector3().copy(transform.scale);
    
    // Limit position
    if (constraint.position) {
      if (constraint.position.min) {
        newPosition.x = Math.max(newPosition.x, constraint.position.min.x);
        newPosition.y = Math.max(newPosition.y, constraint.position.min.y);
        newPosition.z = Math.max(newPosition.z, constraint.position.min.z);
      }
      
      if (constraint.position.max) {
        newPosition.x = Math.min(newPosition.x, constraint.position.max.x);
        newPosition.y = Math.min(newPosition.y, constraint.position.max.y);
        newPosition.z = Math.min(newPosition.z, constraint.position.max.z);
      }
    }
    
    // Limit rotation
    if (constraint.rotation) {
      if (constraint.rotation.min) {
        newRotation.x = Math.max(newRotation.x, constraint.rotation.min.x);
        newRotation.y = Math.max(newRotation.y, constraint.rotation.min.y);
        newRotation.z = Math.max(newRotation.z, constraint.rotation.min.z);
      }
      
      if (constraint.rotation.max) {
        newRotation.x = Math.min(newRotation.x, constraint.rotation.max.x);
        newRotation.y = Math.min(newRotation.y, constraint.rotation.max.y);
        newRotation.z = Math.min(newRotation.z, constraint.rotation.max.z);
      }
    }
    
    // Limit scale
    if (constraint.scale) {
      if (constraint.scale.min) {
        newScale.x = Math.max(newScale.x, constraint.scale.min.x);
        newScale.y = Math.max(newScale.y, constraint.scale.min.y);
        newScale.z = Math.max(newScale.z, constraint.scale.min.z);
      }
      
      if (constraint.scale.max) {
        newScale.x = Math.min(newScale.x, constraint.scale.max.x);
        newScale.y = Math.min(newScale.y, constraint.scale.max.y);
        newScale.z = Math.min(newScale.z, constraint.scale.max.z);
      }
    }
    
    // Apply changes with influence blending
    transform.position.x = THREE.MathUtils.lerp(originalPosition.x, newPosition.x, constraint.influence);
    transform.position.y = THREE.MathUtils.lerp(originalPosition.y, newPosition.y, constraint.influence);
    transform.position.z = THREE.MathUtils.lerp(originalPosition.z, newPosition.z, constraint.influence);
    
    transform.rotation.x = THREE.MathUtils.lerp(originalRotation.x, newRotation.x, constraint.influence);
    transform.rotation.y = THREE.MathUtils.lerp(originalRotation.y, newRotation.y, constraint.influence);
    transform.rotation.z = THREE.MathUtils.lerp(originalRotation.z, newRotation.z, constraint.influence);
    
    transform.scale.x = THREE.MathUtils.lerp(originalScale.x, newScale.x, constraint.influence);
    transform.scale.y = THREE.MathUtils.lerp(originalScale.y, newScale.y, constraint.influence);
    transform.scale.z = THREE.MathUtils.lerp(originalScale.z, newScale.z, constraint.influence);
  }

  /**
   * Apply a LockConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Lock constraint to apply
   * @param originalPosition Original position before constraint processing
   * @param originalRotation Original rotation before constraint processing
   * @param originalScale Original scale before constraint processing
   */
  private applyLockConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: LockConstraint,
    originalPosition: Vector3,
    originalRotation: Rotation,
    originalScale: Vector3
  ): void {
    // Use the initial values if set, otherwise use the original values from this frame
    const lockToPosition = constraint.initialPosition || originalPosition;
    const lockToRotation = constraint.initialRotation || originalRotation;
    const lockToScale = constraint.initialScale || originalScale;
    
    // Lock position axes
    if (constraint.position) {
      const [lockX, lockY, lockZ] = constraint.position;
      
      if (lockX) transform.position.x = lockToPosition.x;
      if (lockY) transform.position.y = lockToPosition.y;
      if (lockZ) transform.position.z = lockToPosition.z;
    }
    
    // Lock rotation axes
    if (constraint.rotation) {
      const [lockX, lockY, lockZ] = constraint.rotation;
      
      if (lockX) transform.rotation.x = lockToRotation.x;
      if (lockY) transform.rotation.y = lockToRotation.y;
      if (lockZ) transform.rotation.z = lockToRotation.z;
    }
    
    // Lock scale axes
    if (constraint.scale) {
      const [lockX, lockY, lockZ] = constraint.scale;
      
      if (lockX) transform.scale.x = lockToScale.x;
      if (lockY) transform.scale.y = lockToScale.y;
      if (lockZ) transform.scale.z = lockToScale.z;
    }
  }
  
  /**
   * Clean up the system when it's removed from the world
   */
  cleanup(): void {
    console.log('ConstraintSystem cleaned up');
  }

  /**
   * Apply a CopyTransformConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The CopyTransform constraint to apply
   */
  private applyCopyTransformConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: CopyTransformConstraint
  ): void {
    // Get the source entity
    if (constraint.sourceEntityId === null) return;
    
    const sourceEntity = this.world.getEntity(constraint.sourceEntityId);
    if (!sourceEntity) return;
    
    const sourceTransform = sourceEntity.getComponent(Transform);
    if (!sourceTransform) return;
    
    // Store original transform for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    const originalRotation = new Rotation().copy(transform.rotation);
    const originalScale = new Vector3().copy(transform.scale);
    
    const shouldCopyPosition = constraint.components.includes(TransformComponent.POSITION) || 
                              constraint.components.includes(TransformComponent.ALL);
    const shouldCopyRotation = constraint.components.includes(TransformComponent.ROTATION) || 
                              constraint.components.includes(TransformComponent.ALL);
    const shouldCopyScale = constraint.components.includes(TransformComponent.SCALE) || 
                           constraint.components.includes(TransformComponent.ALL);
    
    // Calculate effective mix weight (mixWeight * influence)
    const effectiveMixWeight = constraint.mixWeight * constraint.influence;
    
    // Apply position copy with mix weight
    if (shouldCopyPosition) {
      // Get source position and add offset if provided
      const targetPos = new Vector3().copy(sourceTransform.position);
      if (constraint.offset.position) {
        targetPos.add(constraint.offset.position);
      }
      
      // Apply with mix weight blending
      transform.position.x = THREE.MathUtils.lerp(originalPosition.x, targetPos.x, effectiveMixWeight);
      transform.position.y = THREE.MathUtils.lerp(originalPosition.y, targetPos.y, effectiveMixWeight);
      transform.position.z = THREE.MathUtils.lerp(originalPosition.z, targetPos.z, effectiveMixWeight);
    }
    
    // Apply rotation copy with mix weight
    if (shouldCopyRotation) {
      // Get source rotation and add offset if provided
      const targetRot = new Rotation().copy(sourceTransform.rotation);
      if (constraint.offset.rotation) {
        targetRot.add(constraint.offset.rotation);
      }
      
      // Apply with mix weight blending
      transform.rotation.x = THREE.MathUtils.lerp(originalRotation.x, targetRot.x, effectiveMixWeight);
      transform.rotation.y = THREE.MathUtils.lerp(originalRotation.y, targetRot.y, effectiveMixWeight);
      transform.rotation.z = THREE.MathUtils.lerp(originalRotation.z, targetRot.z, effectiveMixWeight);
    }
    
    // Apply scale copy with mix weight
    if (shouldCopyScale) {
      // Get source scale and add offset if provided
      const targetScale = new Vector3().copy(sourceTransform.scale);
      if (constraint.offset.scale) {
        targetScale.multiply(constraint.offset.scale);
      }
      
      // Apply with mix weight blending
      transform.scale.x = THREE.MathUtils.lerp(originalScale.x, targetScale.x, effectiveMixWeight);
      transform.scale.y = THREE.MathUtils.lerp(originalScale.y, targetScale.y, effectiveMixWeight);
      transform.scale.z = THREE.MathUtils.lerp(originalScale.z, targetScale.z, effectiveMixWeight);
    }
  }

  /**
   * Apply a Distance constraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Distance constraint to apply
   */
  private applyDistanceConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: DistanceConstraint
  ): void {
    // Get the target entity
    if (constraint.targetEntityId === null) return;
    
    const targetEntity = this.world.getEntity(constraint.targetEntityId);
    if (!targetEntity) return;
    
    const targetTransform = targetEntity.getComponent(Transform);
    if (!targetTransform) return;
    
    // Store original position for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    
    // Get source and target positions
    const sourcePos = this.toThreeVector(transform.position);
    const targetPos = this.toThreeVector(targetTransform.position);
    
    // Calculate current distance
    const direction = this.tmpVec1.copy(sourcePos).sub(targetPos);
    const currentDistance = direction.length();
    
    if (currentDistance === 0) return; // Prevent division by zero
    
    // Normalize the direction vector (points AWAY from target)
    direction.normalize();
    
    // If no constraints are set, or distance is already within limits, return
    if ((constraint.minDistance === undefined && constraint.maxDistance === undefined) ||
        (constraint.minDistance !== undefined && currentDistance >= constraint.minDistance &&
         constraint.maxDistance !== undefined && currentDistance <= constraint.maxDistance) ||
        (constraint.minDistance !== undefined && constraint.maxDistance === undefined && currentDistance >= constraint.minDistance) ||
        (constraint.minDistance === undefined && constraint.maxDistance !== undefined && currentDistance <= constraint.maxDistance)) {
      return;
    }
    
    // Calculate the new position based on constraint
    let newDistance = currentDistance;
    let springFactor = 1;
    
    if (constraint.minDistance !== undefined && currentDistance < constraint.minDistance) {
      // Too close - need to move away from target
      newDistance = constraint.minDistance;
      if (constraint.springiness !== undefined) {
        springFactor = constraint.springiness;
      }
    } else if (constraint.maxDistance !== undefined && currentDistance > constraint.maxDistance) {
      // Too far - need to move toward target
      newDistance = constraint.maxDistance;
      if (constraint.springiness !== undefined) {
        springFactor = constraint.springiness;
      }
    }
    
    // Only adjust if needed
    if (newDistance !== currentDistance) {
      // Calculate offset based on whether we need to move toward or away from target
      const offset = (newDistance - currentDistance) * springFactor * constraint.influence;
      
      // Apply offset in the direction vector (away from target)
      const adjustedPos = this.tmpVec2.copy(sourcePos).addScaledVector(direction, offset);
      
      // Apply the resulting position
      transform.position.x = adjustedPos.x;
      transform.position.y = adjustedPos.y;
      transform.position.z = adjustedPos.z;
    }
  }

  /**
   * Apply a FloorConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Floor constraint to apply
   */
  private applyFloorConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: FloorConstraint
  ): void {
    // Store original position for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    
    // Calculate effective floor height with offset
    const effectiveHeight = constraint.height + constraint.offset;
    
    // Check if the entity is below the floor
    if (transform.position.y < effectiveHeight) {
      // Apply bounce if specified
      if (constraint.bounceAmount > 0) {
        // Simulate a bounce effect
        // This is a simplified model - a real physics system would do this better
        // In a full implementation, we'd use a proper physics system instead of this approach
        
        // Since we can't directly access non-registered components like 'Velocity',
        // we can only handle the position part of the constraint
      }
      
      // Create a new position that keeps the entity above the floor
      const newPosition = new Vector3().copy(transform.position);
      newPosition.y = effectiveHeight;
      
      // Apply influence by blending between original and constrained position
      transform.position.x = originalPosition.x; // Only Y is affected
      transform.position.y = THREE.MathUtils.lerp(originalPosition.y, newPosition.y, constraint.influence);
      transform.position.z = originalPosition.z; // Only Y is affected
    }
  }

  /**
   * Apply an OrientConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Orient constraint to apply
   * @param originalRotation Original rotation before constraint processing
   */
  private applyOrientConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: OrientConstraint,
    originalRotation: Rotation
  ): void {
    // Get the target entity
    if (constraint.targetEntityId === null) return;
    
    const targetEntity = this.world.getEntity(constraint.targetEntityId);
    if (!targetEntity) return;
    
    const targetTransform = targetEntity.getComponent(Transform);
    if (!targetTransform) return;
    
    // Get target rotation and add offset
    const targetRotation = new Rotation().copy(targetTransform.rotation);
    targetRotation.add(constraint.offset);
    
    // Calculate effective mix weight (mixWeight * influence)
    const effectiveMixWeight = constraint.mixWeight * constraint.influence;
    
    // Apply with mix weight blending
    transform.rotation.x = THREE.MathUtils.lerp(originalRotation.x, targetRotation.x, effectiveMixWeight);
    transform.rotation.y = THREE.MathUtils.lerp(originalRotation.y, targetRotation.y, effectiveMixWeight);
    transform.rotation.z = THREE.MathUtils.lerp(originalRotation.z, targetRotation.z, effectiveMixWeight);
  }

  /**
   * Apply a PathFollowConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The PathFollow constraint to apply
   * @param deltaTime Time since last update
   */
  private applyPathFollowConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: PathFollowConstraint,
    deltaTime: number
  ): void {
    // Store original transform for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    const originalRotation = new Rotation().copy(transform.rotation);
    
    // Path must have at least 2 points
    if (constraint.path.length < 2) return;
    
    // Update current distance along the path
    constraint.currentDistance += constraint.speed * deltaTime;
    
    // Handle looping
    const totalDistance = constraint.path.length - 1;
    if (constraint.loop) {
      // Wrap around the path distance for looping paths
      constraint.currentDistance = constraint.currentDistance % totalDistance;
      if (constraint.currentDistance < 0) {
        constraint.currentDistance += totalDistance;
      }
    } else {
      // Clamp to path ends for non-looping paths
      constraint.currentDistance = THREE.MathUtils.clamp(constraint.currentDistance, 0, constraint.path.length);
    }
    
    // Find which segment we're on and the interpolation factor
    const segment = Math.floor(constraint.currentDistance);
    const t = constraint.currentDistance - segment;
    
    // Make sure segment is valid
    const maxSegment = constraint.path.length - 1;
    const safeSegment = THREE.MathUtils.clamp(segment, 0, maxSegment);
    
    // Get the two points to interpolate between
    const p1 = constraint.path[safeSegment];
    const p2 = constraint.path[Math.min(safeSegment + 1, constraint.path.length - 1)];
    
    // Interpolate position (simple linear interpolation for now)
    // A more advanced implementation could use cubic splines
    const newPosition = new Vector3(
      THREE.MathUtils.lerp(p1.position.x, p2.position.x, t),
      THREE.MathUtils.lerp(p1.position.y, p2.position.y, t),
      THREE.MathUtils.lerp(p1.position.z, p2.position.z, t)
    );
    
    // Apply position with influence blending
    transform.position.x = THREE.MathUtils.lerp(originalPosition.x, newPosition.x, constraint.influence);
    transform.position.y = THREE.MathUtils.lerp(originalPosition.y, newPosition.y, constraint.influence);
    transform.position.z = THREE.MathUtils.lerp(originalPosition.z, newPosition.z, constraint.influence);
    
    // If we need to align rotation to the path
    if (constraint.alignToPath) {
      let newRotation: Rotation | null = null;
      
      // If path points have rotation defined
      if (p1.rotation && p2.rotation) {
        // Interpolate rotation
        newRotation = new Rotation(
          THREE.MathUtils.lerp(p1.rotation.x, p2.rotation.x, t),
          THREE.MathUtils.lerp(p1.rotation.y, p2.rotation.y, t),
          THREE.MathUtils.lerp(p1.rotation.z, p2.rotation.z, t)
        );
      } else {
        // Calculate rotation based on path direction
        // Convert points to THREE.Vector3 for calculations
        const threeP1 = this.toThreeVector(p1.position);
        const threeP2 = this.toThreeVector(p2.position);
        
        // Calculate direction
        const direction = this.tmpVec1.copy(threeP2).sub(threeP1);
        
        // Only calculate rotation if direction is significant
        if (direction.lengthSq() > 0.0001) {
          direction.normalize();
          
          // Create a rotation that points along the path
          this.tmpMat.lookAt(threeP1, threeP2, this.worldUp);
          this.tmpQuat.setFromRotationMatrix(this.tmpMat);
          this.tmpEuler.setFromQuaternion(this.tmpQuat);
          
          // Convert to our rotation format
          newRotation = this.fromThreeEuler(this.tmpEuler);
        }
      }
      
      // Apply rotation with influence blending if we have a new rotation
      if (newRotation) {
        transform.rotation.x = THREE.MathUtils.lerp(originalRotation.x, newRotation.x, constraint.influence);
        transform.rotation.y = THREE.MathUtils.lerp(originalRotation.y, newRotation.y, constraint.influence);
        transform.rotation.z = THREE.MathUtils.lerp(originalRotation.z, newRotation.z, constraint.influence);
      }
    }
  }

  /**
   * Apply a PivotConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Pivot constraint to apply
   * @param deltaTime Time since last update
   */
  private applyPivotConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: PivotConstraint,
    deltaTime: number
  ): void {
    // Store original position for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    
    // Update the angle based on rotation speed
    constraint.currentAngle += constraint.rotationSpeed * deltaTime;
    
    // Keep angle in 0-360 range for simplicity
    constraint.currentAngle = constraint.currentAngle % 360;
    if (constraint.currentAngle < 0) {
      constraint.currentAngle += 360;
    }
    
    // Convert angle to radians
    const angleRad = constraint.currentAngle * (Math.PI / 180);
    
    // Get the rotation axis
    const rotationAxis = this.getAxisVector(constraint.rotationAxis);
    
    // Create a quaternion for the rotation
    this.tmpQuat.setFromAxisAngle(rotationAxis, angleRad);
    
    // Calculate the offset position based on the radius
    // First create a perpendicular vector to the rotation axis
    this.tmpVec1.set(1, 0, 0);
    if (Math.abs(rotationAxis.dot(this.tmpVec1)) > 0.9) {
      // If rotation axis is close to X axis, use Z as reference
      this.tmpVec1.set(0, 0, 1);
    }
    
    // Calculate the perpendicular vector for the orbital plane
    this.tmpVec2.crossVectors(rotationAxis, this.tmpVec1).normalize();
    
    // Create the start position at the specified radius from the pivot
    this.tmpVec3.copy(this.tmpVec2).multiplyScalar(constraint.radius);
    
    // Rotate this position by the current angle
    this.tmpVec3.applyQuaternion(this.tmpQuat);
    
    // Add to the pivot position to get the final position
    const pivotPoint = this.toThreeVector(constraint.pivot);
    this.tmpVec3.add(pivotPoint);
    
    // Create the final position
    const newPosition = new Vector3(
      this.tmpVec3.x,
      this.tmpVec3.y,
      this.tmpVec3.z
    );
    
    // Apply position with influence blending
    transform.position.x = THREE.MathUtils.lerp(originalPosition.x, newPosition.x, constraint.influence);
    transform.position.y = THREE.MathUtils.lerp(originalPosition.y, newPosition.y, constraint.influence);
    transform.position.z = THREE.MathUtils.lerp(originalPosition.z, newPosition.z, constraint.influence);
  }

  /**
   * Apply a SpringConstraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The Spring constraint to apply
   * @param deltaTime Time since last update
   */
  private applySpringConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: SpringConstraint,
    deltaTime: number
  ): void {
    // Get the target entity
    if (constraint.targetEntityId === null) return;
    
    const targetEntity = this.world.getEntity(constraint.targetEntityId);
    if (!targetEntity) return;
    
    const targetTransform = targetEntity.getComponent(Transform);
    if (!targetTransform) return;
    
    // Store original position for influence blending
    const originalPosition = new Vector3().copy(transform.position);
    
    // Get source and target positions
    const sourcePos = this.toThreeVector(transform.position);
    const targetPos = this.toThreeVector(targetTransform.position);
    
    // Calculate the displacement vector from source to target
    const displacement = this.tmpVec1.copy(targetPos).sub(sourcePos);
    const distance = displacement.length();
    
    // Calculate the force using Hooke's law (F = k(x - x0))
    // where k is stiffness, x is current length, and x0 is rest length
    const extension = distance - constraint.restLength;
    
    // Add a damping force based on a simplified model
    // A more accurate simulation would require a velocity component
    
    // Calculate the spring force vector
    const forceStrength = extension * constraint.stiffness;
    const forceDirection = displacement.normalize();
    const force = this.tmpVec2.copy(forceDirection).multiplyScalar(forceStrength);
    
    // Apply the force to the position (simplified physics)
    const acceleration = this.tmpVec3.copy(force);
    
    // Apply some damping to prevent oscillation
    // Damping is normally applied to velocity, but we'll approximate it
    acceleration.multiplyScalar(1 - constraint.damping);
    
    // Apply as a simplified displacement over deltaTime
    // In a real simulation, we'd integrate velocity and position
    const displacement2 = this.tmpVec4.copy(acceleration).multiplyScalar(deltaTime * deltaTime);
    
    // Apply the displacement to create a new position
    const newPos = this.tmpVec1.copy(sourcePos).add(displacement2);
    const newPosition = new Vector3(newPos.x, newPos.y, newPos.z);
    
    // Apply position with influence blending
    transform.position.x = THREE.MathUtils.lerp(originalPosition.x, newPosition.x, constraint.influence);
    transform.position.y = THREE.MathUtils.lerp(originalPosition.y, newPosition.y, constraint.influence);
    transform.position.z = THREE.MathUtils.lerp(originalPosition.z, newPosition.z, constraint.influence);
  }

  /**
   * Apply a TrackTo constraint to an entity
   * @param entity The entity being constrained
   * @param transform The entity's transform
   * @param constraint The TrackTo constraint to apply
   */
  private applyTrackToConstraint(
    entity: IEntity,
    transform: Transform,
    constraint: TrackToConstraint
  ): void {
    // Get the target entity
    if (constraint.targetEntityId === null) return;
    
    const targetEntity = this.world.getEntity(constraint.targetEntityId);
    if (!targetEntity) return;
    
    const targetTransform = targetEntity.getComponent(Transform);
    if (!targetTransform) return;
    
    // Store original rotation for influence blending
    const originalRotation = new Rotation().copy(transform.rotation);
    
    // Get source and target positions
    const sourcePos = this.toThreeVector(transform.position);
    const targetPos = this.toThreeVector(targetTransform.position);
    
    // Direction vector from source to target
    this.tmpVec1.copy(targetPos).sub(sourcePos);
    
    // Skip if the points are too close (prevents jittering)
    if (this.tmpVec1.lengthSq() < 0.0001) return;
    
    // Normalize the direction vector
    this.tmpVec1.normalize();
    
    // We need to create a rotation that aligns the specified track axis with the direction vector
    // First, create a lookAt matrix as a reference (this will point -Z toward the target)
    this.tmpMat.lookAt(
      sourcePos,
      targetPos,
      new THREE.Vector3(0, 1, 0) // World up vector
    );
    
    // Extract rotation as quaternion
    this.tmpQuat.setFromRotationMatrix(this.tmpMat);
    
    // We now need to adjust the rotation based on which axis should track
    // The default lookAt behavior points the -Z axis at the target
    // So we need to apply corrections based on the requested tracking axis
    switch (constraint.trackAxis) {
      case Axis.POSITIVE_Y:
        // Rotate -Z to +Y (rotate 90 degrees around X)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
        break;
      case Axis.NEGATIVE_Y:
        // Rotate -Z to -Y (rotate -90 degrees around X)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
        break;
      case Axis.POSITIVE_X:
        // Rotate -Z to +X (rotate 90 degrees around Y)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
        break;
      case Axis.NEGATIVE_X:
        // Rotate -Z to -X (rotate -90 degrees around Y)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
        break;
      case Axis.POSITIVE_Z:
        // Rotate -Z to +Z (rotate 180 degrees around Y)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        this.tmpQuat.multiply(this.tmpQuat2);
        break;
      case Axis.NEGATIVE_Z:
        // Default - no correction needed (lookAt already points -Z)
        break;
    }
    
    // Convert to Euler angles
    this.tmpEuler.setFromQuaternion(this.tmpQuat);
    
    // Add any offset rotation
    this.tmpEuler.x += constraint.offset.x;
    this.tmpEuler.y += constraint.offset.y;
    this.tmpEuler.z += constraint.offset.z;
    
    // Convert to our rotation format (degrees)
    const newRotation = this.fromThreeEuler(this.tmpEuler);
    
    // Apply influence factor to blend between original and new rotation
    if (constraint.influence < 1.0) {
      newRotation.x = originalRotation.x + (newRotation.x - originalRotation.x) * constraint.influence;
      newRotation.y = originalRotation.y + (newRotation.y - originalRotation.y) * constraint.influence;
      newRotation.z = originalRotation.z + (newRotation.z - originalRotation.z) * constraint.influence;
    }
    
    // Apply the resulting rotation
    transform.rotation.copy(newRotation);
  }
  
  /**
   * Get a directional vector based on the specified axis
   * @param axis The axis specification
   * @returns A unit vector representing the axis
   */
  private getAxisVector(axis: Axis): THREE.Vector3 {
    switch (axis) {
      case Axis.POSITIVE_X:
        return new THREE.Vector3(1, 0, 0);
      case Axis.NEGATIVE_X:
        return new THREE.Vector3(-1, 0, 0);
      case Axis.POSITIVE_Y:
        return new THREE.Vector3(0, 1, 0);
      case Axis.NEGATIVE_Y:
        return new THREE.Vector3(0, -1, 0);
      case Axis.POSITIVE_Z:
        return new THREE.Vector3(0, 0, 1);
      case Axis.NEGATIVE_Z:
        return new THREE.Vector3(0, 0, -1);
      default:
        return new THREE.Vector3(0, 0, 1);
    }
  }
} 
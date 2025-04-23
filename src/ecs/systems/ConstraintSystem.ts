import * as THREE from 'three';
import { System } from '../System';
import { ComponentClass } from '../types';
import { 
  ConstraintComponent, 
  ConstraintType, 
  TrackToConstraint,
  PathFollowConstraint
} from '../components/ConstraintComponent';
import { ThreeObject } from '../components/ThreeObject';
import { CurveComponent } from '../components/CurveComponent';

/**
 * System that processes constraint components and applies constraints to entities
 */
export class ConstraintSystem extends System {
  // Reusable objects for calculations (to avoid garbage collection)
  private tmpVec1: THREE.Vector3 = new THREE.Vector3();
  private tmpVec2: THREE.Vector3 = new THREE.Vector3();
  private tmpVec3: THREE.Vector3 = new THREE.Vector3();
  private tmpQuat: THREE.Quaternion = new THREE.Quaternion();
  private tmpQuat2: THREE.Quaternion = new THREE.Quaternion();
  private tmpMat: THREE.Matrix4 = new THREE.Matrix4();
  private tmpEuler: THREE.Euler = new THREE.Euler();

  // For path following
  private tmpDir: THREE.Vector3 = new THREE.Vector3();
  private tmpPos: THREE.Vector3 = new THREE.Vector3();

  /**
   * Constructor
   * @param priority Priority of this system (higher = processed earlier)
   */
  constructor(priority: number = 400) {
    super(priority);
  }

  /**
   * System initialization
   */
  protected override onInitialize(): void {
    console.log('ConstraintSystem initialized');
  }

  /**
   * Update the system in the fixed update loop
   * @param deltaTime Time since last update in seconds
   */
  protected override onUpdate(deltaTime: number): void {
    // Get all entities with ConstraintComponent
    const entities = this.query(ConstraintComponent as unknown as ComponentClass);

    // Process each entity
    for (const entity of entities) {
      const constraintComponent = entity.getComponent(ConstraintComponent);
      if (!constraintComponent) continue;

      const threeObject = entity.getComponent(ThreeObject);
      if (!threeObject) continue;

      // Process all constraints in priority order (already sorted in the component)
      const constraints = constraintComponent.getConstraints();
      for (const constraint of constraints) {
        if (!constraint.enabled) continue;

        // Apply the appropriate constraint based on type
        switch (constraint.type) {
          case ConstraintType.TRACK_TO:
            this.applyTrackToConstraint(entity, threeObject, constraint as TrackToConstraint);
            break;
          case ConstraintType.PATH_FOLLOW:
            this.applyPathFollowConstraint(entity, threeObject, constraint as PathFollowConstraint, deltaTime);
            break;
        }
      }
    }
  }

  /**
   * Apply a TrackTo constraint to an entity
   * @param entity The entity being constrained
   * @param threeObj The entity's ThreeObject component
   * @param constraint The TrackTo constraint to apply
   */
  private applyTrackToConstraint(
    entity: any,
    threeObj: ThreeObject,
    constraint: TrackToConstraint
  ): void {
    // Get the target entity
    if (constraint.targetEntityId === null) return;
    
    const targetEntity = this.world?.getEntity(constraint.targetEntityId);
    if (!targetEntity) return;
    
    const targetThreeObj = targetEntity.getComponent(ThreeObject);
    if (!targetThreeObj) return;
    
    // Store original rotation for influence blending
    this.tmpQuat.copy(threeObj.object.quaternion);
    
    // Get source and target positions
    const sourcePos = threeObj.object.position;
    const targetPos = targetThreeObj.object.position;
    
    // Direction vector from source to target
    this.tmpVec1.copy(targetPos).sub(sourcePos);
    
    // Skip if the points are too close (prevents jittering)
    if (this.tmpVec1.lengthSq() < 0.0001) return;
    
    // Normalize the direction vector
    this.tmpVec1.normalize();
    
    // Create a forward/up aligned coordinate system
    // The lookAt function points -Z at the target, so we need to align it with the desired track axis
    
    // First, we'll create a temporary coordinate system with lookAt
    // that aligns -Z with the direction to the target
    this.tmpMat.lookAt(
      sourcePos,
      targetPos,
      constraint.upAxis // Use the provided up vector directly
    );
    
    // Extract this initial orientation as a quaternion
    this.tmpQuat2.setFromRotationMatrix(this.tmpMat);
    
    // Now we need to apply a rotation to align the requested trackAxis with the target
    // instead of the default -Z that lookAt provides
    
    // Create a quaternion to rotate from -Z to the desired track axis
    
    // The default forward direction for lookAt is -Z
    this.tmpVec2.set(0, 0, -1);
    
    // Calculate the rotation between -Z and the desired track axis
    this.tmpVec3.copy(constraint.trackAxis).normalize();
    
    // Use the shortest rotation to align axes
    this.tmpQuat.setFromUnitVectors(this.tmpVec2, this.tmpVec3);
    
    // Apply this adjustment to our orientation
    this.tmpQuat2.multiply(this.tmpQuat);
    
    // Convert to Euler angles
    this.tmpEuler.setFromQuaternion(this.tmpQuat2);
    
    // Add any offset rotation
    this.tmpEuler.x += constraint.offset.x;
    this.tmpEuler.y += constraint.offset.y;
    this.tmpEuler.z += constraint.offset.z;
    
    // Set quaternion from Euler angles
    this.tmpQuat2.setFromEuler(this.tmpEuler);
    
    // Apply influence factor to blend between original and new rotation
    if (constraint.influence < 1.0) {
      // Store original rotation
      this.tmpQuat.copy(threeObj.object.quaternion);
      
      // Slerp between original rotation and new rotation
      this.tmpQuat.slerp(this.tmpQuat2, constraint.influence);
      
      // Apply the resulting rotation
      threeObj.object.quaternion.copy(this.tmpQuat);
    } else {
      // Apply full constraint
      threeObj.object.quaternion.copy(this.tmpQuat2);
    }
  }

  /**
   * Apply a PathFollow constraint to an entity
   * @param entity The entity being constrained
   * @param threeObj The entity's ThreeObject component
   * @param constraint The PathFollow constraint to apply
   * @param deltaTime Time since last update in seconds
   */
  private applyPathFollowConstraint(
    entity: any,
    threeObj: ThreeObject,
    constraint: PathFollowConstraint,
    deltaTime: number
  ): void {
    // Get the path entity
    const pathEntity = this.world?.getEntity(constraint.pathEntityId);
    if (!pathEntity) return;
    
    // Get the CurveComponent
    const curveComponent = pathEntity.getComponent(CurveComponent);
    if (!curveComponent) return;
    
    // Get the curve object
    const curve = curveComponent.getCurve();
    if (!curve) return;
    
    // Get the current distance (0-1)
    let distance = constraint.distance;
    
    // Ensure distance is within 0-1 range
    if (constraint.loop) {
      // Allow looping by wrapping around
      distance = ((distance % 1) + 1) % 1;
    } else {
      // Clamp to 0-1 range
      distance = Math.max(0, Math.min(1, distance));
    }
    
    // Get position at the current distance along the path
    const pathPoint = curveComponent.getPointAt(distance);
    if (!pathPoint) return;
    
    // Get the next point along the path for direction calculation (if needed)
    let direction: THREE.Vector3 | null = null;
    
    if (constraint.rotateToFace) {
      // Calculate small step forward to determine direction vector
      const stepSize = 0.01;
      let nextDistance = distance + stepSize;
      
      if (constraint.loop) {
        // For looping paths, handle wrap-around smoothly
        nextDistance = nextDistance % 1;
        
        // Special case: If we're near the end of the loop, blend between end and start
        // to ensure smooth transition across the loop boundary
        if (distance > 0.99) {
          // Get point at current position
          this.tmpPos.copy(pathPoint);
          
          // Get direction at end of path
          const endPoint = curveComponent.getPointAt(0.99);
          const startPoint = curveComponent.getPointAt(0.01);
          
          if (endPoint && startPoint) {
            // Calculate direction at end of path
            this.tmpDir.subVectors(startPoint, endPoint).normalize();
            direction = this.tmpDir.clone();
          }
        } else {
          // Normal case - get the next position
          const nextPoint = curveComponent.getPointAt(nextDistance);
          
          // Calculate direction
          if (nextPoint) {
            direction = new THREE.Vector3().subVectors(nextPoint, pathPoint).normalize();
          }
        }
      } else {
        // Non-looping paths
        if (nextDistance > 1) {
          // If at the end, step backward instead to get direction
          nextDistance = distance - stepSize;
        }
        
        // Get the next position
        const nextPoint = curveComponent.getPointAt(nextDistance);
        
        // Calculate direction
        if (nextPoint) {
          direction = new THREE.Vector3();
          
          if (nextDistance > distance) {
            // Looking forward
            direction.subVectors(nextPoint, pathPoint).normalize();
          } else {
            // Looking backward (when at the end with no looping)
            direction.subVectors(pathPoint, nextPoint).normalize();
          }
        }
      }
    }
    
    // Apply the position (with any offset)
    const finalPosition = pathPoint.clone();
    
    if (!constraint.offset.equals(new THREE.Vector3(0, 0, 0))) {
      // If we have a direction, we can apply offset relative to the path direction
      if (direction) {
        // Calculate coordinate system at this point on the curve
        const tangent = direction.clone();
        const up = constraint.upAxis.clone();
        
        // Calculate the right vector (perpendicular to tangent and up)
        const right = new THREE.Vector3().crossVectors(up, tangent).normalize();
        
        // Recalculate up to ensure it's perpendicular to tangent and right
        up.crossVectors(tangent, right).normalize();
        
        // Apply offset relative to this coordinate system
        finalPosition.add(
          right.multiplyScalar(constraint.offset.x)
            .add(up.multiplyScalar(constraint.offset.y))
            .add(tangent.multiplyScalar(constraint.offset.z))
        );
      } else {
        // Simple world-space offset
        finalPosition.add(constraint.offset);
      }
    }
    
    // Apply position based on influence
    if (constraint.influence < 1.0) {
      // Blend between original and new position
      threeObj.object.position.lerp(finalPosition, constraint.influence);
    } else {
      threeObj.object.position.copy(finalPosition);
    }
    
    // Apply rotation if needed
    if (constraint.rotateToFace && direction) {
      // Save the original rotation for blending with influence
      const originalRotation = threeObj.object.quaternion.clone();
      
      // We need to create a rotation that aligns the specified track axis with the path direction
      
      // First, create a lookAt matrix as a reference (this will point -Z toward the target direction)
      this.tmpMat.lookAt(
        new THREE.Vector3(0, 0, 0),  // origin
        direction,                   // path direction
        constraint.upAxis            // up vector
      );
      
      // Extract rotation as quaternion
      this.tmpQuat.setFromRotationMatrix(this.tmpMat);
      
      // Default lookAt behavior points -Z at the direction
      // We need to apply corrections to align the requested track axis with the direction
      // Determine which rotation to apply based on the trackAxis
      
      const trackAxis = constraint.trackAxis;
      
      // Check which axis we need to align with the path direction
      if (trackAxis.y > 0.9) {
        // Want to align +Y with direction (cone tip forward)
        // Rotate -Z to +Y (rotate 90 degrees around X)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
      } 
      else if (trackAxis.y < -0.9) {
        // Want to align -Y with direction
        // Rotate -Z to -Y (rotate -90 degrees around X)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
      }
      else if (trackAxis.x > 0.9) {
        // Want to align +X with direction
        // Rotate -Z to +X (rotate 90 degrees around Y)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
      }
      else if (trackAxis.x < -0.9) {
        // Want to align -X with direction
        // Rotate -Z to -X (rotate -90 degrees around Y)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2);
        this.tmpQuat.multiply(this.tmpQuat2);
      }
      else if (trackAxis.z > 0.9) {
        // Want to align +Z with direction
        // Rotate -Z to +Z (rotate 180 degrees around Y)
        this.tmpQuat2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        this.tmpQuat.multiply(this.tmpQuat2);
      }
      // If trackAxis is -Z (0,0,-1), no correction needed as lookAt already points -Z
      
      // Apply influence for rotation
      if (constraint.influence < 1.0) {
        threeObj.object.quaternion.copy(originalRotation)
          .slerp(this.tmpQuat, constraint.influence);
      } else {
        threeObj.object.quaternion.copy(this.tmpQuat);
      }
    }
  }

  /**
   * System cleanup
   */
  protected override onCleanup(): void {
    console.log('ConstraintSystem cleaned up');
  }
} 
// Core types
export * from './types';

// Core classes
export { BaseComponent } from './Component';
export { System } from './System';
export { Entity } from './Entity';
export { World } from './World';

// Components
export { Transform, Vector3, Rotation } from './components/Transform';
export { ThreeObject } from './components/ThreeObject';
export { MeshComponent, GeometryType } from './components/MeshComponent';
export { CameraComponent, CameraType } from './components/CameraComponent';
export { 
  ConstraintComponent, 
  ConstraintType, 
  Axis,
  TrackAxis, 
  UpAxis,
  TransformComponent,
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
  FloorConstraint
} from './components/ConstraintComponent';

// Systems
export { SerializationSystem } from './serialization/SerializationSystem';
export { ThreeSceneSystem } from './systems/ThreeSceneSystem';
export { CameraSystem } from './systems/CameraSystem';
export { ConstraintSystem } from './systems/ConstraintSystem';

/**
 * Example usage:
 * 
 * ```typescript
 * // Create a world
 * const world = new World();
 * 
 * // Register component types for serialization
 * world.registerComponent('Transform', Transform);
 * world.registerComponent('CameraComponent', CameraComponent);
 * world.registerComponent('ConstraintComponent', ConstraintComponent);
 * 
 * // Register systems
 * world.registerSystem(new SerializationSystem(0)); // Priority 0
 * world.registerSystem(new ThreeSceneSystem(200)); // Priority 200
 * world.registerSystem(new ConstraintSystem(300)); // Priority 300
 * world.registerSystem(new CameraSystem(400)); // Priority 400
 * 
 * // Create an entity
 * const entity = world.createEntity('player');
 * 
 * // Add components to the entity
 * entity.addComponent(new Transform(1, 2, 3));
 * 
 * // Create a camera entity
 * const cameraEntity = world.createEntity('mainCamera');
 * cameraEntity.addComponent(new Transform(0, 5, 10));
 * cameraEntity.addComponent(new CameraComponent(CameraType.PERSPECTIVE, {
 *   fov: 75,
 *   aspect: 16/9
 * }));
 * 
 * // Add constraint to make camera follow player
 * const cameraConstraint = new ConstraintComponent();
 * 
 * // Make camera look at player
 * cameraConstraint.addLookAt(entity.id);
 * 
 * // Also maintain a minimum distance of 5 units from player
 * cameraConstraint.addDistance(entity.id, {
 *   minDistance: 5,
 *   springiness: 0.5
 * });
 * 
 * // Add the constraint component to the camera entity
 * cameraEntity.addComponent(cameraConstraint);
 * 
 * // Create a child object that orbits the player
 * const orbitEntity = world.createEntity('orbitingObject');
 * orbitEntity.addComponent(new Transform(1, 1, 1));
 * 
 * // Add a pivot constraint to make it orbit around the player
 * const orbitConstraint = new ConstraintComponent();
 * orbitConstraint.addPivot(
 *   new Vector3(1, 2, 3), // player position
 *   {
 *     rotationAxis: Axis.POSITIVE_Y,
 *     rotationSpeed: 90, // 90 degrees per second
 *     radius: 3 // 3 units from player
 *   }
 * );
 * orbitEntity.addComponent(orbitConstraint);
 * 
 * // Manual component updates can be done outside of systems
 * const transform = entity.getComponent(Transform);
 * if (transform) {
 *   transform.position.x += 1;
 *   transform.rotation.y += 45;
 * }
 * 
 * // Update the world (processes systems)
 * world.update(0.016); // 16ms frame
 * 
 * // Get active camera
 * const cameras = world.getEntitiesWithComponent(CameraComponent);
 * const activeCamera = cameras.find(e => e.getComponent(CameraComponent)?.active);
 * 
 * // Serialize the world
 * const serializationSystem = world.getSystem(SerializationSystem);
 * const worldData = serializationSystem?.saveWorld();
 * 
 * // Create a prefab
 * const playerPrefab = serializationSystem?.createPrefabFromEntity(entity, 'player');
 * 
 * // Instantiate a prefab
 * const newPlayer = serializationSystem?.instantiatePrefab('player');
 * 
 * // Save to/load from JSON
 * const jsonData = serializationSystem?.saveScene('level1');
 * serializationSystem?.loadScene(jsonData || '{}');
 * ```
 */ 
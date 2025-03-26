import * as THREE from 'three';
import { Component } from '../Component';
import { GameObject } from '../GameObject';
import { EventSystem } from '../EventSystem';

export interface CollisionBounds {
    min: THREE.Vector3;
    max: THREE.Vector3;
}

export class CollisionComponent extends Component {
    private bounds: CollisionBounds;
    private collisionMask: number = 1;
    private collisionLayer: number = 1;
    private eventSystem: EventSystem;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.eventSystem = EventSystem.getInstance();
        this.bounds = {
            min: new THREE.Vector3(),
            max: new THREE.Vector3()
        };
    }

    public init(): void {
        this.updateBounds();
    }

    public setBounds(min: THREE.Vector3, max: THREE.Vector3): void {
        this.bounds.min.copy(min);
        this.bounds.max.copy(max);
    }

    public setCollisionMask(mask: number): void {
        this.collisionMask = mask;
    }

    public setCollisionLayer(layer: number): void {
        this.collisionLayer = layer;
    }

    public getBounds(): CollisionBounds {
        return {
            min: this.bounds.min.clone(),
            max: this.bounds.max.clone()
        };
    }

    public testCollision(other: CollisionComponent): boolean {
        // Skip if masks don't match
        if ((this.collisionMask & other.collisionLayer) === 0) {
            return false;
        }

        const bounds1 = this.getWorldBounds();
        const bounds2 = other.getWorldBounds();

        // AABB collision test
        return (bounds1.min.x <= bounds2.max.x && bounds1.max.x >= bounds2.min.x) &&
               (bounds1.min.y <= bounds2.max.y && bounds1.max.y >= bounds2.min.y) &&
               (bounds1.min.z <= bounds2.max.z && bounds1.max.z >= bounds2.min.z);
    }

    public resolveCollision(other: CollisionComponent, movement: THREE.Vector3): THREE.Vector3 {
        if (!this.testCollision(other)) {
            return movement.clone();
        }

        const bounds1 = this.getWorldBounds();
        const bounds2 = other.getWorldBounds();
        const resolvedMovement = movement.clone();

        // Calculate overlap in each axis
        const overlapX = movement.x > 0 ? 
            bounds1.max.x - bounds2.min.x :
            bounds1.min.x - bounds2.max.x;
        
        const overlapZ = movement.z > 0 ?
            bounds1.max.z - bounds2.min.z :
            bounds1.min.z - bounds2.max.z;

        // Resolve along the axis with smaller overlap
        if (Math.abs(overlapX) < Math.abs(overlapZ)) {
            resolvedMovement.x = 0;
        } else {
            resolvedMovement.z = 0;
        }

        // Emit collision event
        this.eventSystem.emit('player:collide', {
            object: other.gameObject.constructor.name.toLowerCase()
        });

        return resolvedMovement;
    }

    private getWorldBounds(): CollisionBounds {
        const position = this.gameObject.getPosition();
        return {
            min: this.bounds.min.clone().add(position),
            max: this.bounds.max.clone().add(position)
        };
    }

    private updateBounds(): void {
        const mesh = this.gameObject.getMesh();
        if (mesh instanceof THREE.Mesh) {
            mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox!;
            this.bounds.min.copy(box.min);
            this.bounds.max.copy(box.max);
        }
    }
} 
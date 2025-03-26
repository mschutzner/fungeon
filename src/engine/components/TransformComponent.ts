import * as THREE from 'three';
import { Component } from '../Component';
import { GameObject } from '../GameObject';

export class TransformComponent extends Component {
    private position: THREE.Vector3;
    private rotation: THREE.Euler;
    private scale: THREE.Vector3;
    private previousPosition: THREE.Vector3;
    private targetPosition: THREE.Vector3;
    private moveSpeed: number = 0;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.scale = new THREE.Vector3(1, 1, 1);
        this.previousPosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
    }

    public init(): void {
        // Initialize with GameObject's current position
        this.position.copy(this.gameObject.getPosition());
        this.previousPosition.copy(this.position);
        this.targetPosition.copy(this.position);
        
        // If mesh exists, copy its transform
        const mesh = this.gameObject.getMesh();
        if (mesh) {
            this.rotation.copy(mesh.rotation);
            this.scale.copy(mesh.scale);
        }
    }

    public setPosition(position: THREE.Vector3): void {
        this.previousPosition.copy(this.position);
        this.position.copy(position);
        this.targetPosition.copy(position);
        this.updateMesh();
    }

    public setRotation(rotation: THREE.Euler): void {
        this.rotation.copy(rotation);
        this.updateMesh();
    }

    public setScale(scale: THREE.Vector3): void {
        this.scale.copy(scale);
        this.updateMesh();
    }

    public getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    public getRotation(): THREE.Euler {
        return this.rotation.clone();
    }

    public getScale(): THREE.Vector3 {
        return this.scale.clone();
    }

    public moveTowards(target: THREE.Vector3, speed: number): void {
        this.targetPosition.copy(target);
        this.previousPosition.copy(this.position);
        this.moveSpeed = speed;
    }

    public update(deltaTime: number): void {
        // Handle movement towards target if not already there
        if (!this.position.equals(this.targetPosition)) {
            const step = this.moveSpeed * deltaTime / 1000;
            this.position.lerp(this.targetPosition, step);
            this.updateMesh();
        }
    }

    public renderUpdate(deltaTime: number, interpolationAlpha: number): void {
        // Interpolate position for smooth movement
        if (!this.position.equals(this.targetPosition)) {
            const interpolatedPosition = new THREE.Vector3();
            interpolatedPosition.lerpVectors(this.previousPosition, this.position, interpolationAlpha);
            this.updateMeshPosition(interpolatedPosition);
        }
    }

    private updateMesh(): void {
        const mesh = this.gameObject.getMesh();
        if (mesh) {
            mesh.position.copy(this.position);
            mesh.rotation.copy(this.rotation);
            mesh.scale.copy(this.scale);
        }
    }

    private updateMeshPosition(position: THREE.Vector3): void {
        const mesh = this.gameObject.getMesh();
        if (mesh) {
            mesh.position.copy(position);
        }
    }
} 
import * as THREE from 'three';
import { GameEngine } from './GameEngine';

export abstract class GameObject {
    protected engine: GameEngine;
    protected position: THREE.Vector3;
    protected mesh!: THREE.Object3D;

    constructor(engine: GameEngine, position: THREE.Vector3) {
        this.engine = engine;
        this.position = position;
    }

    public getMesh(): THREE.Object3D {
        return this.mesh;
    }

    public getPosition(): THREE.Vector3 {
        return this.position;
    }

    public setPosition(position: THREE.Vector3): void {
        this.position.copy(position);
        this.mesh.position.copy(position);
    }

    public abstract update(deltaTime: number): void;
} 
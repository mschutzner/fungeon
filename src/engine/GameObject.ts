import * as THREE from 'three';
import { GameEngine } from './GameEngine';
import { Component } from './Component';

export abstract class GameObject {
    protected engine: GameEngine;
    protected position: THREE.Vector3;
    protected mesh!: THREE.Object3D;
    private components: Map<string, Component> = new Map();

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

    public getEngine(): GameEngine {
        return this.engine;
    }

    public addComponent(name: string, component: Component): void {
        this.components.set(name, component);
        component.init();
    }

    public getComponent(name: string): Component | undefined {
        return this.components.get(name);
    }

    public removeComponent(name: string): void {
        const component = this.components.get(name);
        if (component) {
            component.onDestroy();
            this.components.delete(name);
        }
    }

    public update(deltaTime: number): void {
        // Update all components
        for (const component of this.components.values()) {
            component.update(deltaTime);
        }
    }

    public renderUpdate(deltaTime: number, interpolationAlpha: number): void {
        // Update all components
        for (const component of this.components.values()) {
            component.renderUpdate(deltaTime, interpolationAlpha);
        }
    }

    public onDestroy(): void {
        // Clean up all components
        this.components.forEach(component => {
            component.onDestroy();
        });
        this.components.clear();

        // Clean up mesh if it exists
        if (this.mesh) {
            if (this.mesh instanceof THREE.Mesh) {
                if (this.mesh.geometry) {
                    this.mesh.geometry.dispose();
                }
                if (this.mesh.material) {
                    if (Array.isArray(this.mesh.material)) {
                        this.mesh.material.forEach(material => material.dispose());
                    } else {
                        this.mesh.material.dispose();
                    }
                }
            }
            this.mesh = null!;
        }
    }
} 
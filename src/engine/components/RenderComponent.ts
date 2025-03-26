import * as THREE from 'three';
import { Component } from '../Component';
import { GameObject } from '../GameObject';

export interface RenderConfig {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    castShadow?: boolean;
    receiveShadow?: boolean;
}

export class RenderComponent extends Component {
    private mesh: THREE.Mesh;
    private isVisible: boolean = true;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.mesh = new THREE.Mesh();
    }

    public init(): void {
        // If the GameObject already has a mesh, use its properties
        const existingMesh = this.gameObject.getMesh();
        if (existingMesh instanceof THREE.Mesh) {
            this.mesh = existingMesh;
        }
    }

    public configure(config: RenderConfig): void {
        this.mesh.geometry = config.geometry;
        this.mesh.material = config.material;
        this.mesh.castShadow = config.castShadow ?? false;
        this.mesh.receiveShadow = config.receiveShadow ?? false;

        // Update mesh position to match GameObject
        this.mesh.position.copy(this.gameObject.getPosition());
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.mesh.visible = visible;
    }

    public isRendered(): boolean {
        return this.isVisible;
    }

    public getMaterial(): THREE.Material | THREE.Material[] {
        return this.mesh.material;
    }

    public setMaterial(material: THREE.Material | THREE.Material[]): void {
        this.mesh.material = material;
    }

    public setCastShadow(cast: boolean): void {
        this.mesh.castShadow = cast;
    }

    public setReceiveShadow(receive: boolean): void {
        this.mesh.receiveShadow = receive;
    }

    public onDestroy(): void {
        // Clean up geometry and material
        this.mesh.geometry.dispose();
        if (Array.isArray(this.mesh.material)) {
            this.mesh.material.forEach(material => material.dispose());
        } else {
            this.mesh.material.dispose();
        }
    }
} 
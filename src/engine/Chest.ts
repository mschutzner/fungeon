import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';
import { GameConfig } from './GameConfig';

export class Chest extends GameObject {
    private readonly config: GameConfig;

    constructor(engine: GameEngine, position: THREE.Vector3 = new THREE.Vector3()) {
        super(engine, position);
        this.config = GameConfig.getInstance();
        this.createMesh();
        
        // Position the chest so its bottom is at floor level
        const settings = this.config.getSettings();
        this.position.y = settings.chestSize.height / 2;
        this.mesh.position.copy(this.position);
    }

    private createMesh(): void {
        const settings = this.config.getSettings();
        
        // Create chest body (box)
        const bodyGeometry = new THREE.BoxGeometry(
            settings.chestSize.width,
            settings.chestSize.height,
            settings.chestSize.depth,
            4, // segments
            4,
            4
        );

        // Get chest palette from config
        const chestPalette = this.config.getPaletteForObject('chest');

        // Create material with chest palette
        const material = this.engine.createPaletteMaterial(
            this.config.getColors().CHEST,
            chestPalette
        );

        this.mesh = new THREE.Mesh(bodyGeometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }

    public update(deltaTime: number): void {
        // No update behavior needed for now
    }
} 
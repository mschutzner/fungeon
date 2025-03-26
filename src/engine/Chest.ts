import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';
import { GameConfig } from './GameConfig';
import { EventSystem } from './EventSystem';

export class Chest extends GameObject {
    private readonly config: GameConfig;
    private eventSystem: EventSystem;
    private interactionRange: number = 1.5;
    private isInteractable: boolean = true;

    constructor(engine: GameEngine, position: THREE.Vector3 = new THREE.Vector3()) {
        super(engine, position);
        this.config = GameConfig.getInstance();
        this.eventSystem = EventSystem.getInstance();
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
        this.mesh.position.copy(this.position);
    }

    public update(deltaTime: number): void {
        if (!this.isInteractable) return;

        // Check for nearby player
        const playerPos = this.engine.getPlayer().getPosition();
        const distance = this.position.distanceTo(playerPos);

        if (distance <= this.interactionRange) {
            this.eventSystem.emit('chest:interact', { position: this.position.clone() });
            this.isInteractable = false; // Prevent multiple rapid interactions
            
            // Reset interactability after a delay
            setTimeout(() => {
                this.isInteractable = true;
            }, 1000);
        }
    }
} 
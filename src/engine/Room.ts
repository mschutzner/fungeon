import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';
import { GameConfig } from './GameConfig';

interface WallConfig {
    position: [number, number, number];
    rotation: [number, number, number];
}

export class Room extends GameObject {
    private walls: THREE.Mesh[] = [];
    private floor: THREE.Mesh = new THREE.Mesh();
    private readonly config: GameConfig;

    constructor(engine: GameEngine, position: THREE.Vector3 = new THREE.Vector3()) {
        super(engine, position);
        this.config = GameConfig.getInstance();
        this.createRoom();
    }

    private createRoom(): void {
        const settings = this.config.getSettings();
        const colors = this.config.getColors();

        // Get palettes from config
        const floorPalette = this.config.getPaletteForObject('floor');
        const wallPalette = this.config.getPaletteForObject('wall');

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(settings.roomSize, settings.roomSize);
        const floorMaterial = this.engine.createPaletteMaterial(colors.FLOOR, floorPalette);
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.copy(this.position);
        this.floor.receiveShadow = true;

        // Create walls
        const wallGeometry = new THREE.PlaneGeometry(settings.roomSize, settings.roomHeight);
        const wallMaterial = this.engine.createPaletteMaterial(colors.WALL, wallPalette);
        
        const halfSize = settings.roomSize / 2;
        const halfHeight = settings.roomHeight / 2;
        
        const wallConfigs: WallConfig[] = [
            { position: [0, halfHeight, -halfSize], rotation: [0, 0, 0] },
            { position: [0, halfHeight, halfSize], rotation: [0, Math.PI, 0] },
            { position: [-halfSize, halfHeight, 0], rotation: [0, Math.PI / 2, 0] },
            { position: [halfSize, halfHeight, 0], rotation: [0, -Math.PI / 2, 0] }
        ];

        // Create group to hold floor and walls
        const group = new THREE.Group();
        group.add(this.floor);

        wallConfigs.forEach(({ position, rotation }) => {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(position[0], position[1], position[2]);
            wall.rotation.set(rotation[0], rotation[1], rotation[2]);
            wall.receiveShadow = true;
            this.walls.push(wall);
            group.add(wall);
        });

        this.mesh = group;
    }

    public update(deltaTime: number): void {
        // Room doesn't need updates for now
    }
} 
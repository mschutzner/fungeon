import * as THREE from 'three';
import { GameEngine } from '../GameEngine';
import { GameConfig } from '../GameConfig';

export class WallBuilder {
    private readonly config: GameConfig;
    private readonly wallPalette: number[];
    private readonly wallGeometry: THREE.PlaneGeometry;

    constructor(private engine: GameEngine) {
        this.config = GameConfig.getInstance();
        this.wallPalette = this.config.getPaletteForObject('wall');
        this.wallGeometry = new THREE.PlaneGeometry(1, 2); // Standard wall height of 2 units
    }

    public createFloor(position: THREE.Vector3): THREE.Mesh {
        const floorGeometry = new THREE.PlaneGeometry(1, 1);
        const floorMaterial = this.engine.createPaletteMaterial(
            new THREE.Color(this.config.getColors().FLOOR),
            this.config.getPaletteForObject('floor')
        );
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.copy(position);
        floor.position.y = 0; // Ensure floor is at y=0
        floor.receiveShadow = true;
        
        return floor;
    }

    public createWall(
        position: THREE.Vector3, 
        direction: 'north' | 'east' | 'south' | 'west',
        paletteIndex?: number
    ): THREE.Mesh {
        const color = paletteIndex !== undefined ? 
            new THREE.Color(this.wallPalette[paletteIndex]) :
            new THREE.Color(this.config.getColors().WALL);
            
        const wallMaterial = this.engine.createPaletteMaterial(
            color,
            this.wallPalette
        );
        
        const wall = new THREE.Mesh(this.wallGeometry, wallMaterial);
        wall.position.copy(position);

        // Position walls at tile edges and rotate to face inward
        // PlaneGeometry's normal faces +Z by default
        switch (direction) {
            case 'north':
                wall.position.z += 0.5;
                wall.rotation.y = Math.PI; // Rotate 180° to face -Z (inward)
                break;
            case 'south':
                wall.position.z -= 0.5;
                wall.rotation.y = 0; // No rotation needed, already faces +Z (inward)
                break;
            case 'east':
                wall.position.x += 0.5;
                wall.rotation.y = -Math.PI / 2; // Rotate -90° to face -X (inward)
                break;
            case 'west':
                wall.position.x -= 0.5;
                wall.rotation.y = Math.PI / 2; // Rotate 90° to face +X (inward)
                break;
        }
        
        // Position wall so it starts at y=0 and extends up 2 units
        wall.position.y = 1; // Half of 2 units to center the geometry
        
        wall.receiveShadow = true;
        wall.castShadow = true;
        return wall;
    }
} 
import * as THREE from 'three';
import { GameEngine } from '../GameEngine';
import { EventSystem } from '../EventSystem';
import { TileObject } from './Tile';
import { GameConfig } from '../GameConfig';

export class TileObjectFactory {
    private eventSystem: EventSystem;
    private config: GameConfig;

    constructor(private engine: GameEngine) {
        this.eventSystem = EventSystem.getInstance();
        this.config = GameConfig.getInstance();
    }

    public createObject(objectData: TileObject): THREE.Object3D | null {
        const position = new THREE.Vector3(
            objectData.position.x,
            objectData.position.y,
            objectData.position.z
        );

        switch (objectData.type) {
            case 'player':
                // Move existing player to spawn position
                const player = this.engine.getPlayer();
                // Get player settings for height calculation
                const settings = this.config.getSettings();
                // Total capsule height = cylindrical section + 2 hemispheres (top and bottom)
                const totalHeight = settings.playerSize.height + 2 * settings.playerSize.radius;
                // Position at half the total height to place bottom on floor
                position.y = totalHeight / 2;
                player.setPosition(position);
                return null; // Don't create new player object

            case 'pointLight':
                const light = new THREE.PointLight(
                    objectData.properties?.color || 0xffffff,
                    objectData.properties?.intensity || 2.0,
                    objectData.properties?.distance || 5
                );
                light.position.copy(position);
                
                // Enhanced shadow settings
                light.castShadow = true;
                light.shadow.mapSize.width = 512;  // Increased for better quality
                light.shadow.mapSize.height = 512;
                light.shadow.camera.near = 0.1;
                light.shadow.camera.far = 10;  // Reduced for tighter shadow mapping
                light.shadow.bias = -0.001;    // Adjusted for less shadow acne
                light.shadow.radius = 1;       // Slight blur for softer shadows
                
                // Add a small sphere to represent the light source
                const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const sphereMaterial = new THREE.MeshBasicMaterial({ 
                    color: objectData.properties?.color || 0xffffff,
                    transparent: true,
                    opacity: 0.5
                });
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                light.add(sphere);
                
                return light;

            default:
                console.warn(`Unknown object type: ${objectData.type}`);
                return null;
        }
    }
} 
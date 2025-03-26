import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';
import { InputManager } from './InputManager';
import { GameConfig } from './GameConfig';
import { EventSystem } from './EventSystem';

export class Player extends GameObject {
    private readonly config: GameConfig;
    private inputManager: InputManager;
    private eventSystem: EventSystem;

    constructor(engine: GameEngine, position: THREE.Vector3 = new THREE.Vector3()) {
        super(engine, position);
        this.config = GameConfig.getInstance();
        this.inputManager = InputManager.getInstance();
        this.eventSystem = EventSystem.getInstance();
        this.createMesh();
        
        // Position the player at floor level
        // Since the capsule is centered vertically, we need to move it up by half its height
        this.position.y = 0;
        const settings = this.config.getSettings();
        this.mesh.position.y = settings.playerSize.height / 2;
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
    }

    public setPosition(position: THREE.Vector3): void {
        super.setPosition(position);
        // Keep the mesh's y position at half height while following x,z movement
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
        // Maintain the y offset for the mesh (half the total height)
        this.mesh.position.y = this.config.getSettings().playerSize.height / 2;
        // Emit movement event when position changes
        this.eventSystem.emit('player:move', { position: this.position.clone() });
    }

    private createMesh(): void {
        const settings = this.config.getSettings();
        const radius = settings.playerSize.radius;
        // For a capsule, the total height includes the cylinder section plus two hemisphere caps
        // So we subtract 2 * radius (the hemispheres) to get the cylinder height
        const cylinderHeight = settings.playerSize.height - (2 * radius);

        const geometry = new THREE.CapsuleGeometry(
            radius,
            cylinderHeight, // Just the cylinder portion, caps will be added automatically
            8,  // radial segments
            16  // height segments
        );

        // Get player palette from config
        const playerPalette = this.config.getPaletteForObject('player');

        // Create material with player palette
        const material = this.engine.createPaletteMaterial(
            this.config.getColors().PLAYER,
            playerPalette
        );

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = false;
    }

    public update(deltaTime: number): void {
        this.handleInput();
    }

    private handleInput(): void {
        const input = this.inputManager;
        const cameraAngle = this.engine.getCameraAngle();
        const settings = this.config.getSettings();

        // Calculate movement direction vectors
        const forward = new THREE.Vector3(
            -Math.cos(cameraAngle),
            0,
            -Math.sin(cameraAngle)
        );
        const right = new THREE.Vector3(
            -Math.cos(cameraAngle + Math.PI / 2),
            0,
            -Math.sin(cameraAngle + Math.PI / 2)
        );

        // Calculate movement vector based on input
        const movement = new THREE.Vector3(0, 0, 0);

        if (input.isKeyHeld('KeyW')) movement.add(forward);
        if (input.isKeyHeld('KeyS')) movement.sub(forward);
        if (input.isKeyHeld('KeyD')) movement.add(right);
        if (input.isKeyHeld('KeyA')) movement.sub(right);

        // Normalize movement vector if moving diagonally and apply movement speed
        if (movement.lengthSq() > 0) {
            movement.normalize().multiplyScalar(settings.playerMoveSpeed);
            
            // Apply movement with wall sliding
            this.moveWithSliding(movement);
        }
    }
    
    private moveWithSliding(movement: THREE.Vector3): void {
        const settings = this.config.getSettings();
        const radius = settings.playerSize.radius;
        const room = this.engine.getCurrentRoom();
        
        // Try to move in both X and Z independently
        const newPosition = this.position.clone();
        let collision = false;
        
        // Try X movement
        newPosition.x += movement.x;
        // Use room width for X bounds
        const halfWidth = (room.getWidth() - 1) / 2;
        if (Math.abs(newPosition.x) + radius > halfWidth) {
            newPosition.x = Math.sign(newPosition.x) * (halfWidth - radius);
            collision = true;
        }
        
        // Try Z movement
        newPosition.z += movement.z;
        // Use room height for Z bounds
        const halfHeight = (room.getHeight() - 1) / 2;
        if (Math.abs(newPosition.z) + radius > halfHeight) {
            newPosition.z = Math.sign(newPosition.z) * (halfHeight - radius);
            collision = true;
        }

        // Check collision with chest
        const chest = this.engine.getChest();
        if (chest) {
            const chestPos = chest.getPosition();
            const chestSize = settings.chestSize;
            const dx = Math.abs(newPosition.x - chestPos.x);
            const dz = Math.abs(newPosition.z - chestPos.z);
            
            if (dx < (chestSize.width / 2 + radius) && dz < (chestSize.depth / 2 + radius)) {
                // Handle chest collision
                if (dx > dz) {
                    newPosition.x = chestPos.x + Math.sign(newPosition.x - chestPos.x) * (chestSize.width / 2 + radius);
                } else {
                    newPosition.z = chestPos.z + Math.sign(newPosition.z - chestPos.z) * (chestSize.depth / 2 + radius);
                }
                collision = true;
                this.eventSystem.emit('player:collide', { object: 'chest' });
            }
        }

        if (collision) {
            this.eventSystem.emit('player:collide', { object: 'wall' });
        }
        
        // Update position
        this.setPosition(newPosition);
    }
    
    private isValidPosition(position: THREE.Vector3): boolean {
        const settings = this.config.getSettings();
        const playerRadius = settings.playerSize.radius;
        const room = this.engine.getCurrentRoom();
        const halfWidth = (room.getWidth() - 1) / 2;
        const halfHeight = (room.getHeight() - 1) / 2;
        const buffer = playerRadius * 1.1; // Add a small buffer for better collision
        
        // Check each wall boundary
        if (position.x > halfWidth - buffer) return false; // Right wall
        if (position.x < -halfWidth + buffer) return false; // Left wall
        if (position.z > halfHeight - buffer) return false; // Back wall
        if (position.z < -halfHeight + buffer) return false; // Front wall
        
        return true;
    }
} 
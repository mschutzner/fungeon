import * as THREE from 'three';
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';
import { InputManager } from './InputManager';
import { GameConfig } from './GameConfig';

export class Player extends GameObject {
    private readonly config: GameConfig;
    private inputManager: InputManager;

    constructor(engine: GameEngine, position: THREE.Vector3 = new THREE.Vector3()) {
        super(engine, position);
        this.config = GameConfig.getInstance();
        this.inputManager = InputManager.getInstance();
        this.createMesh();
        
        // Position the player so the bottom of the capsule is at y=0 (floor level)
        const settings = this.config.getSettings();
        // Total capsule height = cylindrical section + 2 hemispheres (top and bottom)
        const totalHeight = settings.playerSize.height + 2 * settings.playerSize.radius;
        // Position at half the total height to place bottom on floor
        this.position.y = totalHeight / 2;
        this.mesh.position.copy(this.position);
    }

    private createMesh(): void {
        const settings = this.config.getSettings();
        const geometry = new THREE.CapsuleGeometry(
            settings.playerSize.radius,
            settings.playerSize.height,
            8,  // Increased radial segments (was 4)
            16  // Increased height segments (was 8)
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
        const playerRadius = settings.playerSize.radius;
        const halfRoomSize = settings.roomSize / 2;
        const buffer = playerRadius * 1.1; // Collision buffer
        
        // Calculate new position without constraints
        const newPosition = new THREE.Vector3(
            this.position.x + movement.x,
            this.position.y,
            this.position.z + movement.z
        );
        
        // Check wall collisions and apply sliding
        let xMove = movement.x;
        let zMove = movement.z;
        
        // Right wall collision (x+)
        if (newPosition.x > halfRoomSize - buffer) {
            xMove = halfRoomSize - buffer - this.position.x;
        }
        
        // Left wall collision (x-)
        if (newPosition.x < -halfRoomSize + buffer) {
            xMove = -halfRoomSize + buffer - this.position.x;
        }
        
        // Back wall collision (z+)
        if (newPosition.z > halfRoomSize - buffer) {
            zMove = halfRoomSize - buffer - this.position.z;
        }
        
        // Front wall collision (z-)
        if (newPosition.z < -halfRoomSize + buffer) {
            zMove = -halfRoomSize + buffer - this.position.z;
        }

        // Check chest collision
        const chest = this.engine.getChest();
        const chestPos = chest.getPosition();
        const chestSize = this.config.getSettings().chestSize;
        const chestHalfWidth = chestSize.width / 2;
        const chestHalfDepth = chestSize.depth / 2;
        
        // Calculate chest bounds
        const chestMinX = chestPos.x - chestHalfWidth;
        const chestMaxX = chestPos.x + chestHalfWidth;
        const chestMinZ = chestPos.z - chestHalfDepth;
        const chestMaxZ = chestPos.z + chestHalfDepth;
        
        // Expand bounds by player radius
        const expandedMinX = chestMinX - buffer;
        const expandedMaxX = chestMaxX + buffer;
        const expandedMinZ = chestMinZ - buffer;
        const expandedMaxZ = chestMaxZ + buffer;
        
        // Test if new position would collide with chest
        const newX = this.position.x + xMove;
        const newZ = this.position.z + zMove;
        
        // Handle X-axis collision
        if (newZ > expandedMinZ && newZ < expandedMaxZ) {
            if (this.position.x <= expandedMinX && newX > expandedMinX) {
                // Colliding from left
                xMove = expandedMinX - this.position.x;
            } else if (this.position.x >= expandedMaxX && newX < expandedMaxX) {
                // Colliding from right
                xMove = expandedMaxX - this.position.x;
            }
        }
        
        // Handle Z-axis collision
        if (newX > expandedMinX && newX < expandedMaxX) {
            if (this.position.z <= expandedMinZ && newZ > expandedMinZ) {
                // Colliding from front
                zMove = expandedMinZ - this.position.z;
            } else if (this.position.z >= expandedMaxZ && newZ < expandedMaxZ) {
                // Colliding from back
                zMove = expandedMaxZ - this.position.z;
            }
        }
        
        // Apply the allowed movement (sliding along walls and chest if needed)
        this.position.x += xMove;
        this.position.z += zMove;
        this.mesh.position.copy(this.position);
    }
    
    private isValidPosition(position: THREE.Vector3): boolean {
        const settings = this.config.getSettings();
        const playerRadius = settings.playerSize.radius;
        const halfRoomSize = settings.roomSize / 2;
        const buffer = playerRadius * 1.1; // Add a small buffer for better collision
        
        // Check each wall boundary
        if (position.x > halfRoomSize - buffer) return false; // Right wall
        if (position.x < -halfRoomSize + buffer) return false; // Left wall
        if (position.z > halfRoomSize - buffer) return false; // Back wall
        if (position.z < -halfRoomSize + buffer) return false; // Front wall
        
        return true;
    }
} 
import * as THREE from 'three';
import { GameObject } from '../GameObject';
import { GameEngine } from '../GameEngine';
import { Room, Tile, TileType, TileObject } from './Tile';
import { WallBuilder } from './WallBuilder';
import { TileObjectFactory } from './TileObjectFactory';

export class TileRoom extends GameObject {
    private wallBuilder: WallBuilder;
    private objectFactory: TileObjectFactory;
    private gameObjects: Map<string, THREE.Object3D> = new Map();
    private roomGroup: THREE.Group;
    private roomData: Room | null = null;

    constructor(engine: GameEngine) {
        super(engine, new THREE.Vector3());
        this.wallBuilder = new WallBuilder(engine);
        this.objectFactory = new TileObjectFactory(engine);
        this.roomGroup = new THREE.Group();
        this.mesh = this.roomGroup;
    }

    public async loadRoom(roomName: string): Promise<void> {
        try {
            const response = await fetch(`/assets/rooms/${roomName}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const roomData = await response.json();
            this.loadRoomFromData(roomData);
        } catch (error) {
            console.error('Failed to load room:', error);
            throw error; // Let the error propagate up
        }
    }

    private loadRoomFromData(roomData: Room): void {
        this.roomData = roomData;
        console.log('Loading room:', roomData.name);
        
        // Clear any existing room
        this.clearCurrentRoom();

        // Create floor tiles and track empty spaces
        const floorPositions = new Set<string>();
        
        // First pass: Create all floor tiles
        roomData.tiles.forEach((tile: Tile) => {
            if (tile.id === TileType.FLOOR) {
                const pos = new THREE.Vector3(tile.position.x, tile.position.y, tile.position.z);
                const floor = this.wallBuilder.createFloor(pos);
                
                const key = `floor_${tile.position.x}_${tile.position.y}_${tile.position.z}`;
                this.gameObjects.set(key, floor);
                this.roomGroup.add(floor);
                console.log('Created floor at:', pos);
                
                floorPositions.add(`${tile.position.x},${tile.position.z}`);
            }
        });

        // Second pass: Create walls where needed
        roomData.tiles.forEach((tile: Tile) => {
            if (tile.id === TileType.FLOOR) {
                const { x, y, z } = tile.position;
                const pos = new THREE.Vector3(x, y, z);

                // Check each direction and add walls where specified
                if (tile.walls?.north) {
                    const wall = this.wallBuilder.createWall(pos, 'north', tile.walls.north);
                    const key = `wall_north_${x}_${y}_${z}`;
                    this.gameObjects.set(key, wall);
                    this.roomGroup.add(wall);
                    console.log('Created north wall at:', pos);
                }
                if (tile.walls?.east) {
                    const wall = this.wallBuilder.createWall(pos, 'east', tile.walls.east);
                    const key = `wall_east_${x}_${y}_${z}`;
                    this.gameObjects.set(key, wall);
                    this.roomGroup.add(wall);
                    console.log('Created east wall at:', pos);
                }
                if (tile.walls?.south) {
                    const wall = this.wallBuilder.createWall(pos, 'south', tile.walls.south);
                    const key = `wall_south_${x}_${y}_${z}`;
                    this.gameObjects.set(key, wall);
                    this.roomGroup.add(wall);
                    console.log('Created south wall at:', pos);
                }
                if (tile.walls?.west) {
                    const wall = this.wallBuilder.createWall(pos, 'west', tile.walls.west);
                    const key = `wall_west_${x}_${y}_${z}`;
                    this.gameObjects.set(key, wall);
                    this.roomGroup.add(wall);
                    console.log('Created west wall at:', pos);
                }
            }
        });

        // Create game objects
        roomData.objects.forEach((objData: TileObject) => {
            const object = this.objectFactory.createObject(objData);
            if (object) {
                const key = `object_${objData.type}_${objData.position.x}_${objData.position.y}_${objData.position.z}`;
                this.gameObjects.set(key, object);
                this.roomGroup.add(object);
                console.log('Created game object:', objData.type, 'at:', objData.position);
            }
        });

        // Center the room at origin
        const offsetX = -(roomData.width - 1) / 2;
        const offsetZ = -(roomData.height - 1) / 2;
        this.roomGroup.position.set(offsetX, 0, offsetZ);
        console.log('Room centered at:', { x: offsetX, y: 0, z: offsetZ });
        
        // Ensure the room group is added to the scene
        if (!this.roomGroup.parent) {
            this.mesh = this.roomGroup;
            console.log('Room group added to scene');
        }
    }

    private clearCurrentRoom(): void {
        // Remove all game objects
        this.gameObjects.forEach(obj => {
            this.roomGroup.remove(obj);
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.gameObjects.clear();
    }

    public getWidth(): number {
        return this.roomData ? this.roomData.width : 0;
    }

    public getHeight(): number {
        return this.roomData ? this.roomData.height : 0;
    }
} 
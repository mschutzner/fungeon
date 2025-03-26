export enum TileType {
    EMPTY = 0,
    FLOOR = 1
}

export interface WallMaterial {
    north?: number; // Palette index
    east?: number;
    south?: number;
    west?: number;
}

export interface Tile {
    id: TileType;
    position: { x: number; y: number; z: number };
    walls?: WallMaterial;
}

export interface TileObject {
    type: string;
    position: { x: number; y: number; z: number };
    properties?: Record<string, any>;
}

export interface Room {
    name: string;
    width: number;
    height: number;
    tiles: Tile[];
    objects: TileObject[];
} 
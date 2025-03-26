import * as THREE from 'three';
import { GameEngine } from './GameEngine';

export interface GameSettings {
    // Camera settings
    cameraViewSize: number;
    cameraHeight: number;
    cameraDistance: number;
    cameraRotationSpeed: number;
    cameraInitialAngle: number;
    cameraElevationAngle: number;

    // Player settings
    playerMoveSpeed: number;
    playerSize: { radius: number; height: number };

    // Chest settings
    chestSize: { width: number; height: number; depth: number };

    // Colors
    colors: {
        wall: number;
        player: number;
        floor: number;
        background: number;
        chest: number;
    };

    // Object-specific palettes
    palettes: {
        wall: number[];
        floor: number[];
        player: number[];
        chest: number[];
    };

    // Resolution settings
    resolution: {
        width: number;
        height: number;
    };
}

export class GameConfig {
    private static instance: GameConfig;
    private settings: GameSettings;
    private engine: GameEngine | null = null;

    private constructor() {
        // Default settings
        this.settings = {
            // Camera settings
            cameraViewSize: 3.77, // Makes 1 unit = 24 pixels at 30° elevation (224px / 24px/unit * cos(30°))
            cameraHeight: 4, // Slightly lower for better view
            cameraDistance: 5, // Match room size
            cameraRotationSpeed: Math.PI / 12, // 15 degrees for proper angle snapping
            cameraInitialAngle: Math.PI / 6 + Math.PI / 4, // 75° from positive X axis
            cameraElevationAngle: Math.PI / 6, // 30° elevation

            // Player settings
            playerMoveSpeed: 0.375,
            playerSize: {
                radius: 0.3,
                height: 1.75  // Total height including hemisphere caps
            },

            // Chest settings
            chestSize: {
                width: 0.8,
                height: 0.6,
                depth: 0.6
            },

            // Colors
            colors: {
                background: 0x222034,
                wall: 0x696A6A,
                floor: 0x595957,
                player: 0x6D803C,
                chest: 0x8B4513, // Brown color for chest
            },

            // Object-specific palettes
            palettes: {
                wall: [
                    0x4A4845,
                    0x595957,
                    0x696A6A,
                    0xA09CA2,
                    0x272625
                ],
                floor: [
                    0x4A4845,
                    0x595957,
                    0x696A6A,
                    0xA09CA2,
                    0x272625
                ],
                player: [
                    0xACC068,
                    0x6D803C,
                    0x4B692F,
                    0x3A6641,
                ],
                chest: [
                    0x8B4513, // Base brown
                    0x654321, // Darker brown
                    0xA0522D, // Lighter brown
                    0x5C4033, // Deep brown
                    0xCD853F  // Light brown
                ]
            },

            // Resolution settings
            resolution: {
                width: 224,
                height: 224
            }
        };

        // Try to load saved settings from localStorage
        this.loadSettings();
    }

    public static getInstance(): GameConfig {
        if (!GameConfig.instance) {
            GameConfig.instance = new GameConfig();
        }
        return GameConfig.instance;
    }

    public getSettings(): GameSettings {
        return { ...this.settings };
    }

    public updateSettings(newSettings: Partial<GameSettings>): void {
        this.settings = {
            ...this.settings,
            ...newSettings
        };
        this.saveSettings();
        // Notify engine of settings change
        if (this.engine) {
            this.engine.handleSettingsUpdate(newSettings);
        }
    }

    public setEngine(engine: GameEngine): void {
        this.engine = engine;
    }

    public getColors(): { [key: string]: THREE.Color } {
        return {
            WALL: new THREE.Color(this.settings.colors.wall),
            PLAYER: new THREE.Color(this.settings.colors.player),
            FLOOR: new THREE.Color(this.settings.colors.floor),
            BACKGROUND: new THREE.Color(this.settings.colors.background),
            CHEST: new THREE.Color(this.settings.colors.chest)
        };
    }

    public getPaletteForObject(objectType: 'wall' | 'floor' | 'player' | 'chest'): number[] {
        return this.settings.palettes[objectType];
    }

    public getResolution(): { width: number; height: number } {
        return this.settings.resolution;
    }

    private saveSettings(): void {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings to localStorage:', error);
        }
    }

    private loadSettings(): void {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (savedSettings) {
                this.settings = {
                    ...this.settings, // Keep defaults as fallback
                    ...JSON.parse(savedSettings) // Override with saved settings
                };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
    }
} 
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { GameConfig } from './GameConfig';

export class GameCamera {
    private camera: THREE.OrthographicCamera;
    private target: THREE.Vector3;
    private angle: number;
    private readonly config: GameConfig;
    private inputManager: InputManager;

    constructor(viewSize: number) {
        this.config = GameConfig.getInstance();
        const settings = this.config.getSettings();
        
        const aspect = 1;
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            0.1, 1000
        );
        
        this.target = new THREE.Vector3();
        this.angle = settings.cameraInitialAngle;
        this.inputManager = InputManager.getInstance();
        
        this.updatePosition();
    }

    private updatePosition(): void {
        const settings = this.config.getSettings();
        const horizontalDistance = Math.cos(settings.cameraElevationAngle) * settings.cameraDistance;
        
        this.camera.position.x = this.target.x + Math.cos(this.angle) * horizontalDistance;
        this.camera.position.y = settings.cameraHeight;
        this.camera.position.z = this.target.z + Math.sin(this.angle) * horizontalDistance;
        
        this.camera.lookAt(this.target);
    }

    public update(deltaTime: number): void {
        let angleChanged = false;
        const settings = this.config.getSettings();

        if (this.inputManager.isKeyHeld('KeyQ')) {
            this.angle += settings.cameraRotationSpeed;
            angleChanged = true;
        }
        if (this.inputManager.isKeyHeld('KeyE')) {
            this.angle -= settings.cameraRotationSpeed;
            angleChanged = true;
        }

        if (angleChanged) {
            this.updatePosition();
        }
    }

    public getCamera(): THREE.OrthographicCamera {
        return this.camera;
    }

    public getAngle(): number {
        return this.angle;
    }

    public setTarget(position: THREE.Vector3): void {
        this.target.copy(position);
        this.updatePosition();
    }
} 
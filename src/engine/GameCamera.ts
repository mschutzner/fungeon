import * as THREE from 'three';
import { InputManager } from './InputManager';
import { GameConfig } from './GameConfig';
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';

export class GameCamera extends GameObject {
    private camera: THREE.OrthographicCamera;
    private target: THREE.Vector3;
    private angle: number;
    private readonly config: GameConfig;
    private inputManager: InputManager;

    constructor(engine: GameEngine, viewSize: number) {
        super(engine, new THREE.Vector3());
        
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
        this.mesh = this.camera;
    }

    private updatePosition(): void {
        const settings = this.config.getSettings();
        const horizontalDistance = Math.cos(settings.cameraElevationAngle) * settings.cameraDistance;
        
        // Calculate new position
        const newPosition = new THREE.Vector3(
            this.target.x + Math.cos(this.angle) * horizontalDistance,
            settings.cameraHeight,
            this.target.z + Math.sin(this.angle) * horizontalDistance
        );
        
        // Update both GameObject position and camera position
        this.position.copy(newPosition);
        this.camera.position.copy(newPosition);
        this.camera.lookAt(this.target);
    }

    public update(deltaTime: number): void {
        // First update components (which includes CameraFollowComponent)
        super.update(deltaTime);

        // Then handle camera rotation
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

    public updateViewSize(viewSize: number): void {
        const aspect = 1;
        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.top = viewSize;
        this.camera.bottom = -viewSize;
        this.camera.updateProjectionMatrix();
    }
} 
import { GameObject } from './GameObject';
import { GameEngine } from './GameEngine';

export abstract class Component {
    protected gameObject: GameObject;
    protected engine: GameEngine;
    
    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
        this.engine = gameObject.getEngine();
    }

    // Called when component is first added to a GameObject
    public init(): void {}

    // Called every fixed update
    public update(deltaTime: number): void {}

    // Called every frame for rendering-related updates
    public renderUpdate(deltaTime: number, interpolationAlpha: number): void {}

    // Called when component is removed from GameObject
    public onDestroy(): void {}

    // Get the GameObject this component is attached to
    public getGameObject(): GameObject {
        return this.gameObject;
    }

    // Get the engine instance
    public getEngine(): GameEngine {
        return this.engine;
    }
} 
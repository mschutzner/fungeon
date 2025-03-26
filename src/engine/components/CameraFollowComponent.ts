import { Component } from '../Component';
import { GameObject } from '../GameObject';
import { GameCamera } from '../GameCamera';

export class CameraFollowComponent extends Component {
    private target: GameObject;
    private camera: GameCamera;

    constructor(gameObject: GameObject, target: GameObject) {
        super(gameObject);
        this.target = target;
        if (!(this.gameObject instanceof GameCamera)) {
            throw new Error('CameraFollowComponent can only be attached to GameCamera objects');
        }
        this.camera = this.gameObject as GameCamera;
    }

    public update(deltaTime: number): void {
        this.camera.setTarget(this.target.getPosition());
    }
} 
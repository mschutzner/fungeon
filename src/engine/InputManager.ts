export class InputManager {
    private static instance: InputManager;
    private keyStates: Map<string, boolean>;
    private previousKeyStates: Map<string, boolean>;

    private constructor() {
        this.keyStates = new Map();
        this.previousKeyStates = new Map();

        window.addEventListener('keydown', (e) => this.keyStates.set(e.code, true));
        window.addEventListener('keyup', (e) => this.keyStates.set(e.code, false));
    }

    public static getInstance(): InputManager {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager();
        }
        return InputManager.instance;
    }

    public isKeyHeld(keyCode: string): boolean {
        return this.keyStates.get(keyCode) || false;
    }

    public update(): void {
        this.previousKeyStates = new Map(this.keyStates);
    }

    public wasKeyPressed(keyCode: string): boolean {
        return (this.keyStates.get(keyCode) || false) && !(this.previousKeyStates.get(keyCode) || false);
    }

    public wasKeyReleased(keyCode: string): boolean {
        return !(this.keyStates.get(keyCode) || false) && (this.previousKeyStates.get(keyCode) || false);
    }
} 
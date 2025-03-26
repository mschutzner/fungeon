export class TimeManager {
    private static instance: TimeManager;
    private gameTime: number = 0;
    private timeScale: number = 1.0;
    private paused: boolean = false;
    private fixedTimeStep: number = 100; // 100ms to match current TICK_RATE
    private maxFrameTime: number = 250; // Cap on time to process
    private accumulatedTime: number = 0;

    private constructor() {}

    public static getInstance(): TimeManager {
        if (!TimeManager.instance) {
            TimeManager.instance = new TimeManager();
        }
        return TimeManager.instance;
    }

    public update(deltaTime: number): { 
        fixedStepCount: number,
        interpolationAlpha: number,
        deltaTime: number 
    } {
        if (this.paused) {
            return { fixedStepCount: 0, interpolationAlpha: 0, deltaTime: 0 };
        }

        // Scale delta time by time scale
        const scaledDelta = deltaTime * this.timeScale;
        
        // Add to game time and accumulated time
        this.gameTime += scaledDelta;
        this.accumulatedTime += scaledDelta;

        // Cap accumulated time to prevent spiral of death
        if (this.accumulatedTime > this.maxFrameTime) {
            this.accumulatedTime = this.maxFrameTime;
        }

        // Calculate how many fixed steps we need
        let fixedStepCount = 0;
        while (this.accumulatedTime >= this.fixedTimeStep) {
            this.accumulatedTime -= this.fixedTimeStep;
            fixedStepCount++;
            
            // Cap number of steps to prevent excessive updates
            if (fixedStepCount >= 3) {
                this.accumulatedTime = 0;
                break;
            }
        }

        // Calculate interpolation alpha for smooth rendering
        const interpolationAlpha = this.accumulatedTime / this.fixedTimeStep;

        return {
            fixedStepCount,
            interpolationAlpha,
            deltaTime: scaledDelta
        };
    }

    public getFixedTimeStep(): number {
        return this.fixedTimeStep;
    }

    public getGameTime(): number {
        return this.gameTime;
    }

    public setTimeScale(scale: number): void {
        this.timeScale = Math.max(0, scale);
    }

    public getTimeScale(): number {
        return this.timeScale;
    }

    public pause(): void {
        this.paused = true;
    }

    public resume(): void {
        this.paused = false;
    }

    public isPaused(): boolean {
        return this.paused;
    }
} 
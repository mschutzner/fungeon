import * as THREE from 'three';

// Define common event types
export interface GameEvents {
    'game:start': void;
    'game:pause': void;
    'game:resume': void;
    'player:move': { position: THREE.Vector3 };
    'player:collide': { object: string };
    'chest:interact': { position: THREE.Vector3 };
    'light:flicker': { intensity: number };
}

type EventCallback<T> = (data: T) => void;

export class EventSystem {
    private static instance: EventSystem;
    private listeners: Map<keyof GameEvents, EventCallback<any>[]> = new Map();

    private constructor() {}

    public static getInstance(): EventSystem {
        if (!EventSystem.instance) {
            EventSystem.instance = new EventSystem();
        }
        return EventSystem.instance;
    }

    public on<K extends keyof GameEvents>(
        event: K,
        callback: EventCallback<GameEvents[K]>
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    public off<K extends keyof GameEvents>(
        event: K,
        callback: EventCallback<GameEvents[K]>
    ): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    public emit<K extends keyof GameEvents>(
        event: K,
        data: GameEvents[K]
    ): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    public clear(): void {
        this.listeners.clear();
    }
} 
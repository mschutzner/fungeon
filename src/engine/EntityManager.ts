import { GameObject } from './GameObject';
import { EventSystem } from './EventSystem';

export class EntityManager {
    private static instance: EntityManager;
    private entities: Map<string, GameObject> = new Map();
    private entitiesToRemove: string[] = [];
    private nextEntityId: number = 0;
    private eventSystem: EventSystem;

    private constructor() {
        this.eventSystem = EventSystem.getInstance();
    }

    public static getInstance(): EntityManager {
        if (!EntityManager.instance) {
            EntityManager.instance = new EntityManager();
        }
        return EntityManager.instance;
    }

    public register(entity: GameObject): string {
        const id = `entity_${this.nextEntityId++}`;
        this.entities.set(id, entity);
        return id;
    }

    public unregister(entityId: string): void {
        this.entitiesToRemove.push(entityId);
    }

    public getEntity(entityId: string): GameObject | undefined {
        return this.entities.get(entityId);
    }

    public getAllEntities(): GameObject[] {
        return Array.from(this.entities.values());
    }

    public getEntitiesByType<T extends GameObject>(type: new (...args: any[]) => T): T[] {
        return Array.from(this.entities.values()).filter(entity => entity instanceof type) as T[];
    }

    public update(deltaTime: number): void {
        // Process pending removals
        while (this.entitiesToRemove.length > 0) {
            const id = this.entitiesToRemove.shift()!;
            const entity = this.entities.get(id);
            if (entity) {
                // Let components clean up
                entity.onDestroy();
                this.entities.delete(id);
            }
        }

        // Update all active entities
        this.entities.forEach(entity => {
            entity.update(deltaTime);
        });
    }

    public renderUpdate(deltaTime: number, interpolationAlpha: number): void {
        // Update all entities for rendering
        this.entities.forEach(entity => {
            entity.renderUpdate(deltaTime, interpolationAlpha);
        });
    }

    public clear(): void {
        // Clean up all entities
        this.entities.forEach(entity => {
            entity.onDestroy();
        });
        this.entities.clear();
        this.entitiesToRemove = [];
    }
} 
/**
 * Type for event callback functions
 */
export type EventCallback<T = any> = (data: T) => void;

/**
 * Event priority level
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Event subscription data
 */
export interface EventSubscription<T = any> {
  callback: EventCallback<T>;
  priority: EventPriority;
  once: boolean;
}

/**
 * EventSystem - Handles publishing and subscribing to events
 * 
 * The event system follows the observer pattern to allow for
 * decoupled communication between components.
 */
export class EventSystem {
  private static instance: EventSystem;
  
  // Map of event type to array of subscriptions
  private events: Map<string, EventSubscription[]> = new Map();
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}
  
  /**
   * Get the EventSystem instance
   */
  public static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }
  
  /**
   * Subscribe to an event
   * @param eventType Event type to subscribe to
   * @param callback Callback function to execute when event is published
   * @param priority Priority level for this subscription (default: NORMAL)
   * @returns Unsubscribe function
   */
  public subscribe<T = any>(
    eventType: string, 
    callback: EventCallback<T>, 
    priority: EventPriority = EventPriority.NORMAL
  ): () => void {
    // Create subscription
    const subscription: EventSubscription<T> = {
      callback,
      priority,
      once: false
    };
    
    // Add to events map
    if (!this.events.has(eventType)) {
      this.events.set(eventType, []);
    }
    
    const subscriptions = this.events.get(eventType)!;
    
    // Add subscription
    subscriptions.push(subscription);
    
    // Sort by priority (highest first)
    this.sortSubscriptions(subscriptions);
    
    // Return unsubscribe function
    return () => {
      const currentSubs = this.events.get(eventType);
      if (currentSubs) {
        const index = currentSubs.indexOf(subscription);
        if (index !== -1) {
          currentSubs.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Subscribe to an event once
   * The subscription will be automatically removed after the event is triggered once
   * 
   * @param eventType Event type to subscribe to
   * @param callback Callback function to execute when event is published
   * @param priority Priority level for this subscription (default: NORMAL)
   * @returns Unsubscribe function
   */
  public subscribeOnce<T = any>(
    eventType: string, 
    callback: EventCallback<T>, 
    priority: EventPriority = EventPriority.NORMAL
  ): () => void {
    // Create subscription
    const subscription: EventSubscription<T> = {
      callback,
      priority,
      once: true
    };
    
    // Add to events map
    if (!this.events.has(eventType)) {
      this.events.set(eventType, []);
    }
    
    const subscriptions = this.events.get(eventType)!;
    
    // Add subscription
    subscriptions.push(subscription);
    
    // Sort by priority (highest first)
    this.sortSubscriptions(subscriptions);
    
    // Return unsubscribe function
    return () => {
      const currentSubs = this.events.get(eventType);
      if (currentSubs) {
        const index = currentSubs.indexOf(subscription);
        if (index !== -1) {
          currentSubs.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Publish an event
   * @param eventType Event type to publish
   * @param data Data to pass to subscribers
   * @returns Number of subscribers that received the event
   */
  public publish<T = any>(eventType: string, data: T): number {
    // Check if event type exists
    if (!this.events.has(eventType)) {
      return 0;
    }
    
    const subscriptions = this.events.get(eventType)!;
    const onceSubs: EventSubscription[] = [];
    
    // Call each subscription callback
    subscriptions.forEach(sub => {
      try {
        sub.callback(data);
        if (sub.once) {
          onceSubs.push(sub);
        }
      } catch (e) {
        console.error(`Error in event callback for ${eventType}:`, e);
      }
    });
    
    // Remove 'once' subscriptions
    onceSubs.forEach(sub => {
      const index = subscriptions.indexOf(sub);
      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
    });
    
    return subscriptions.length;
  }
  
  /**
   * Check if an event has subscribers
   * @param eventType Event type to check
   * @returns True if event has subscribers
   */
  public hasSubscribers(eventType: string): boolean {
    return this.events.has(eventType) && this.events.get(eventType)!.length > 0;
  }
  
  /**
   * Clear all subscriptions for an event
   * @param eventType Event type to clear
   */
  public clearEvent(eventType: string): void {
    this.events.delete(eventType);
  }
  
  /**
   * Clear all events and subscriptions
   */
  public clearAllEvents(): void {
    this.events.clear();
  }
  
  /**
   * Sort subscriptions by priority (highest first)
   */
  private sortSubscriptions(subscriptions: EventSubscription[]): void {
    subscriptions.sort((a, b) => b.priority - a.priority);
  }
} 
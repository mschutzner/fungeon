/**
 * ServiceManager - Handles service registration and retrieval
 * 
 * This class implements the service locator pattern to provide
 * dependency injection and service management.
 */
export class ServiceManager {
  private static instance: ServiceManager;
  
  // Map of service key to service instance
  private services: Map<string, any> = new Map();
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}
  
  /**
   * Get the ServiceManager instance
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }
  
  /**
   * Register a service
   * @param key Service key
   * @param service Service instance
   * @param override Override existing service if true (default: false)
   * @returns The registered service
   */
  public register<T>(key: string, service: T, override: boolean = false): T {
    if (this.services.has(key) && !override) {
      console.warn(`Service with key "${key}" is already registered. Use override=true to replace it.`);
      return this.services.get(key) as T;
    }
    
    this.services.set(key, service);
    return service;
  }
  
  /**
   * Get a service
   * @param key Service key
   * @returns Service instance or undefined if not found
   */
  public get<T>(key: string): T | undefined {
    return this.services.get(key) as T | undefined;
  }
  
  /**
   * Get a required service
   * @param key Service key
   * @returns Service instance
   * @throws Error if service is not registered
   */
  public getRequired<T>(key: string): T {
    const service = this.get<T>(key);
    
    if (service === undefined) {
      throw new Error(`Required service "${key}" is not registered.`);
    }
    
    return service;
  }
  
  /**
   * Check if a service is registered
   * @param key Service key
   * @returns True if service is registered
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }
  
  /**
   * Remove a service
   * @param key Service key
   * @returns True if service was removed
   */
  public remove(key: string): boolean {
    return this.services.delete(key);
  }
  
  /**
   * Clear all services
   */
  public clear(): void {
    this.services.clear();
  }
  
  /**
   * Get all service keys
   * @returns Array of service keys
   */
  public getKeys(): string[] {
    return Array.from(this.services.keys());
  }
  
  /**
   * Get number of registered services
   * @returns Number of services
   */
  public size(): number {
    return this.services.size;
  }
} 
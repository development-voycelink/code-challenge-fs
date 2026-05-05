import { CallEventHandler } from './handlers/CallEventHandler';
import { CallRepository } from '../db/callRepository';

/**
 * Registry for managing CallEventHandler types and instances.
 * Allows for dynamic registration of handlers without modifying CallService.
 */
export class HandlerRegistry {
  private handlerTypes: Map<string, new (callRepository: CallRepository) => CallEventHandler> = new Map();
  private handlerInstances: CallEventHandler[] = [];

  /**
   * Register a handler type (class) that can be instantiated when needed
   * @param eventType The event type this handler can process
   * @param handlerClass The handler class constructor
   */
  registerHandlerType(
    eventType: string,
    handlerClass: new (callRepository: CallRepository) => CallEventHandler
  ): void {
    this.handlerTypes.set(eventType.toLowerCase(), handlerClass);
  }

  /**
   * Register a pre-instantiated handler
   * @param handler The handler instance to register
   */
  registerHandlerInstance(handler: CallEventHandler): void {
    this.handlerInstances.push(handler);
  }

  /**
   * Get all registered handler instances, instantiating types as needed
   * @param callRepository The repository to inject into handler constructors
   * @returns Array of handler instances
   */
  getHandlers(callRepository: CallRepository): CallEventHandler[] {
    // Return pre-registered instances
    const handlers = [...this.handlerInstances];
    
    // Instantiate registered types
    for (const [eventType, handlerClass] of this.handlerTypes) {
      handlers.push(new handlerClass(callRepository));
    }
    
    return handlers;
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.handlerTypes.clear();
    this.handlerInstances = [];
  }
}

// Global registry instance
export const handlerRegistry = new HandlerRegistry();
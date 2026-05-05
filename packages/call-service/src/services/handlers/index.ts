import { CallRepository } from '../../db/callRepository';
import { handlerRegistry } from '../HandlerRegistry';
import { CallInitiatedHandler } from './CallInitiatedHandler';
import { CallRoutedHandler } from './CallRoutedHandler';
import { CallAnsweredHandler } from './CallAnsweredHandler';
import { CallHoldHandler } from './CallHoldHandler';
import { CallEndedHandler } from './CallEndedHandler';
import {
  EVENT_CALL_INITIATED,
  EVENT_CALL_ROUTED,
  EVENT_CALL_ANSWERED,
  EVENT_CALL_HOLD,
  EVENT_CALL_ENDED,
} from '../../constants';

/**
 * Initialize and register all default call event handlers
 * This should be called during application startup
 */
export function initializeDefaultHandlers(callRepository: CallRepository = new CallRepository()): void {
  handlerRegistry.registerHandlerType(EVENT_CALL_INITIATED, CallInitiatedHandler);
  handlerRegistry.registerHandlerType(EVENT_CALL_ROUTED, CallRoutedHandler);
  handlerRegistry.registerHandlerType(EVENT_CALL_ANSWERED, CallAnsweredHandler);
  handlerRegistry.registerHandlerType(EVENT_CALL_HOLD, CallHoldHandler);
  handlerRegistry.registerHandlerType(EVENT_CALL_ENDED, CallEndedHandler);
}
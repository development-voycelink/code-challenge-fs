import { CallService } from './CallService';
import { initializeDefaultHandlers } from './handlers/index';

// Initialize default handlers before creating the service instance
initializeDefaultHandlers();

export { CallService } from './CallService';
export const callService = new CallService();

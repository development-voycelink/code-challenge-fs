import { CallRepository } from '../repositories/CallRepository';
import { CallEventRepository } from '../repositories/CallEventRepository';
import { CallService } from './CallService';

export { CallService } from './CallService';

const callRepo = new CallRepository();
const eventRepo = new CallEventRepository();

export const callService = new CallService(callRepo, eventRepo);

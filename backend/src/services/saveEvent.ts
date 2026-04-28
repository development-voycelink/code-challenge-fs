import { CallEvent } from "../models/CallEvent";
import { event_names } from "../utils/enums";

export async function saveEvent(call_id: string, event_name: event_names, payload: any) {
  try {
    await CallEvent.create({ call_id, event_name, payload });
    console.log(`Saved the event ${event_name}`);
  } catch (error) {
    console.error('Error saving the event:', error);
  }
}

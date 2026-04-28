import { describe, it } from 'vitest';

describe('POST /api/events', () => {
  it.todo('returns 201 and persists the event for a valid call_initiated payload');
  it.todo('returns 400 for an invalid payload');
  it.todo('returns 401 when the API key is missing');
});

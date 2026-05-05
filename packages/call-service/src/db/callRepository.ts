import { Call } from '../domain/call';
import { mapCallRow, mapCallEventRow } from '../db/mappers';
import { db } from '../db/client';
import { TABLE_CALLS, TABLE_CALL_EVENTS } from '../constants';

// Repository interface for call data access
export class CallRepository {
  // Create a new call
  async createCall(id: string, type: string, queueId: string): Promise<void> {
    await db.query(
      `INSERT INTO ${TABLE_CALLS} (id, type, status, queue_id, start_time) VALUES ($1, $2, $3, $4, $5)`,
      [id, type, 'waiting', queueId, new Date()]
    );
  }

  // Get call by ID
  async getCallById(id: string): Promise<any> {
    const result = await db.query(
      `SELECT id, type, status, queue_id, start_time, end_time FROM ${TABLE_CALLS} WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Update call status
  async updateCallStatus(id: string, status: string, additionalFields: Record<string, any> = {}): Promise<void> {
    const fields = Object.keys(additionalFields);
    let query = `UPDATE ${TABLE_CALLS} SET status = $1`;
    const values: any[] = [status];
    
    // Add additional fields
    fields.forEach((field, index) => {
      query += `, ${field} = $${index + 2}`;
      values.push(additionalFields[field]);
    });
    
    query += ` WHERE id = $${fields.length + 2}`;
    values.push(id);
    
    await db.query(query, values);
  }

  // Create call event
  async createCallEvent(id: string, callId: string, type: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await db.query(
      `INSERT INTO ${TABLE_CALL_EVENTS} (id, call_id, type, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [id, callId, type, new Date(), JSON.stringify(metadata)]
    );
  }

  // Get calls with filters
  async getCalls(filters: any): Promise<Call[]> {
    let query = `SELECT id, type, status, queue_id, start_time, end_time FROM ${TABLE_CALLS}`;
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (filters.status && filters.status !== 'all') {
      whereConditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if (filters.queueId) {
      whereConditions.push(`queue_id = $${params.length + 1}`);
      params.push(filters.queueId);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY start_time DESC';

    const result = await db.query(query, params);
    return result.rows.map(mapCallRow);
  }

  // Get call events by call ID
  async getCallEvents(callId: string): Promise<any[]> {
    // First verify the call exists
    const callResult = await db.query(
      `SELECT id FROM ${TABLE_CALLS} WHERE id = $1`,
      [callId]
    );
    if (callResult.rowCount === 0) {
      throw new Error(`Call with id ${callId} not found`);
    }

    const result = await db.query(
      `SELECT id, call_id, type, timestamp, metadata FROM ${TABLE_CALL_EVENTS} WHERE call_id = $1 ORDER BY timestamp ASC`,
      [callId]
    );
    return result.rows.map(mapCallEventRow);
  }
}
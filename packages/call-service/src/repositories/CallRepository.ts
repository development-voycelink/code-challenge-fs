import { eq, and } from 'drizzle-orm';
import type { CallStatus, QueueId } from '@voycelink/contracts';
import { db } from '../db/client';
import { callsTable } from '../db/schema';
import { Call } from '../domain/call';
import type { CallFilters } from '../domain/call';

export class CallRepository {
  async findCallById(id: string): Promise<Call | null> {
    const rows = await db
      .select()
      .from(callsTable)
      .where(eq(callsTable.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return new Call(row.id, row.type, row.status, row.queueId as QueueId, row.startTime, row.endTime ?? undefined);
  }

  async createCall(call: Call): Promise<void> {
    await db.insert(callsTable).values({
      id: call.id,
      type: call.type,
      status: call.status,
      queueId: call.queueId,
      startTime: call.startTime,
      endTime: call.endTime,
    });
  }

  async updateCallStatus(id: string, status: CallStatus, endTime?: Date): Promise<void> {
    await db
      .update(callsTable)
      .set({ status, ...(endTime ? { endTime } : {}) })
      .where(eq(callsTable.id, id));
  }

  async listCalls(filters: CallFilters): Promise<Call[]> {
    const conditions = [
      filters.status ? eq(callsTable.status, filters.status) : undefined,
      filters.queueId ? eq(callsTable.queueId, filters.queueId) : undefined,
    ].filter(Boolean);

    const rows = conditions.length > 0
      ? await db.select().from(callsTable).where(and(...(conditions as Parameters<typeof and>)))
      : await db.select().from(callsTable);

    return rows.map(
      (row) => new Call(row.id, row.type, row.status, row.queueId as QueueId, row.startTime, row.endTime ?? undefined),
    );
  }
}

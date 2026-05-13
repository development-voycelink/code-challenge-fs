import { eq, asc, and } from "drizzle-orm";
import { db } from "../db/client";
import { callEventsTable } from "../db/schema";
import { CallEvent } from "../domain/call";

export class CallEventRepository {
  async recordEvent(event: CallEvent): Promise<void> {
    await db.insert(callEventsTable).values({
      id: event.id,
      callId: event.callId,
      type: event.type,
      timestamp: event.timestamp,
      metadata: event.metadata ?? null,
    });
  }

  async listEventsForCall(callId: string): Promise<CallEvent[]> {
    const rows = await db
      .select()
      .from(callEventsTable)
      .where(eq(callEventsTable.callId, callId))
      .orderBy(asc(callEventsTable.timestamp));

    return rows.map(
      (row) =>
        new CallEvent(
          row.id,
          row.callId,
          row.type,
          row.timestamp,
          (row.metadata as Record<string, unknown>) ?? undefined,
        ),
    );
  }

  async findEventByTypeForCall(
    callId: string,
    type: string,
  ): Promise<CallEvent | null> {
    const rows = await db
      .select()
      .from(callEventsTable)
      .where(
        and(eq(callEventsTable.callId, callId), eq(callEventsTable.type, type)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return new CallEvent(
      row.id,
      row.callId,
      row.type,
      row.timestamp,
      (row.metadata as Record<string, unknown>) ?? undefined,
    );
  }
}

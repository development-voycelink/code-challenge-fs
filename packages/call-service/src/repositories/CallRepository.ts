import { eq, and, count, desc } from "drizzle-orm";
import type { CallStatus, QueueId } from "@voycelink/contracts";
import { db } from "../db/client";
import { callsTable } from "../db/schema";
import { Call } from "../domain/call";
import type { CallFilters } from "../domain/call";

export class CallRepository {
  async findCallById(id: string): Promise<Call | null> {
    const rows = await db
      .select()
      .from(callsTable)
      .where(eq(callsTable.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return new Call(
      row.id,
      row.type,
      row.status,
      row.queueId as QueueId,
      row.startTime,
      row.endTime ?? undefined,
    );
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

  async updateCallStatus(
    id: string,
    status: CallStatus,
    endTime?: Date,
  ): Promise<void> {
    await db
      .update(callsTable)
      .set({ status, ...(endTime ? { endTime } : {}) })
      .where(eq(callsTable.id, id));
  }

  async listCalls(
    filters: CallFilters,
  ): Promise<{ data: Call[]; total: number }> {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const conditions = [
      filters.status ? eq(callsTable.status, filters.status) : undefined,
      filters.queueId ? eq(callsTable.queueId, filters.queueId) : undefined,
    ].filter(Boolean) as Parameters<typeof and>;

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(callsTable)
      .where(where);

    const rows = await db
      .select()
      .from(callsTable)
      .where(where)
      .orderBy(desc(callsTable.startTime))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(
        (row) =>
          new Call(
            row.id,
            row.type,
            row.status,
            row.queueId as QueueId,
            row.startTime,
            row.endTime ?? undefined,
          ),
      ),
      total: Number(total),
    };
  }
}

import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const callTypeEnum = pgEnum("call_type", ["voice", "video"]);
export const callStatusEnum = pgEnum("call_status", [
  "waiting",
  "active",
  "on_hold",
  "ended",
]);

export const callsTable = pgTable(
  "calls",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    type: callTypeEnum("type").notNull(),
    status: callStatusEnum("status").notNull(),
    queueId: varchar("queue_id", { length: 100 }).notNull(),
    startTime: timestamp("start_time", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
  },
  (table) => [
    index("idx_calls_status").on(table.status),
    index("idx_calls_queue_id").on(table.queueId),
  ],
);

// call_events table
export const callEventsTable = pgTable(
  "call_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    callId: varchar("call_id", { length: 36 })
      .notNull()
      .references(() => callsTable.id, {
        onDelete: "cascade",
      }),
    type: varchar("type", { length: 50 }).notNull(),
    timestamp: timestamp("timestamp", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => [index("idx_call_events_call_id").on(table.callId)],
);

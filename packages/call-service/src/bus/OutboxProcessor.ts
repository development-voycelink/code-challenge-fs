import { db } from '../db/client';
import { publishStatusUpdate } from './publisher';

export class OutboxProcessor {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.processOutbox(), 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Pull up to 50 events
      const res = await db.query(
        `SELECT * FROM outbox_events ORDER BY id ASC LIMIT 50`
      );

      for (const row of res.rows) {
        try {
          await publishStatusUpdate({
            callId: row.call_id,
            status: row.status,
            eventType: row.event_type,
            timestamp: row.timestamp.toISOString(),
            metadata: row.metadata,
          });

          // Delete on success
          await db.query(`DELETE FROM outbox_events WHERE id = $1`, [row.id]);
        } catch (publishErr) {
          console.error(`Failed to publish outbox event ${row.id}:`, publishErr);
        }
      }
    } catch (e) {
      console.error('OutboxProcessor failed to query DB', e);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const outboxProcessor = new OutboxProcessor();

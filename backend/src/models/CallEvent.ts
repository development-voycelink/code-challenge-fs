import mongoose from 'mongoose';

const CallEventSchema = new mongoose.Schema({
  call_id: { type: String, required: true },
  event_name: { type: String, enum: ['call_initiated', 'call_routed', 'call_answered', 'call_hold', 'call_ended'], required: true },
  metadata: {
    type: new mongoose.Schema({
      queue_id: { type: String },
      agent_id: { type: String },
      wait_time: { type: Number },
      via: { type: String },
    }, { _id: false }),
  },
  created_at: { type: Date, default: Date.now }
});

export const CallEvent = mongoose.model('CallEvent', CallEventSchema);

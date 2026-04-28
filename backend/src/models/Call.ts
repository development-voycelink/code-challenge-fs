import mongoose from 'mongoose';

const CallSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['waiting', 'active', 'on_hold', 'ended'],
    required: true,
  },
  queue_id: { type: String, required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date }
});

export const Call = mongoose.model('Call', CallSchema);

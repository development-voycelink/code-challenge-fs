import mongoose from 'mongoose';

export async function connectToMongoDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/call_service');
    console.log('Connected to the db');
  } catch (error) {
    console.error('Error db connection:', error);
  }
}

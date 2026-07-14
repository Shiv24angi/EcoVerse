import mongoose, { Document, Schema } from 'mongoose';

export interface ICarbonCache extends Document {
  queryKey: string;
  carbonEstimate: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  calculation: string;
  source: string;
  createdAt: Date;
}

const CarbonCacheSchema = new Schema<ICarbonCache>({
  queryKey: { type: String, required: true, unique: true, index: true },
  carbonEstimate: { type: Number, required: true },
  category: { type: String, required: true },
  confidence: { type: String, enum: ['high', 'medium', 'low'], required: true },
  calculation: { type: String, required: true },
  source: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' }, // Automatically TTL expire after 30 days
});

// Prevent compile time model overwrite error in development/hot-reloads
export default mongoose.models.CarbonCache ||
  mongoose.model<ICarbonCache>('CarbonCache', CarbonCacheSchema);

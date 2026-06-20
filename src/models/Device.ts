import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export interface IDevice extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string; // e.g. "Chrome on macOS"
  type: 'desktop' | 'mobile' | 'tablet' | 'web';
  pushSubscription?: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'web'], default: 'web' },
    pushSubscription: {
      endpoint: { type: String },
      keys: {
        p256dh: { type: String },
        auth: { type: String },
      },
    },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Device: Model<IDevice> = models.Device || model<IDevice>('Device', deviceSchema);
export default Device;

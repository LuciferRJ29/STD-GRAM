import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: Types.ObjectId;
  refreshTokenHash: string;
  tokenVersion: number;
  rememberMe: boolean;
  ip: string;
  userAgent: string;
  location?: string;
  isRevoked: boolean;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    refreshTokenHash: { type: String, required: true },
    tokenVersion: { type: Number, required: true, default: 0 },
    rememberMe: { type: Boolean, default: false },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    location: { type: String },
    isRevoked: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

export const Session: Model<ISession> = models.Session || model<ISession>('Session', sessionSchema);
export default Session;

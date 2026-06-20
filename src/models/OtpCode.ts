import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface IOtpCode extends Document {
  email: string;
  codeHash: string;
  purpose: 'verify' | 'reset' | 'login-2fa';
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtpCode>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['verify', 'reset', 'login-2fa'], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

otpSchema.index({ email: 1, purpose: 1 });

export const OtpCode: Model<IOtpCode> = models.OtpCode || model<IOtpCode>('OtpCode', otpSchema);
export default OtpCode;

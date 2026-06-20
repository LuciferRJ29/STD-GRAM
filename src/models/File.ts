import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export type FileKind = 'image' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'gif';

export interface IFile extends Document {
  _id: Types.ObjectId;
  uploaderId: Types.ObjectId;
  kind: FileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string; // sha256, used for deduplication
  width?: number;
  height?: number;
  durationSeconds?: number;
  thumbnailFileId?: Types.ObjectId;

  // Storage provider reference (provider-agnostic)
  storage: {
    provider: 'mega' | 's3' | 'local';
    accountId: string; // which mega account / bucket holds this file
    remotePath: string; // path/handle within that provider
    nodeHandle?: string; // mega node handle, for fast lookups
  };

  isOrphaned: boolean; // true if not yet attached to a message/profile (cleanup candidate)
  refCount: number; // how many messages/places reference this file (dedup)

  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['image', 'video', 'audio', 'voice', 'document', 'sticker', 'gif'], required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    checksum: { type: String, required: true, index: true },
    width: Number,
    height: Number,
    durationSeconds: Number,
    thumbnailFileId: { type: Schema.Types.ObjectId, ref: 'File' },

    storage: {
      provider: { type: String, enum: ['mega', 's3', 'local'], required: true },
      accountId: { type: String, required: true },
      remotePath: { type: String, required: true },
      nodeHandle: { type: String },
    },

    isOrphaned: { type: Boolean, default: true },
    refCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

fileSchema.index({ checksum: 1, 'storage.provider': 1 });

export const File: Model<IFile> = models.File || model<IFile>('File', fileSchema);
export default File;

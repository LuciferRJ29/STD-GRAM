import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export type PrivacyLevel = 'everyone' | 'contacts' | 'nobody';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  bio?: string;
  avatarFileId?: Types.ObjectId;
  avatarVideoFileId?: Types.ObjectId;

  isEmailVerified: boolean;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  isFounder: boolean;
  isBanned: boolean;

  lastSeenAt: Date;
  isOnline: boolean;

  privacy: {
    lastSeen: PrivacyLevel;
    profilePhoto: PrivacyLevel;
    phoneNumber: PrivacyLevel;
    forwarding: PrivacyLevel;
    groupInvite: PrivacyLevel;
  };

  blockedUserIds: Types.ObjectId[];
  restrictedUserIds: Types.ObjectId[];

  twoFactor: {
    enabled: boolean;
    secret?: string;
    backupCodes?: string[];
  };

  tokenVersion: number; // bumped to invalidate all refresh tokens (e.g. on password change)

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 64 },
    passwordHash: { type: String, required: true },
    bio: { type: String, maxlength: 512, default: '' },
    avatarFileId: { type: Schema.Types.ObjectId, ref: 'File' },
    avatarVideoFileId: { type: Schema.Types.ObjectId, ref: 'File' },

    isEmailVerified: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isFounder: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    lastSeenAt: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },

    privacy: {
      lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      phoneNumber: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'contacts' },
      forwarding: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      groupInvite: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    },

    blockedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    restrictedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      backupCodes: { type: [String], select: false },
    },

    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ displayName: 'text', username: 'text' });

export const User: Model<IUser> = models.User || model<IUser>('User', userSchema);
export default User;

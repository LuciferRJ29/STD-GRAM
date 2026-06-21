import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export type ChatType = 'direct' | 'group' | 'channel';
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface IChatMember {
  userId: Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  mutedUntil?: Date;
  isBanned: boolean;
  isAnonymousAdmin: boolean;
  lastReadMessageId?: Types.ObjectId;
  lastReadAt?: Date;
  archivedAt?: Date;
  pinnedAt?: Date;
}

export interface IChat extends Document {
  _id: Types.ObjectId;
  type: ChatType;
  directKey?: string;
  name?: string;
  description?: string;
  avatarFileId?: Types.ObjectId;
  isPublic?: boolean;
  inviteCode?: string;
  slowModeSeconds?: number;
  requireJoinApproval?: boolean;
  members: IChatMember[];
  pendingJoinRequests: Types.ObjectId[];
  pinnedMessageIds: Types.ObjectId[];
  lastMessageId?: Types.ObjectId;
  lastMessageAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatMemberSchema = new Schema<IChatMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    mutedUntil: Date,
    isBanned: { type: Boolean, default: false },
    isAnonymousAdmin: { type: Boolean, default: false },
    lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastReadAt: Date,
    archivedAt: Date,
    pinnedAt: Date,
  },
  { _id: false },
);

const chatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ['direct', 'group', 'channel'], required: true },
    directKey: { type: String, index: true, sparse: true, unique: true },
    name: { type: String, maxlength: 128 },
    description: { type: String, maxlength: 512 },
    avatarFileId: { type: Schema.Types.ObjectId, ref: 'File' },
    isPublic: { type: Boolean, default: false },
    inviteCode: { type: String, index: true, sparse: true },
    slowModeSeconds: { type: Number, default: 0 },
    requireJoinApproval: { type: Boolean, default: false },
    members: { type: [chatMemberSchema], default: [] },
    pendingJoinRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pinnedMessageIds: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

chatSchema.index({ 'members.userId': 1, lastMessageAt: -1 });
chatSchema.index({ name: 'text', description: 'text' });

export function buildDirectKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join('_');
}

export const Chat: Model<IChat> = models.Chat || model<IChat>('Chat', chatSchema);
export default Chat;

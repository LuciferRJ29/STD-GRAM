import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;

  text?: string;
  fileIds: Types.ObjectId[];

  replyToMessageId?: Types.ObjectId;
  forwardedFromMessageId?: Types.ObjectId;
  forwardedFromChatId?: Types.ObjectId;
  forwardedFromUserId?: Types.ObjectId;

  mentions: Types.ObjectId[]; // mentioned user ids
  hashtags: string[];

  reactions: IReaction[];

  deliveredTo: Types.ObjectId[];
  readBy: Types.ObjectId[];

  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isPinned: boolean;
  isSilent: boolean;

  scheduledFor?: Date;
  isSent: boolean; // false while waiting for scheduledFor

  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    text: { type: String, maxlength: 4096 },
    fileIds: [{ type: Schema.Types.ObjectId, ref: 'File' }],

    replyToMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    forwardedFromMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    forwardedFromChatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
    forwardedFromUserId: { type: Schema.Types.ObjectId, ref: 'User' },

    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    hashtags: [{ type: String, index: true }],

    reactions: { type: [reactionSchema], default: [] },

    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    isPinned: { type: Boolean, default: false },
    isSilent: { type: Boolean, default: false },

    scheduledFor: { type: Date, index: true },
    isSent: { type: Boolean, default: true },
  },
  { timestamps: true },
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ text: 'text' });

export const Message: Model<IMessage> = models.Message || model<IMessage>('Message', messageSchema);
export default Message;

import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

export type NotificationType =
  | 'message'
  | 'mention'
  | 'reaction'
  | 'group_invite'
  | 'join_request'
  | 'added_to_group'
  | 'role_changed';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // recipient
  type: NotificationType;
  actorId?: Types.ObjectId; // who triggered it
  chatId?: Types.ObjectId;
  messageId?: Types.ObjectId;
  text: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['message', 'mention', 'reaction', 'group_invite', 'join_request', 'added_to_group', 'role_changed'],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  models.Notification || model<INotification>('Notification', notificationSchema);
export default Notification;

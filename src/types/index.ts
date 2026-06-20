export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarFileId?: string;
  isOnline?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  lastSeenAt?: string;
}

export interface ChatListItem {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  username?: string;
  avatarFileId?: string;
  isOnline?: boolean;
  lastMessage: { text?: string; senderId: string; createdAt: string; isDeleted?: boolean } | null;
  lastMessageAt?: string;
  unreadCount: number;
  isArchived?: boolean;
  isPinned?: boolean;
  memberCount?: number;
  role?: string;
}

export interface ReactionItem {
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface MessageItem {
  _id: string;
  chatId: string;
  senderId: UserSummary | string;
  text?: string;
  fileIds: any[];
  replyToMessageId?: string;
  forwardedFromMessageId?: string;
  forwardedFromUserId?: string;
  mentions: string[];
  hashtags: string[];
  reactions: ReactionItem[];
  deliveredTo: string[];
  readBy: string[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  isSilent: boolean;
  createdAt: string;
  updatedAt: string;
}

import { Chat, type IChat, type IChatMember, type MemberRole } from '@/models';
import { Types } from 'mongoose';

export interface ChatAccessResult {
  chat: IChat;
  member: IChatMember;
}

const ROLE_RANK: Record<MemberRole, number> = { member: 0, moderator: 1, admin: 2, owner: 3 };

/** Loads a chat and verifies the user is a non-banned member. Returns null if access denied. */
export async function getChatForMember(chatId: string, userId: string): Promise<ChatAccessResult | null> {
  if (!Types.ObjectId.isValid(chatId)) return null;

  const chat = await Chat.findById(chatId);
  if (!chat) return null;

  const member = chat.members.find((m) => String(m.userId) === userId);
  if (!member || member.isBanned) return null;

  return { chat, member };
}

export function hasRoleAtLeast(member: IChatMember, role: MemberRole): boolean {
  return ROLE_RANK[member.role] >= ROLE_RANK[role];
}

export function isSlowModeBlocked(chat: IChat, member: IChatMember, lastMessageAt?: Date): boolean {
  if (chat.type !== 'group' || !chat.slowModeSeconds || hasRoleAtLeast(member, 'moderator')) return false;
  if (!lastMessageAt) return false;
  return Date.now() - lastMessageAt.getTime() < chat.slowModeSeconds * 1000;
}

import { z } from 'zod';

export const createChatSchema = z.object({
  type: z.enum(['direct', 'group']),
  participantIds: z.array(z.string()).min(1),
  name: z.string().min(1).max(128).optional(), // required for groups
  description: z.string().max(512).optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().max(4096).optional(),
  replyToMessageId: z.string().optional(),
  forwardedFromMessageId: z.string().optional(),
  fileIds: z.array(z.string()).max(10).optional(),
  silent: z.boolean().optional().default(false),
  scheduledFor: z.string().datetime().optional(),
});

export const editMessageSchema = z.object({
  text: z.string().min(1).max(4096),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const typingSchema = z.object({
  isTyping: z.boolean(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  slowModeSeconds: z.number().min(0).max(3600).optional(),
});

export const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'moderator', 'member']),
});

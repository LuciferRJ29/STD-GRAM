import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(512).optional(),
  avatarFileId: z.string().optional(),
  avatarVideoFileId: z.string().optional(),
});

export const updatePrivacySchema = z.object({
  lastSeen: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  profilePhoto: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  phoneNumber: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  forwarding: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  groupInvite: z.enum(['everyone', 'contacts', 'nobody']).optional(),
});

export const blockUserSchema = z.object({
  userId: z.string(),
});

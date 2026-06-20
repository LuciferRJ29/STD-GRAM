import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(5, 'Username must be at least 5 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Username must start with a letter and contain only letters, numbers, and underscores');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email address').toLowerCase(),
  username: usernameSchema,
  displayName: z.string().min(1, 'Display name is required').max(64),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const resendOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  purpose: z.enum(['verify', 'reset']).default('verify'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6),
  newPassword: passwordSchema,
});

export const twoFactorVerifySchema = z.object({
  token: z.string().length(6),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

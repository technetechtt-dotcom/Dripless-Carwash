import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(8).max(128);

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128)
  })
  .strict();

export const customerSignupSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
    phone: z.string().trim().min(7).max(32).optional()
  })
  .strict();

export const driverSignupSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
    vehicle: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(32).optional(),
    plateNumber: z.string().trim().min(2).max(32).optional()
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(20).max(500)
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(20).max(500)
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema
  })
  .strict();

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(20).max(500),
    password: passwordSchema
  })
  .strict();

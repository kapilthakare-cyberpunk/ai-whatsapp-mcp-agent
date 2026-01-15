import { z } from 'zod';

export const ToneSchema = z.enum(['professional', 'personal']);
export type Tone = z.infer<typeof ToneSchema>;

export const SendSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
});
export type SendPayload = z.infer<typeof SendSchema>;

export const ProcessAiSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  tone: ToneSchema,
});
export type ProcessAiPayload = z.infer<typeof ProcessAiSchema>;

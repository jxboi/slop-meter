import { z } from 'zod';

export const scanRequestSchema = z.object({
  repoId: z.string(),
  harness: z.enum(['static', 'codex', 'claude', 'copilot', 'openai', 'anthropic']),
  model: z
    .string()
    .max(100)
    .regex(/^[\w./:@-]*$/),
  effort: z.enum(['low', 'medium', 'high']),
  depth: z.enum(['quick', 'standard', 'deep']),
  profileId: z.string(),
  apiKey: z.string().trim().min(10).max(500).optional(),
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;

export function splitScanRequest(request: ScanRequest) {
  const { apiKey, ...input } = request;
  return { apiKey, input };
}

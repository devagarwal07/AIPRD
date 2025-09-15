import { z } from 'zod';

// Define the shape of required / optional environment variables for the frontend.
// Only variables exposed via Vite (VITE_*) are accessible at runtime.
const schema = z.object({
  VITE_GEMINI_API_KEY: z.string().min(1, 'Missing Gemini API key').optional(),
  VITE_GEMINI_MODEL: z.string().optional(),
  VITE_API_BASE: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Missing Clerk publishable key').optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  // import.meta.env is a plain object; coerce to partial Env for validation
  const input: Record<string, unknown> = {};
  for (const k of Object.keys((import.meta as any).env || {})) {
    if (k.startsWith('VITE_')) input[k] = (import.meta as any).env[k];
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    // Surface a concise summary in dev; do not throw to avoid blocking if optional
    if (import.meta.env.DEV) {
      console.warn('[env] Validation issues:', parsed.error.flatten().fieldErrors);
    }
    cached = input as Env; // best effort
    return cached;
  }
  cached = parsed.data;
  return cached;
}

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const v = getEnv()[key];
  if (v == null || v === '') {
    throw new Error(`Missing required env var: ${String(key)}`);
  }
  return v as NonNullable<Env[K]>;
}

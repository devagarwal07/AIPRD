import { toast } from './toast';
import { metric } from './telemetry';

export type AIErrorCategory = 'rate-limit' | 'network' | 'timeout' | 'auth' | 'safety' | 'unknown';

export function classifyError(e: any): AIErrorCategory {
  const msg = String(e?.message || e || '').toLowerCase();
  if (msg.includes('rate') && msg.includes('limit')) return 'rate-limit';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return 'network';
  if (msg.includes('timed out') || msg.includes('timeout')) return 'timeout';
  if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('api key')) return 'auth';
  if (msg.includes('safety') || msg.includes('blocked')) return 'safety';
  return 'unknown';
}

export interface BackoffOptions {
  tries?: number;           // total attempts
  baseDelayMs?: number;     // base delay
  maxDelayMs?: number;      // cap
  jitter?: boolean;         // add random jitter
  onRetry?: (info: { attempt: number; delay: number; category: AIErrorCategory }) => void;
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: BackoffOptions = {}): Promise<T> {
  const { tries = 3, baseDelayMs = 300, maxDelayMs = 4000, jitter = true, onRetry } = opts;
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const category = classifyError(e);
      metric('ai_retry', { attempt: i + 1, category });
      if (i === tries - 1) break;
      let delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, i));
      if (jitter) delay += Math.floor(Math.random() * 0.4 * delay);
      onRetry?.({ attempt: i + 1, delay, category });
      // Show minimal user feedback for first retry only (non-intrusive)
      if (i === 0) {
        if (category === 'rate-limit') toast.info('AI busy, retrying...');
        else if (category === 'network') toast.info('Network issue, retrying AI call...');
        else if (category === 'timeout') toast.info('Slow response, retrying...');
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

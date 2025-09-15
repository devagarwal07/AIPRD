import { toast } from './toast';
import { metric } from './telemetry';

// Normalizes AI / network errors to user-friendly messages with optional telemetry.
export function handleAiError(err: unknown, context: { phase: string; model?: string }) {
  let code = 'unknown';
  const msg = (err as any)?.message || String(err);
  if (/quota|rate/i.test(msg)) code = 'rate_limit';
  else if (/timeout|timed out/i.test(msg)) code = 'timeout';
  else if (/network|fetch/i.test(msg)) code = 'network';
  else if (/permission|auth|unauthorized/i.test(msg)) code = 'auth';
  metric('ai_error', { code, phase: context.phase, model: context.model });
  switch (code) {
    case 'rate_limit': toast.error('AI temporarily rate limited. Retry in a moment.'); break;
    case 'timeout': toast.error('AI request timed out. You can retry.'); break;
    case 'network': toast.error('Network issue reaching AI service. Check connection.'); break;
    case 'auth': toast.error('AI auth failed. Verify your API key.'); break;
    default: toast.error('AI request failed. Please retry.');
  }
}

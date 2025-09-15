import { assessPRDGemini, suggestImprovementsGemini } from './gemini';
import { getPromptVariant } from './prompts';
import { metric } from './telemetry';
import { handleAiError } from './aiErrors';
import { safeStorage } from './storage';

interface SuggestKeyPayload {
  title: string; problem: string; solution: string; objectives: string[]; userStories: string[]; requirements: string[];
}

interface CacheEntry<T> { ts: number; data: T; }

class AIOrchestrator {
  private suggestToken = 0;
  private assessToken = 0;
  private suggestCache = new Map<string, CacheEntry<any>>();
  private assessCache = new Map<string, CacheEntry<any>>();
  private ttlMs = 60_000; // 1 min cache
  private currentSuggestAbort: AbortController | null = null;
  private currentAssessAbort: AbortController | null = null;
  private maxEntries = 30;
  private static SUGGEST_CACHE_KEY = 'pmc_ai_suggest_cache_v1';
  private static ASSESS_CACHE_KEY = 'pmc_ai_assess_cache_v1';

  constructor(){
    // Hydrate caches (best effort, ignore errors)
    try {
      const rawS = safeStorage.getItem(AIOrchestrator.SUGGEST_CACHE_KEY);
      if(rawS){
        const parsed: Array<[string, CacheEntry<any>]> = JSON.parse(rawS);
        const now = Date.now();
        for(const [k,v] of parsed){ if(now - v.ts < this.ttlMs) this.suggestCache.set(k,v); }
      }
    } catch {}
    try {
      const rawA = safeStorage.getItem(AIOrchestrator.ASSESS_CACHE_KEY);
      if(rawA){
        const parsed: Array<[string, CacheEntry<any>]> = JSON.parse(rawA);
        const now = Date.now();
        for(const [k,v] of parsed){ if(now - v.ts < this.ttlMs) this.assessCache.set(k,v); }
      }
    } catch {}
  }

  private persistCaches(){
    try {
      // prune before persist
      if(this.suggestCache.size > this.maxEntries){
        const entries = [...this.suggestCache.entries()].sort((a,b)=> b[1].ts - a[1].ts).slice(0,this.maxEntries);
        this.suggestCache = new Map(entries);
      }
      if(this.assessCache.size > this.maxEntries){
        const entries = [...this.assessCache.entries()].sort((a,b)=> b[1].ts - a[1].ts).slice(0,this.maxEntries);
        this.assessCache = new Map(entries);
      }
      safeStorage.setItem(AIOrchestrator.SUGGEST_CACHE_KEY, JSON.stringify([...this.suggestCache.entries()]));
      safeStorage.setItem(AIOrchestrator.ASSESS_CACHE_KEY, JSON.stringify([...this.assessCache.entries()]));
    } catch {}
  }

  private key(obj: any) { return JSON.stringify(obj); }

  async getSuggestions(stepIndex: number, payload: SuggestKeyPayload, ctx: { model: string; stepKey: string | undefined }) {
    // Separate cache buckets: suggestions + objectives keyed by step and stable payload hash.
    const key = this.key({ stepIndex, payload, v: 2 });
    const now = Date.now();
    const cached = this.suggestCache.get(key);
    if (cached && now - cached.ts < this.ttlMs) {
      metric('ai_suggest_ms', { ms: 0, step: ctx.stepKey || 'unknown', cached: true, promptVariant: getPromptVariant() });
      return cached.data;
    }
    const token = ++this.suggestToken;
    if (this.currentSuggestAbort) this.currentSuggestAbort.abort();
    this.currentSuggestAbort = new AbortController();
    const started = now;
    try {
      const res = await suggestImprovementsGemini(stepIndex, payload as any, this.currentSuggestAbort.signal);
      if (token !== this.suggestToken) return { suggestions: [], objectives: [] }; // stale
  // Normalize empty arrays to avoid downstream identity churn
  const norm = { suggestions: Array.isArray(res?.suggestions)? res.suggestions : [], objectives: Array.isArray((res as any)?.objectives)? (res as any).objectives : [] };
  this.suggestCache.set(key, { ts: Date.now(), data: norm });
  this.persistCaches();
  metric('ai_suggest_ms', { ms: Date.now() - started, step: ctx.stepKey || 'unknown', cached: false, promptVariant: getPromptVariant() });
  return norm;
    } catch (e) {
      if ((e as any)?.name === 'AbortError') return { suggestions: [], objectives: [] };
      // Single fallback retry (no cache write if fails again)
      try {
        const retry = await suggestImprovementsGemini(stepIndex, payload as any, this.currentSuggestAbort.signal);
        if (token !== this.suggestToken) return { suggestions: [], objectives: [] };
  metric('ai_suggest_retry', { step: ctx.stepKey || 'unknown', promptVariant: getPromptVariant() });
        const normRetry = { suggestions: Array.isArray(retry?.suggestions)? retry.suggestions : [], objectives: Array.isArray((retry as any)?.objectives)? (retry as any).objectives : [] };
        this.suggestCache.set(key, { ts: Date.now(), data: normRetry });
        this.persistCaches();
        return normRetry;
      } catch (e2) {
        handleAiError(e2, { phase: 'suggest', model: ctx.model });
        return { suggestions: [], objectives: [] };
      }
    }
  }

  async assess(payload: SuggestKeyPayload, ctx: { model: string }) {
    const key = this.key({ assess: true, payload, v: 1 });
    const now = Date.now();
    const cached = this.assessCache.get(key);
    if (cached && now - cached.ts < this.ttlMs) {
      metric('ai_assess_ms', { ms: 0, cached: true, promptVariant: getPromptVariant() });
      return cached.data;
    }
    const token = ++this.assessToken;
    if (this.currentAssessAbort) this.currentAssessAbort.abort();
    this.currentAssessAbort = new AbortController();
    const started = now;
    try {
      const res = await assessPRDGemini(payload as any, this.currentAssessAbort.signal);
      if (token !== this.assessToken) return { score: null, missing: [], suggestions: [] };
      this.assessCache.set(key, { ts: Date.now(), data: res });
  this.persistCaches();
  metric('ai_assess_ms', { ms: Date.now() - started, cached: false, promptVariant: getPromptVariant() });
      return res;
    } catch (e) {
      if ((e as any)?.name === 'AbortError') return { score: null, missing: [], suggestions: [] };
      try {
        const retry = await assessPRDGemini(payload as any, this.currentAssessAbort.signal);
        if (token !== this.assessToken) return { score: null, missing: [], suggestions: [] };
  metric('ai_assess_retry', { promptVariant: getPromptVariant() });
        this.assessCache.set(key, { ts: Date.now(), data: retry });
        this.persistCaches();
        return retry;
      } catch (e2) {
        handleAiError(e2, { phase: 'assess', model: ctx.model });
        return { score: 0, missing: [], suggestions: [], checks: [] } as any;
      }
    }
  }

  cancelSuggestions() {
    if (this.currentSuggestAbort) {
      this.currentSuggestAbort.abort();
      this.currentSuggestAbort = null;
    }
  }
  cancelAssess() {
    if (this.currentAssessAbort) {
      this.currentAssessAbort.abort();
      this.currentAssessAbort = null;
    }
  }
  isSuggesting() { return !!this.currentSuggestAbort && !this.currentSuggestAbort.signal.aborted; }
  isAssessing() { return !!this.currentAssessAbort && !this.currentAssessAbort.signal.aborted; }
}

export const aiOrchestrator = new AIOrchestrator();

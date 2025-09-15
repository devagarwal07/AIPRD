import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from '../utils/storage';

export interface PRDFormState {
  title: string;
  problem: string;
  solution: string;
  objectives: string[];
  userStories: string[];
  requirements: string[];
  riceScores?: Array<{ id: string; name: string; reach: number; impact: number; confidence: number; effort: number; rice: number; category?: string }>;
  acceptanceCriteria?: Array<{ id: string; storyIndex: number; text: string; done: boolean }>;
  // Historical snapshots of acceptance progress for burndown (timestamp + done count + total)
  acceptanceBurndown?: Array<{ ts: number; done: number; total: number }>;
}
export interface SectionsState { problem: boolean; solution: boolean; objectives?: boolean; userStories: boolean; requirements: boolean; }

export interface SnapshotState {
  id: string;
  ts: number;
  note?: string;
  formData: PRDFormState;
  sections: SectionsState;
  templateId: string;
  schemaVersion?: number; // for future migrations
  compressed?: boolean;   // indicates formData was stored compressed (not yet used for reading since we inline store raw)
}

interface PRDStore {
  // Multi-PRD workspace (stub): active top-level state reflects selected PRD.
  prds?: Record<string, { name: string; formData: PRDFormState; sections: SectionsState; snapshots: SnapshotState[]; templateId: string; mode: 'draft'|'final' }>; // persisted map
  activePrdId?: string;
  createPrd?: (name?: string) => string; // returns new id
  switchPrd?: (id: string) => boolean;
  templateId: string;
  setTemplateId: (id: string) => void;
  mode: 'draft' | 'final';
  setMode: (m: 'draft' | 'final') => void;
  sections: SectionsState;
  setSections: (s: Partial<SectionsState>) => void;
  formData: PRDFormState;
  updateForm: <K extends keyof PRDFormState>(k: K, v: PRDFormState[K]) => void;
  replaceForm: (f: PRDFormState) => void;
  addAcceptance: (storyIndex: number, text: string) => void;
  toggleAcceptance: (id: string) => void;
  snapshots: SnapshotState[];
  addSnapshot: (s: Omit<SnapshotState, 'id' | 'ts'> & { note?: string }) => SnapshotState;
  restoreSnapshot: (id: string) => SnapshotState | undefined;
  deleteSnapshot: (id: string) => void;
  lastRestored?: { formData: PRDFormState; sections: SectionsState; templateId: string } | null;
  undoRestore: () => boolean;
}

const DEFAULT_FORM: PRDFormState = { title: '', problem: '', solution: '', objectives: [''], userStories: [''], requirements: [''], riceScores: [], acceptanceCriteria: [], acceptanceBurndown: [] };
const DEFAULT_SECTIONS: SectionsState = { problem: true, solution: true, objectives: true, userStories: true, requirements: true };

export const usePrdStore = create<PRDStore>()(persist((set, get) => ({
  prds: undefined, // lazily initialized on first create/switch call
  activePrdId: 'default',
  createPrd: (name) => {
    const id = Math.random().toString(36).slice(2);
    const st = get();
    const entry = { name: name || `PRD ${Object.keys(st.prds||{}).length + 1}`, formData: { ...DEFAULT_FORM }, sections: { ...DEFAULT_SECTIONS }, snapshots: [], templateId: 'default', mode: 'draft' as const };
    set({ prds: { ...(st.prds||{}), [id]: entry } });
    // Switch to new PRD
    (get().switchPrd as any)?.(id);
    return id;
  },
  switchPrd: (id: string) => {
    const st = get();
    if (st.activePrdId === id) return true;
    const map = st.prds || {};
    // Persist current active into map snapshot
    const currentId = st.activePrdId || 'default';
    map[currentId] = map[currentId] || { name: 'Default PRD', formData: st.formData, sections: st.sections, snapshots: st.snapshots, templateId: st.templateId, mode: st.mode };
    // If target exists load it; else initialize
    if (!map[id]) return false;
    const target = map[id];
    set({
      prds: map,
      activePrdId: id,
      formData: target.formData,
      sections: target.sections,
      snapshots: target.snapshots,
      templateId: target.templateId,
      mode: target.mode,
      lastRestored: null,
    });
    return true;
  },
  templateId: typeof localStorage !== 'undefined' ? (localStorage.getItem('pmcopilot_prd_template_id') || 'default') : 'default',
  setTemplateId: (id) => set({ templateId: id }),
  mode: typeof localStorage !== 'undefined' ? ((localStorage.getItem('pmcopilot_prd_mode') as 'draft'|'final') || 'draft') : 'draft',
  setMode: (m) => { try { localStorage.setItem('pmcopilot_prd_mode', m); } catch {}; set({ mode: m }); },
  sections: DEFAULT_SECTIONS,
  setSections: (s) => set((st) => ({ sections: { ...st.sections, ...s } })),
  formData: DEFAULT_FORM,
  updateForm: (k, v) => set((st) => ({ formData: { ...st.formData, [k]: v } })),
  replaceForm: (f) => set({ formData: f }),
  addAcceptance: (storyIndex, text) => set(st => {
    const next = [ ...(st.formData.acceptanceCriteria||[]), { id: Math.random().toString(36).slice(2), storyIndex, text, done: false } ];
    const done = next.filter(c=>c.done).length;
    const total = next.length;
    const history = [ ...(st.formData.acceptanceBurndown||[]), { ts: Date.now(), done, total } ].slice(-500);
    return { formData: { ...st.formData, acceptanceCriteria: next, acceptanceBurndown: history } };
  }),
  toggleAcceptance: (id) => set(st => {
    const next = (st.formData.acceptanceCriteria||[]).map(c => c.id===id? { ...c, done: !c.done }: c);
    const done = next.filter(c=>c.done).length;
    const total = next.length;
    const history = [ ...(st.formData.acceptanceBurndown||[]), { ts: Date.now(), done, total } ].slice(-500);
    return { formData: { ...st.formData, acceptanceCriteria: next, acceptanceBurndown: history } };
  }),
  snapshots: [],
  lastRestored: null,
  addSnapshot: ({ formData, sections, templateId, note }) => {
    // placeholder for future compression toggle; keep raw for now but set schemaVersion
    const snap: SnapshotState = { id: Math.random().toString(36).slice(2), ts: Date.now(), note, formData, sections, templateId, schemaVersion: 1, compressed: false };
    set((st) => ({ snapshots: [snap, ...st.snapshots].slice(0, 50) }));
    return snap;
  },
  restoreSnapshot: (id) => {
    const s = get().snapshots.find(s => s.id === id); if (!s) return undefined;
    // capture current state for undo
    const current = get();
    set({
      formData: s.formData,
      sections: s.sections,
      templateId: s.templateId,
      lastRestored: { formData: current.formData, sections: current.sections, templateId: current.templateId }
    });
    try { window.dispatchEvent(new CustomEvent('pmc_snapshot_restored', { detail: { id: s.id, ts: s.ts } })); } catch {}
    return s;
  },
  undoRestore: () => {
    const prev = get().lastRestored;
    if(!prev) return false;
    set({ formData: prev.formData, sections: prev.sections, templateId: prev.templateId, lastRestored: null });
    try { window.dispatchEvent(new CustomEvent('pmc_snapshot_undo_success', {})); } catch {}
    return true;
  },
  deleteSnapshot: (id) => set((st) => ({ snapshots: st.snapshots.filter(s => s.id !== id) })),
}), {
  name: 'pmcopilot_prd_store',
  storage: {
    getItem: (name) => {
      const v = safeStorage.getItem(name);
      return v ? JSON.parse(v) : null;
    },
    setItem: (name, value) => {
      safeStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name) => safeStorage.removeItem(name)
  }
}));

import { useEffect, useRef, useState, useMemo, Suspense, lazy, Profiler } from 'react';
import { useI18n } from '../i18n';
import { StepsNav } from './prd/StepsNav';
import { StepEditor } from './prd/StepEditor';
import { TemplateSections } from './prd/TemplateSections';
// Code-split heavy right-panel components
const AssistantPanel = lazy(()=> import('./prd/AssistantPanel').then(m=> ({ default: m.AssistantPanel })));
const SnapshotHistory = lazy(()=> import('./prd/SnapshotHistory').then(m=> ({ default: m.SnapshotHistory })));
const ConfigIntegrations = lazy(()=> import('./prd/ConfigIntegrations').then(m=> ({ default: m.ConfigIntegrations })));
const ProfilerDashboard = lazy(()=> import('./prd/ProfilerDashboard').then(m=> ({ default: m.ProfilerDashboard })));

// Preload helpers (invoked on hover)
const preloadAssistant = () => import('./prd/AssistantPanel');
const preloadHistory = () => import('./prd/SnapshotHistory');
const preloadConfig = () => import('./prd/ConfigIntegrations');

// Idle prefetch: after first paint schedule all preloads lazily
if (typeof window !== 'undefined') {
  const schedule = (fn: ()=>void) => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(fn, { timeout: 3000 });
    } else {
      setTimeout(fn, 1200);
    }
  };
  schedule(()=> preloadAssistant());
  schedule(()=> preloadHistory());
  schedule(()=> preloadConfig());
}
import { usePrdStore } from '../store/prdStore';
import { Download, Clipboard, Share2 } from 'lucide-react';
import { writeClipboard } from '../utils/clipboard';
import { ErrorBoundary } from './prd/ErrorBoundary';
import { aiOrchestrator } from '../utils/aiOrchestrator';
import { metric } from '../utils/telemetry';
import { buildShareUrl } from '../utils/share';
import { deriveActiveSteps } from './prd/steps';
import { toast } from '../utils/toast';
import { prdToHtml, prdToPdfReal, prdToPdfPlaceholder } from '../utils/exporters';
import { scenarioPresets, mergePresetSeed, ScenarioPreset } from '../utils/scenarioPresets';
import { usePrdStore as useStoreForDiff } from '../store/prdStore';
import { renderDiff } from '../utils/diff';

// Temporary placeholder after refactor step. The previous large PRDBuilder implementation
// was removed while introducing centralized state & modular subcomponents. A reconstructed
// editor UI will be re-added in the next step.

// Replace previous placeholder export with functional component
export default function PRDBuilder() {
  const { t } = useI18n();
  const sections = usePrdStore(s=>s.sections);
  const form = usePrdStore(s=>s.formData);
  const mode = usePrdStore(s=>s.mode);
  const setMode = usePrdStore(s=>s.setMode);
  const createPrd = usePrdStore(s=>s.createPrd);
  const switchPrd = usePrdStore(s=>s.switchPrd);
  const prds = usePrdStore(s=>s.prds);
  const activePrdId = usePrdStore(s=>s.activePrdId);
  const active = useMemo(()=> deriveActiveSteps(sections), [sections]);
  const [announce, setAnnounce] = useState('');
  const [current, setCurrent] = useState(0);
  type RightTab = 'ai' | 'history' | 'config' | 'metrics' | 'collab';
  const [rightTab, setRightTab] = useState<RightTab>('ai');
  // Right panel tabs metadata (stable order) for keyboard navigation
  const rightTabs: { id: RightTab; label: string; hidden?: boolean }[] = [
    { id: 'ai', label: 'Assistant' },
    { id: 'history', label: 'History' },
    { id: 'config', label: 'Configure' },
    { id: 'collab', label: 'Collab' },
    { id: 'metrics', label: 'Metrics', hidden: import.meta.env.MODE === 'production' }
  ];
  const visibleRightTabs = rightTabs.filter(t => !t.hidden);
  const tablistRef = useRef<HTMLDivElement|null>(null);

  const focusTabByIndex = (idx: number) => {
    const container = tablistRef.current;
    if(!container) return;
    const buttons = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    const clamped = ((idx % buttons.length) + buttons.length) % buttons.length; // safe wrap
    const btn = buttons[clamped];
    if(btn){
      btn.focus();
      const id = btn.getAttribute('data-tabid') as RightTab | null;
      if(id) setRightTab(id);
    }
  };

  const onRightTabKeyDown = (e: React.KeyboardEvent) => {
    if(e.altKey || e.metaKey || e.ctrlKey) return;
    const key = e.key;
    const currentIndex = visibleRightTabs.findIndex(t=>t.id===rightTab);
    switch(key){
      case 'ArrowRight':
      case 'ArrowDown': // allow vertical arrow for ergonomics / screen readers
        e.preventDefault();
        focusTabByIndex(currentIndex+1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusTabByIndex(currentIndex-1);
        break;
      case 'Home':
        e.preventDefault();
        focusTabByIndex(0);
        break;
      case 'End':
        e.preventDefault();
        focusTabByIndex(visibleRightTabs.length-1);
        break;
      case 'Enter':
      case ' ':
        // already selected on focus change; ensure selection if user pressed on focused tab
        e.preventDefault();
        setRightTab(visibleRightTabs[currentIndex].id);
        break;
    }
  };

  // Global snapshot announcements (live region in this component ensures availability even when history tab not focused)
  const liveRegionRef = useRef<HTMLDivElement|null>(null);
  useEffect(()=> {
    const restored = () => { if(liveRegionRef.current) liveRegionRef.current.textContent = 'Snapshot restored'; };
    const undone = () => { if(liveRegionRef.current) liveRegionRef.current.textContent = 'Snapshot restore undone'; };
    window.addEventListener('pmc_snapshot_restored', restored);
    window.addEventListener('pmc_snapshot_undo_success', undone);
    return () => { window.removeEventListener('pmc_snapshot_restored', restored); window.removeEventListener('pmc_snapshot_undo_success', undone); };
  }, []);
  const updateForm = usePrdStore(s=>s.updateForm);
  const setSections = usePrdStore(s=>s.setSections);
  const sectionsState = usePrdStore(s=>s.sections);

  // Scenario preset selection state
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | 'custom'>(()=>{
    if (typeof localStorage !== 'undefined') return localStorage.getItem('pmcopilot_active_preset') || 'custom';
    return 'custom';
  });
  const activePreset = useMemo(()=> scenarioPresets.find(p=>p.id===activePresetId) || null, [activePresetId]);

  // If user manually toggles sections via TemplateSections component (not shown here) we can detect divergence.
  useEffect(()=>{
    if(activePreset){
      // If any section value diverges from preset, mark custom.
      const diff = Object.entries(activePreset.sections).some(([k,v])=> (sectionsState as any)[k] !== v);
      if(diff) setActivePresetId('custom');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionsState.problem, sectionsState.solution, sectionsState.objectives, sectionsState.userStories, sectionsState.requirements]);

  const applyScenarioPreset = (p: ScenarioPreset) => {
    // Apply section visibility
    setSections(p.sections as any);
    // Seed empty fields only
    const seed = mergePresetSeed(form, p);
    Object.entries(seed).forEach(([k,v])=> updateForm(k as any, v as any));
    setActivePresetId(p.id);
    try { localStorage.setItem('pmcopilot_active_preset', p.id); } catch {}
    toast.success(`Applied preset: ${p.label}`);
    try { metric('scenario_preset_applied', { id: p.id, seededKeys: Object.keys(seed).length }); } catch {}
    setShowPresetModal(false);
  };

  // Autosave indicator (store persistence already handled by zustand/persist; we simulate lifecycle)
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number|null>(null);
  const autosaveTimer = useRef<number|undefined>();
  const lastChangeRef = useRef<number>(0);
  // Debounce detection of form field changes -> mark saving and then saved
  useEffect(()=>{
    // Mark change
    lastChangeRef.current = Date.now();
    setSaving(true);
    if(autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    // Simulate async persist cost (~200ms) + debounce window (600ms)
    autosaveTimer.current = window.setTimeout(()=>{
      // If another change happened after this timer was scheduled, a newer timer will run later.
      setSaving(false);
      setLastSaved(Date.now());
      try { metric('autosave_success', { msSinceChange: Date.now() - lastChangeRef.current }); } catch {}
    }, 800);
    return ()=>{ if(autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.problem, form.solution, form.objectives, form.userStories, form.requirements]);

  // AI orchestrator state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [score, setScore] = useState<number|null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number|null>(null);
  const [aiError, setAiError] = useState<string|null>(null);
  const pendingRefresh = useRef(false);
  const editorsRef = useRef<Record<string, HTMLElement|null>>({});
  const model = 'gemini-pro';

  // Debounced trigger for AI for current step & overall assessment
  const runAI = async () => {
    const step = active[current];
    if(!step) return;
    const payload = { title: form.title, problem: form.problem, solution: form.solution, objectives: form.objectives, userStories: form.userStories, requirements: form.requirements };
    setAiError(null);
    try {
      setLoadingSuggestions(true);
      const sRes = await aiOrchestrator.getSuggestions(current, payload, { model, stepKey: step.key });
      let list = Array.isArray(sRes?.suggestions)? sRes.suggestions : [];
      // Dedupe against existing entries in that field to reduce noise
      const existing = new Set<string>((step.key==='problem'||step.key==='solution')? [ (form as any)[step.key] ] : (form as any)[step.key]);
  list = list.filter((s: string)=> !existing.has(s.trim()));
      setSuggestions(list);
    } catch (e:any) { setAiError(e?.message || 'Failed to get suggestions'); } finally { setLoadingSuggestions(false); }
    try {
      setLoadingAssessment(true);
      const aRes = await aiOrchestrator.assess(payload, { model });
      if(aRes){
        setScore(typeof aRes.score === 'number'? aRes.score : null);
        setGaps(Array.isArray(aRes.missing)? aRes.missing : []);
        setImprovements(Array.isArray(aRes.suggestions)? aRes.suggestions.slice(0,5): []);
      }
    } catch (e:any) { setAiError(prev=> prev || e?.message || 'Assessment failed'); } finally { setLoadingAssessment(false); setLastUpdated(Date.now()); }
  };

  // Debounce automatic runs
  useEffect(()=>{
    if(pendingRefresh.current){ pendingRefresh.current = false; return; }
    const t = setTimeout(()=> runAI(), 700);
    return ()=> clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.problem, form.solution, form.objectives, form.userStories, form.requirements, current]);

  const manualRefresh = () => { pendingRefresh.current = true; runAI(); };
  const cancelAI = () => { aiOrchestrator.cancelSuggestions(); aiOrchestrator.cancelAssess(); setLoadingSuggestions(false); setLoadingAssessment(false); setAnnounce('AI requests cancelled'); };

  useEffect(()=>{ if(active[current]) setAnnounce(`Step: ${active[current].title}`); }, [current, active]);
  useEffect(()=>{
    const key = active[current]?.key;
    if(key && editorsRef.current[key]) {
      // Slight delay to allow component mount
      setTimeout(()=> editorsRef.current[key]?.focus(), 30);
    }
  }, [current, active]);

  const useSuggestion = (s: string) => {
    const step = active[current]; if(!step) return;
    // Append or merge depending on field
    if(step.key==='problem' || step.key==='solution') {
      const field = step.key as 'problem'|'solution';
      updateForm(field, (form as any)[field] + ( (form as any)[field] ? '\n' : '') + s);
    } else if(step.key==='objectives' || step.key==='userStories' || step.key==='requirements') {
      const field = step.key as 'objectives'|'userStories'|'requirements';
      updateForm(field, [...(form as any)[field], s]);
    }
    metric('ai_suggestion_used', { step: step.key });
    try { metric('ai_suggestion_applied', { type: step.key, length: s.length }); } catch {}
  };

  // Simple RICE scores UI state (client-side; backend persisted when overall PRD saved externally)
  const addRiceScore = () => {
    const name = prompt('Feature / Initiative name for RICE score?');
    if(!name) return;
    const reach = Number(prompt('Reach (e.g., # users reached)')||'0');
    const impact = Number(prompt('Impact (1-3)')||'1');
    const confidence = Number(prompt('Confidence (0-1)')||'0.8');
    const effort = Number(prompt('Effort (person-months)')||'1');
    const rice = Number((((reach||0)*(impact||0)*(confidence||0))/Math.max(0.1, effort||1)).toFixed(2));
    updateForm('riceScores', [ ...(form.riceScores||[]), { id: Math.random().toString(36).slice(2), name, reach, impact, confidence, effort, rice } ] as any);
  };
  const removeRice = (id: string) => updateForm('riceScores', (form.riceScores||[]).filter(r=>r.id!==id) as any);
  // Acceptance criteria helpers
  const addAcceptance = () => {
    const storyIndexStr = prompt('Story index for this criterion (0-based)');
    if(storyIndexStr===null) return;
    const storyIndex = Number(storyIndexStr);
    if(Number.isNaN(storyIndex) || storyIndex < 0) return alert('Invalid story index');
    const text = prompt('Acceptance criterion text');
    if(!text) return;
    (usePrdStore.getState() as any).addAcceptance(storyIndex, text);
    metric('acceptance_added', { storyIndex });
  };
  const toggleAcceptance = (id: string) => { (usePrdStore.getState() as any).toggleAcceptance(id); metric('acceptance_toggled', {}); };
  const acceptance = form.acceptanceCriteria || [];
  const acceptanceProgress = acceptance.length ? Math.round((acceptance.filter(c=>c.done).length / acceptance.length)*100) : 0;
  const lastSnapshot = useStoreForDiff(s => s.snapshots[0]);

  // Markdown export
  const toMarkdown = () => {
    const lines: string[] = [];
  if(form.title) lines.push(`# ${form.title}`);
  lines.push(`_Status: ${mode.toUpperCase()}_`);
    if(sections.problem && form.problem) lines.push('\n## Problem\n'+form.problem.trim());
    if(sections.solution && form.solution) lines.push('\n## Solution\n'+form.solution.trim());
    if(sections.objectives) {
      const list = form.objectives.filter(Boolean);
      if(list.length) lines.push('\n## Objectives\n'+list.map(o=>`- ${o}`).join('\n'));
    }
    if(sections.userStories) {
      const list = form.userStories.filter(Boolean);
      if(list.length) lines.push('\n## User Stories\n'+list.map(o=>`- ${o}`).join('\n'));
    }
    if(sections.requirements) {
      const list = form.requirements.filter(Boolean);
      if(list.length) lines.push('\n## Requirements\n'+list.map(o=>`- ${o}`).join('\n'));
    }
    return lines.join('\n');
  };

  const downloadMd = () => {
    const md = toMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (form.title || 'prd') + '.md';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    metric('export_markdown', {});
  };

  const copyMd = async () => {
    const md = toMarkdown();
    const ok = await writeClipboard(md, 'Markdown copied');
    if (ok) metric('export_copy', {});
  };

  const onProfile = (id: string, phase: any, actual: number, base: number) => {
    // naive telemetry hook
    try { metric('react_profile', { id, phase, actual, base }); } catch {}
  };

  return (
    <div className="p-6 space-y-4" data-testid="prd-builder-refactored">
      <div className="sr-only" aria-live="polite">{announce}</div>
      {showPresetModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30" onClick={(e)=>{ if(e.target===e.currentTarget) setShowPresetModal(false);}}>
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg border border-gray-200 animate-fade-in scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Scenario Presets</h2>
              <button className="text-gray-500 hover:text-gray-700" onClick={()=> setShowPresetModal(false)} aria-label="Close">×</button>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y">
              {scenarioPresets.map(p => {
                const isActive = activePresetId === p.id;
                return (
                  <div key={p.id} className="p-4 flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm">{p.label}</h3>
                        {isActive && <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">Active</span>}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{p.description}</p>
                      {p.rationale && <p className="text-[11px] text-gray-500 italic mb-2">{p.rationale}</p>}
                      <div className="grid grid-cols-5 gap-1 text-[10px]">
                        {['problem','solution','objectives','userStories','requirements'].map(k=> (
                          <div key={k} className={`px-1 py-0.5 rounded border text-center ${ (p.sections as any)[k] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>{k}</div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-28 justify-center">
                      <button className="btn btn-primary btn-xs" disabled={isActive} onClick={()=> applyScenarioPreset(p)}>{isActive? 'Applied':'Apply'}</button>
                      {p.seed && <button className="btn btn-outline btn-xxs" onClick={()=> {
                        const seed = mergePresetSeed(form, p); const keys = Object.keys(seed); if(keys.length===0){ toast.info('Nothing new to seed'); } else { keys.forEach(k=> updateForm(k as any, (seed as any)[k])); toast.success(`Seeded: ${keys.join(', ')}`);} } }>Seed Only</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50">
              <div className="text-[11px] text-gray-500">Applying sets section visibility & seeds only empty fields. Later edits mark preset as custom automatically.</div>
              <button className="btn btn-secondary btn-xs" onClick={()=> setShowPresetModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <select className="input text-xs py-1" value={activePrdId||'default'} onChange={e=> switchPrd && switchPrd(e.target.value)} title="Select PRD (multi-PRD stub)">
              <option value="default">Default PRD</option>
              {prds && Object.entries(prds).map(([id,p])=> <option key={id} value={id}>{p.name}</option>)}
            </select>
            <button className="btn btn-outline btn-xxs" onClick={()=> { const name = prompt('Name for new PRD?')||undefined; createPrd && createPrd(name); }} title="Create new PRD document">+</button>
          </div>
          <input className="input text-lg font-semibold flex-1" placeholder="Untitled PRD" value={form.title} onChange={e=>updateForm('title', e.target.value)} />
          <div className="relative">
            <button className="btn btn-outline btn-xs" onClick={()=> setShowPresetModal(true)} aria-haspopup="dialog" aria-expanded={showPresetModal}>Preset{activePresetId!=='custom'?`: ${activePreset?.label}`:''}</button>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide border ${mode==='draft' ? 'bg-amber-50 text-amber-700 border-amber-200':'bg-green-50 text-green-700 border-green-200'}`}>{mode.toUpperCase()}</span>
            <button className="btn btn-outline btn-xxs" onClick={()=> setMode(mode==='draft'?'final':'draft')} title="Toggle draft/final mode">{mode==='draft'?'Mark Final':'Reopen Draft'}</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 w-32 justify-end" aria-live="polite">
            {saving ? <span className="animate-pulse" data-testid="autosave-status">{t('autosave.saving') as string}</span> : lastSaved ? <span data-testid="autosave-status">{t('autosave.saved') as string}</span> : <span data-testid="autosave-status">&nbsp;</span>}
          </div>
          <button className="btn btn-outline btn-xs flex items-center gap-1" onClick={copyMd} title="Copy Markdown"><Clipboard className="h-3 w-3" />Copy</button>
          <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={downloadMd} title="Download Markdown"><Download className="h-3 w-3" />MD</button>
          <button className="btn btn-secondary btn-xs flex items-center gap-1" title="Download PDF" onClick={async ()=>{
            try {
              const html = prdToHtml(form, sections);
              const blob = await prdToPdfReal(html);
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = (form.title || 'prd') + '.pdf';
              a.click();
              setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
              metric('export_pdf', { real: true });
            } catch (e) {
              try {
                const html = prdToHtml(form, sections);
                const blob = await prdToPdfPlaceholder(html);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = (form.title || 'prd') + '.pdf';
                a.click();
                setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
                metric('export_pdf', { real: false });
                toast.error('Fallback PDF (placeholder) used');
              } catch {}
            }
          }}>PDF</button>
          <button className="btn btn-outline btn-xs flex items-center gap-1" onClick={async ()=>{
            const share = buildShareUrl({ v:1, prd:{ title: form.title, problem: form.problem, solution: form.solution, objectives: form.objectives.filter(Boolean), userStories: form.userStories.filter(Boolean), requirements: form.requirements.filter(Boolean) }, mode, sections, templateId: 'default', ts: Date.now(), token: undefined });
            const ok = await writeClipboard(share, 'Share link copied');
            if (ok) metric('share_prd_copy',{});
          }} title="Copy share link"><Share2 className="h-3 w-3" />Share</button>
        </div>
        <p className="text-xs text-gray-500">Centralized PRD editor with live AI suggestions & assessment.</p>
      </div>
      <StepsNav steps={active as any} activeIndex={current} onSelect={setCurrent} />
      <TemplateSections />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ErrorBoundary name="MainEditor">
            <div className="card card-section space-y-4">
              {active[current]?.key !== 'review' ? (
                <div ref={el=>{ if(el) editorsRef.current[active[current].key] = el.querySelector('textarea, input'); }}>
                  <StepEditor step={active[current].key as any} />
                  {/* Placeholder contextual hints */}
                  {active[current].key==='objectives' && form.objectives.filter(Boolean).length===0 && (
                    <div className="mt-2 text-[11px] text-gray-500 border-l-2 border-dashed border-gray-300 pl-2" data-testid="placeholder-objectives">Add 2–5 measurable objectives that express desired outcomes (e.g., "Increase activation rate from 35% to 50%").</div>
                  )}
                  {active[current].key==='userStories' && form.userStories.filter(Boolean).length===0 && (
                    <div className="mt-2 text-[11px] text-gray-500 border-l-2 border-dashed border-gray-300 pl-2" data-testid="placeholder-stories">Capture end-user value in "As a ... I want ... so that ..." format. Start with primary persona first.</div>
                  )}
                  {active[current].key==='requirements' && form.requirements.filter(Boolean).length===0 && (
                    <div className="mt-2 text-[11px] text-gray-500 border-l-2 border-dashed border-gray-300 pl-2" data-testid="placeholder-reqs">List key functional or non-functional requirements. Be concise; group by theme if the list grows large.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm space-y-2">
                  <div><span className="font-medium">Title:</span> {form.title || '—'}</div>
                  {sections.problem && <div>
                    <span className="font-medium">Problem:</span>{' '}
                    {lastSnapshot ? (
                      <span dangerouslySetInnerHTML={{ __html: renderDiff(lastSnapshot.formData.problem || '', form.problem || '') }} />
                    ) : (
                      <>{form.problem.slice(0,160) || '—'}{form.problem.length>160?'…':''}</>
                    )}
                  </div>}
                  {sections.solution && <div>
                    <span className="font-medium">Solution:</span>{' '}
                    {lastSnapshot ? (
                      <span dangerouslySetInnerHTML={{ __html: renderDiff(lastSnapshot.formData.solution || '', form.solution || '') }} />
                    ) : (
                      <>{form.solution.slice(0,160) || '—'}{form.solution.length>160?'…':''}</>
                    )}
                  </div>}
                  {sections.objectives && <div><span className="font-medium">Objectives:</span> {form.objectives.filter(Boolean).length}</div>}
                  {sections.userStories && <div><span className="font-medium">User Stories:</span> {form.userStories.filter(Boolean).length}</div>}
                  {sections.requirements && <div><span className="font-medium">Requirements:</span> {form.requirements.filter(Boolean).length}</div>}
                  <div className="pt-2 border-t mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">RICE Scores</span>
                      <button className="btn btn-outline btn-xxs" onClick={addRiceScore}>Add</button>
                    </div>
                    {(form.riceScores||[]).length===0 && <div className="text-xs text-gray-500">No RICE entries yet.</div>}
                    <div className="space-y-1 max-h-40 overflow-auto pr-1 text-xs">
                      {(form.riceScores||[]).map(r=> (
                        <div key={r.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1 bg-gray-50">
                          <div className="truncate" title={`Reach:${r.reach} Impact:${r.impact} Confidence:${r.confidence} Effort:${r.effort}`}>{r.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-white border rounded px-1">{r.rice}</span>
                            <button className="text-red-500 hover:text-red-700" aria-label="Remove" onClick={()=>removeRice(r.id)}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Acceptance Criteria</span>
                      <button className="btn btn-outline btn-xxs" onClick={addAcceptance}>Add</button>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                      <span>Progress:</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: acceptanceProgress+'%' }} />
                      </div>
                      <span className="font-mono">{acceptanceProgress}%</span>
                    </div>
                    {acceptance.length===0 && <div className="text-xs text-gray-500">No criteria yet.</div>}
                    <ul className="space-y-1 max-h-40 overflow-auto pr-1 text-xs" aria-label="Acceptance criteria list">
                      {acceptance.map(c=> (
                        <li key={c.id} className="flex items-start gap-2 border rounded px-2 py-1 bg-gray-50">
                          <input type="checkbox" className="mt-0.5" checked={c.done} onChange={()=>toggleAcceptance(c.id)} aria-label={c.text} />
                          <div className="flex-1">
                            <div className={c.done? 'line-through text-gray-500':'text-gray-700'}>{c.text}</div>
                            <div className="text-[10px] text-gray-400">Story #{c.storyIndex}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <button className="btn btn-secondary btn-sm" disabled={current===0} onClick={()=>setCurrent(i=>Math.max(0,i-1))}>Previous</button>
                {current < active.length-1 ? (
                  <button className="btn btn-primary btn-sm" onClick={()=>setCurrent(i=>Math.min(active.length-1,i+1))}>Next</button>
                ) : (
                  <button className="btn btn-success btn-sm">Finish</button>
                )}
              </div>
            </div>
          </ErrorBoundary>
        </div>
        <div className="space-y-4">
          {/* Global ARIA live region for snapshot announcements */}
          <div ref={liveRegionRef} id="snapshot-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
          <ErrorBoundary name="RightPanel">
            <div className="card">
              <div
                role="tablist"
                aria-label="Right panel"
                className="flex border-b border-gray-200 text-sm font-medium overflow-x-auto no-scrollbar flex-nowrap"
                ref={tablistRef}
                onKeyDown={onRightTabKeyDown}
              >
                {visibleRightTabs.map(t=> (
                  <button
                    key={t.id}
                    id={`right-tab-${t.id}`}
                    data-tabid={t.id}
                    role="tab"
                    aria-selected={rightTab===t.id}
                    aria-controls={`right-panel-${t.id}`}
                    tabIndex={rightTab===t.id?0:-1}
                    onClick={()=> setRightTab(t.id)}
                    onMouseEnter={()=> { if(t.id==='ai') preloadAssistant(); else if(t.id==='history') preloadHistory(); else if(t.id==='config') preloadConfig(); }}
                    className={`shrink-0 px-3 py-2 -mb-px border-b-2 transition-colors ${rightTab===t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >{t.label}</button>
                ))}
              </div>
              <div className="card-section" id={`right-panel-${rightTab}`} role="tabpanel" aria-labelledby={`right-tab-${rightTab}`}> 
                <Suspense fallback={<div className="space-y-2 animate-pulse" aria-label="Loading panel">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>}>
                  <Profiler id="RightPanel" onRender={onProfile}>
                     {rightTab==='ai' && <div className="space-y-3">
                       {(loadingSuggestions||loadingAssessment) && (
                         <div className="flex items-center gap-2">
                           <button className="btn btn-danger btn-xs" onClick={cancelAI} aria-label="Cancel AI generation">Cancel</button>
                         </div>
                       )}
                       <AssistantPanel suggestions={suggestions} loadingSuggestions={loadingSuggestions} loadingAssessment={loadingAssessment} onRefresh={manualRefresh} lastUpdated={lastUpdated} onUse={useSuggestion} liveScore={score} liveGaps={gaps} liveImprovements={improvements} exportPanels={<div className="text-xs text-gray-600 space-y-1"><div>Use the buttons above to copy or download Markdown.</div><div className="text-[10px]">Score & gaps refresh automatically or press Refresh.</div></div>} error={aiError} />
                     </div>}
                    {rightTab==='history' && <SnapshotHistory />}
                    {rightTab==='config' && <ConfigIntegrations />}
                    {rightTab==='metrics' && import.meta.env.MODE !== 'production' && <ProfilerDashboard />}
                    {rightTab==='collab' && <div className="text-xs space-y-2" data-testid="collab-panel"><div className="font-medium">Collaboration Preview</div><p className="text-gray-600">Real-time editing, presence, and comments are planned. This panel reserves UX space and can show connection status once implemented.</p><ul className="list-disc list-inside text-gray-500 space-y-1"><li>Live cursors</li><li>Comment threads</li><li>Change attribution</li><li>Connection health</li></ul></div>}
                  </Profiler>
                </Suspense>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Users, Target, CheckCircle, ArrowRight, Download, Sparkles, Wand2, ListChecks, Share2 } from 'lucide-react';
import { assessPRDGemini, generateRequirementsGemini, generateUserStoriesGemini, geminiEnabled, generateAcceptanceCriteriaGemini, type AcceptanceCriteriaGroup, getGeminiMode, setGeminiMode, getRedactionEnabled, setRedactionEnabled, suggestImprovementsGemini } from '../utils/gemini';
import { DEFAULT_TEMPLATE_ID, getTemplateById, type TemplateConfig, TEMPLATES } from '../utils/templates';
import { buildShareUrl } from '../utils/share';
import { openGoogleDocsWithContentCopied, openNotionWithContentCopied, prdToMarkdown, exportStoriesCSV, exportRequirementsCSV, syncItemsToJira, syncItemsToLinear, getIntegrationConfig, setIntegrationConfig, type IntegrationConfig } from '../utils/integrations';
import { getSuggestionStats } from '../utils/suggestions';
import { incSuggestionsApplied, markPrdExported } from '../utils/telemetry';
import { getPromptVariant, setPromptVariant } from '../utils/prompts';
import { toast } from '../utils/toast';

export type Sections = { problem: boolean; solution: boolean; objectives?: boolean; userStories: boolean; requirements: boolean };

export default function PRDBuilder() {
  type FormState = {
    title: string;
    problem: string;
    solution: string;
    objectives: string[];
    userStories: string[];
    requirements: string[];
  };

  // Template
  const [templateId, setTemplateId] = useState<string>(() => {
    try { return localStorage.getItem('pmcopilot_prd_template_id') || DEFAULT_TEMPLATE_ID; } catch { return DEFAULT_TEMPLATE_ID; }
  });
  const template: TemplateConfig = useMemo(() => getTemplateById(templateId), [templateId]);

  // Sections
  const [sections, setSections] = useState<Sections>(() => {
    try {
      const raw = localStorage.getItem('pmcopilot_prd_sections');
      return raw ? JSON.parse(raw) : { problem: true, solution: true, objectives: true, userStories: true, requirements: true };
    } catch { return { problem: true, solution: true, objectives: true, userStories: true, requirements: true }; }
  });

  // Form
  const [formData, setFormData] = useState<FormState>(() => {
    try {
      const raw = localStorage.getItem('pmcopilot_prd');
      return raw ? JSON.parse(raw) as FormState : { title: '', problem: '', solution: '', objectives: [''], userStories: [''], requirements: [''] };
    } catch { return { title: '', problem: '', solution: '', objectives: [''], userStories: [''], requirements: [''] }; }
  });

  // Steps
  const allSteps = useMemo(() => {
    const steps: Array<{ key: keyof FormState | 'review'; title: string; icon: any }> = [
      { key: 'problem', title: 'Problem', icon: Lightbulb },
      { key: 'solution', title: 'Solution', icon: Target },
      ...(sections.objectives ? [{ key: 'objectives' as any, title: 'Objectives', icon: Target }] : []),
      { key: 'userStories', title: 'User Stories', icon: Users },
      { key: 'requirements', title: 'Requirements', icon: ListChecks },
      { key: 'review', title: 'Review', icon: CheckCircle },
    ];
    return steps;
  }, [sections.objectives]);
  const [currentStep, setCurrentStep] = useState(0);

  // Assistant state
  const [modelMode, setModelMode] = useState<'flash' | 'pro'>(() => getGeminiMode());
  const [redactEnabled, setRedactEnabled] = useState<boolean>(() => getRedactionEnabled());
  const [promptVariant, setPv] = useState<string>(() => getPromptVariant());

  const [stepLoading, setStepLoading] = useState(false);
  const [stepSuggestions, setStepSuggestions] = useState<string[]>([]);
  const [stepObjectives, setStepObjectives] = useState<string[]>([]);

  const [acGroups, setAcGroups] = useState<AcceptanceCriteriaGroup[]>([]);
  const [acLoading, setAcLoading] = useState(false);

  // Live assess
  const [liveGeminiScore, setLiveGeminiScore] = useState<number | null>(null);
  const [liveGaps, setLiveGaps] = useState<string[]>([]);
  const [liveImprovements, setLiveImprovements] = useState<string[]>([]);

  // Share
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Integrations config
  const [integrationCfg, setIntegrationCfg] = useState<IntegrationConfig>(() => getIntegrationConfig());
  const [cfgDraft, setCfgDraft] = useState<IntegrationConfig>(() => integrationCfg);

  // Snapshots
  type Snapshot = {
    id: string;
    ts: number;
    note?: string;
    formData: FormState;
    sections: Sections;
    templateId: string;
  };
  const SNAP_KEY = 'pmcopilot_prd_snapshots';
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    try { const raw = localStorage.getItem(SNAP_KEY); return raw ? JSON.parse(raw) as Snapshot[] : []; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(SNAP_KEY, JSON.stringify(snapshots)); } catch {} }, [snapshots]);

  function saveSnapshot(note?: string) {
    const snap: Snapshot = {
      id: Math.random().toString(36).slice(2),
      ts: Date.now(),
      note,
      formData,
      sections,
      templateId,
    };
    setSnapshots((prev) => [snap, ...prev].slice(0, 50));
    toast.success('Snapshot saved');
  }

  function restoreSnapshot(s: Snapshot) {
    setFormData(s.formData);
    setSections(s.sections);
    setTemplateId(s.templateId);
    toast.success('Restored from snapshot');
  }

  function deleteSnapshot(id: string) {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  }

  // Diff helpers
  function diffArrays(a: string[], b: string[]) {
    const aSet = new Set(a.filter(Boolean));
    const bSet = new Set(b.filter(Boolean));
    const added: string[] = []; const removed: string[] = [];
    bSet.forEach((v) => { if (!aSet.has(v)) added.push(v); });
    aSet.forEach((v) => { if (!bSet.has(v)) removed.push(v); });
    return { added, removed };
  }
  function changedString(a: string, b: string) { return (a || '') !== (b || ''); }

  // Right panel tabs
  type RightTab = 'ai' | 'history' | 'config';
  const [rightTab, setRightTab] = useState<RightTab>('ai');

  // Effects: persist state
  useEffect(() => { try { localStorage.setItem('pmcopilot_prd_template_id', templateId); } catch {} }, [templateId]);
  useEffect(() => { try { localStorage.setItem('pmcopilot_prd_sections', JSON.stringify(sections)); } catch {} }, [sections]);
  useEffect(() => { try { localStorage.setItem('pmcopilot_prd', JSON.stringify(formData)); } catch {} }, [formData]);

  // Effect: refresh suggestions on step change or content change
  useEffect(() => {
    let ignore = false;
    async function run() {
      setStepLoading(true);
      setStepSuggestions([]);
      setStepObjectives([]);
      try {
        if (!geminiEnabled) return;
        const stepKey = allSteps[currentStep].key;
        if (stepKey === 'review') return;
        const res = await suggestImprovementsGemini(currentStep, {
          title: formData.title,
          problem: formData.problem,
          solution: formData.solution,
          objectives: formData.objectives.filter(Boolean),
          userStories: formData.userStories.filter(Boolean),
          requirements: formData.requirements.filter(Boolean),
        } as any);
        if (!ignore) {
          setStepSuggestions(res.suggestions || []);
          if ((stepKey === 'solution' || stepKey === 'objectives') && res.objectives?.length) setStepObjectives(res.objectives);
        }
      } catch {}
      finally { if (!ignore) setStepLoading(false); }
    }
    run();
    return () => { ignore = true; };
  }, [currentStep, formData.title, formData.problem, formData.solution, formData.userStories.join('\n'), formData.requirements.join('\n'), modelMode, promptVariant, redactEnabled, allSteps]);

  // Live assess on major changes
  useEffect(() => {
    let ignore = false;
    async function runAssess() {
      try {
        if (!geminiEnabled) return;
        const { score, missing, suggestions } = await assessPRDGemini({
          title: formData.title,
          problem: formData.problem,
          solution: formData.solution,
          objectives: formData.objectives.filter(Boolean),
          userStories: formData.userStories.filter(Boolean),
          requirements: formData.requirements.filter(Boolean),
        } as any);
        if (!ignore) {
          setLiveGeminiScore(score);
          setLiveGaps(missing);
          setLiveImprovements(suggestions);
        }
      } catch {
        if (!ignore) { setLiveGeminiScore(null); setLiveGaps([]); setLiveImprovements([]); }
      }
    }
    runAssess();
    return () => { ignore = true; };
  }, [formData.title, formData.problem, formData.solution, formData.userStories.join('\n'), formData.requirements.join('\n')]);

  // Helpers
  const updateFormData = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const exportPRD = () => {
    const md = prdToMarkdown({
      title: formData.title,
      problem: formData.problem,
      solution: formData.solution,
      objectives: formData.objectives.filter(Boolean),
      userStories: formData.userStories.filter(Boolean),
      requirements: formData.requirements.filter(Boolean),
    }, sections, { score: liveGeminiScore, gaps: liveGaps });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.title || 'prd'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    try { markPrdExported(); } catch {}
    toast.success('PRD exported');
  };

  async function autoGenerateStories() {
    if (!geminiEnabled) return toast.info('Configure VITE_GEMINI_API_KEY to use AI');
    try {
      const res = await generateUserStoriesGemini(formData.problem, formData.solution);
      if (res.length) {
        updateFormData('userStories', [...formData.userStories.filter(Boolean), ...res]);
        toast.success('Added suggested stories');
      } else toast.info('No suggestions from Gemini');
    } catch { toast.error('Failed to get stories'); }
  }

  async function autoGenerateRequirements() {
    if (!geminiEnabled) return toast.info('Configure VITE_GEMINI_API_KEY to use AI');
    try {
      const base = formData.userStories.filter(Boolean);
      if (base.length === 0) return toast.info('Add user stories first');
      const res = await generateRequirementsGemini(base);
      if (res.length) {
        updateFormData('requirements', [...formData.requirements.filter(Boolean), ...res]);
        toast.success('Added suggested requirements');
      } else toast.info('No suggestions from Gemini');
    } catch { toast.error('Failed to get requirements'); }
  }

  async function generateAcceptanceCriteria() {
    if (!geminiEnabled) return toast.info('Configure VITE_GEMINI_API_KEY to use AI');
    try {
      setAcLoading(true);
      const groups = await generateAcceptanceCriteriaGemini(formData.userStories.filter(Boolean));
      setAcGroups(groups);
    } catch { toast.error('Failed to get acceptance criteria'); }
    finally { setAcLoading(false); }
  }

  function attachAcceptanceCriteriaToRequirements() {
    if (acGroups.length === 0) return;
    const lines: string[] = [];
    acGroups.forEach((g) => {
      lines.push(`${g.story}`);
      g.criteria.forEach((c) => lines.push(`- ${c}`));
    });
    updateFormData('requirements', [...formData.requirements.filter(Boolean), ...lines]);
    toast.success('Attached acceptance criteria to requirements');
  }

  const exportPanels = (
    <div className="grid grid-cols-2 gap-2">
      <button className="btn btn-secondary btn-sm" onClick={() => { exportStoriesCSV(formData.userStories); toast.success('Exported Stories CSV'); }}>Stories CSV</button>
      <button className="btn btn-secondary btn-sm" onClick={() => { exportRequirementsCSV(formData.requirements); toast.success('Exported Requirements CSV'); }}>Requirements CSV</button>
      <button className="btn btn-outline btn-sm" onClick={() => { openGoogleDocsWithContentCopied(prdToMarkdown({
        title: formData.title,
        problem: formData.problem,
        solution: formData.solution,
        objectives: formData.objectives.filter(Boolean),
        userStories: formData.userStories.filter(Boolean),
        requirements: formData.requirements.filter(Boolean),
      }, sections, { score: liveGeminiScore, gaps: liveGaps })); toast.info('Opening Google Docs'); }}>Open in Google Docs</button>
      <button className="btn btn-outline btn-sm" onClick={() => { openNotionWithContentCopied(prdToMarkdown({
        title: formData.title,
        problem: formData.problem,
        solution: formData.solution,
        objectives: formData.objectives.filter(Boolean),
        userStories: formData.userStories.filter(Boolean),
        requirements: formData.requirements.filter(Boolean),
      }, sections, { score: liveGeminiScore, gaps: liveGaps })); toast.info('Opening Notion'); }}>Open in Notion</button>
      <button
        className="btn btn-outline btn-sm col-span-2"
  disabled={!integrationCfg.linearWorkspace || formData.userStories.length === 0}
  title={!integrationCfg.linearWorkspace ? 'Set Linear workspace in Configure tab' : 'Open Linear issue drafts'}
        onClick={async () => {
          const res = await syncItemsToLinear(formData.userStories, integrationCfg.linearWorkspace!, 5);
          toast.info(`Linear: opened ${res.opened}, copied ${res.copied} more to clipboard`);
        }}
      >Sync Stories to Linear</button>
      <button
        className="btn btn-outline btn-sm col-span-2"
  disabled={!integrationCfg.jiraBaseUrl || formData.requirements.length === 0}
  title={!integrationCfg.jiraBaseUrl ? 'Set Jira base URL in Configure tab' : 'Open Jira create dialogs'}
        onClick={async () => {
          const res = await syncItemsToJira(formData.requirements, integrationCfg.jiraBaseUrl!, 5);
          toast.info(`Jira: opened ${res.opened}, copied ${res.copied} more to clipboard`);
        }}
      >Sync Requirements to Jira</button>
    </div>
  );

  const activeSteps = allSteps.map(s => s.key).filter((k) => (
    (k === 'problem' && sections.problem) ||
    (k === 'solution' && sections.solution) ||
    (k === 'objectives' && sections.objectives) ||
    (k === 'userStories' && sections.userStories) ||
    (k === 'requirements' && sections.requirements) ||
    k === 'review'
  ));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gray-600" />
          <button
            onClick={() => {
              const url = buildShareUrl({
                v: 1,
                prd: {
                  title: formData.title,
                  problem: formData.problem,
                  solution: formData.solution,
                  objectives: formData.objectives.filter(Boolean),
                  userStories: formData.userStories.filter(Boolean),
                  requirements: formData.requirements.filter(Boolean),
                },
                sections,
                templateId,
                ts: Date.now(),
              });
              setShareUrl(url);
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url)
                  .then(() => toast.success('Share link copied to clipboard'))
                  .catch(() => toast.info('Share link ready'));
              } else {
                toast.info('Share link ready');
              }
            }}
            className="btn btn-secondary btn-sm"
          >Share</button>
          {shareUrl && (
            <a href={shareUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Open shared view</a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPRD} className="btn btn-primary btn-sm flex items-center gap-1">
            <Download className="h-4 w-4" />
            Export PRD
          </button>
          <div className="inline-flex rounded-md overflow-hidden border border-gray-300">
            <button
              className={`px-2 py-1 text-xs ${modelMode === 'flash' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-700'}`}
              onClick={() => { setModelMode('flash'); setGeminiMode('flash'); }}
              title="Speed (Flash)"
            >Speed</button>
            <button
              className={`px-2 py-1 text-xs border-l ${modelMode === 'pro' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-700'}`}
              onClick={() => { setModelMode('pro'); setGeminiMode('pro'); }}
              title="Quality (Pro)"
            >Quality</button>
          </div>
          <label className="text-xs inline-flex items-center gap-1">
            <input type="checkbox" checked={redactEnabled} onChange={(e) => { setRedactEnabled(e.target.checked); setRedactionEnabled(e.target.checked); }} />
            Redact
          </label>
          <select className="text-xs border rounded px-2 py-1" value={promptVariant} onChange={(e) => { setPv(e.target.value); setPromptVariant(e.target.value); }}>
            <option value="default">Default prompts</option>
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="card card-section mb-4">
        <div className="flex items-center justify-between">
          {activeSteps.map((key, index) => {
            const meta = allSteps.find(s => s.key === key)!; const IconComp = meta.icon as any;
            return (
              <div key={String(key)} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index === currentStep ? 'bg-blue-600 text-white' : index < currentStep ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {index < currentStep ? <CheckCircle className="h-4 w-4" /> : (IconComp ? <IconComp className="h-4 w-4" /> : null)}
                </div>
                <span className={`ml-2 text-sm font-medium ${index === currentStep ? 'text-blue-600' : index < currentStep ? 'text-green-600' : 'text-gray-400'}`}>{meta.title}</span>
                {index < activeSteps.length - 1 && <ArrowRight className="h-4 w-4 text-gray-300 mx-4" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Template & Sections */}
      <div className="card card-section mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Template</label>
            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">{template.description}</p>
          </div>
          <div className="md:col-span-2">
            <label className="label">Sections</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sections.problem} onChange={(e) => setSections((s) => ({ ...s, problem: e.target.checked }))} />
                <span>Problem</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sections.solution} onChange={(e) => setSections((s) => ({ ...s, solution: e.target.checked }))} />
                <span>Solution</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!sections.objectives} onChange={(e) => setSections((s) => ({ ...s, objectives: e.target.checked }))} />
                <span>Objectives</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sections.userStories} onChange={(e) => setSections((s) => ({ ...s, userStories: e.target.checked }))} />
                <span>User Stories</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={sections.requirements} onChange={(e) => setSections((s) => ({ ...s, requirements: e.target.checked }))} />
                <span>Requirements</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main */}
        <div className="lg:col-span-2">
          <div className="card card-section">
            {activeSteps[currentStep] === 'problem' && (
              <div className="space-y-4">
                <div>
                  <label className="label">PRD Title</label>
                  <input value={formData.title} onChange={(e) => updateFormData('title', e.target.value)} className="input" placeholder="e.g., Mobile App Push Notifications" />
                </div>
                <div>
                  <label className="label">Problem Statement</label>
                  <textarea value={formData.problem} onChange={(e) => updateFormData('problem', e.target.value)} className="input" rows={6} placeholder="Who is affected, how often, impact, workaround..." />
                </div>
              </div>
            )}

            {activeSteps[currentStep] === 'solution' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Solution Overview</label>
                  <textarea value={formData.solution} onChange={(e) => updateFormData('solution', e.target.value)} className="input" rows={6} placeholder="Approach, value proposition, rollout..." />
                </div>
              </div>
            )}

            {activeSteps[currentStep] === 'userStories' && (
              <div className="space-y-3">
                <label className="label">User Stories</label>
                {formData.userStories.map((s, i) => (
                  <input key={i} value={s} onChange={(e) => { const next = [...formData.userStories]; next[i] = e.target.value; updateFormData('userStories', next); }} className="input w-full" placeholder="As a [persona], I want [goal] so that [benefit]" />
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button className="btn btn-secondary" onClick={() => updateFormData('userStories', [...formData.userStories, ''])}>+ Add User Story</button>
                  <button className="btn btn-primary flex items-center justify-center gap-2" onClick={autoGenerateStories}><Wand2 className="h-4 w-4" />Generate Suggested Stories</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button className="btn btn-secondary" disabled={acLoading || formData.userStories.filter(Boolean).length === 0} onClick={generateAcceptanceCriteria}>{acLoading ? 'Getting Acceptance Criteria…' : 'Generate Acceptance Criteria'}</button>
                  <button className="btn btn-success" disabled={acGroups.length === 0} onClick={attachAcceptanceCriteriaToRequirements}>Attach to Requirements</button>
                </div>
                {acGroups.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="text-sm font-medium mb-2">Acceptance Criteria Preview</div>
                    <div className="space-y-2 text-sm">
                      {acGroups.map((g, i) => (
                        <div key={i}>
                          <div className="font-medium">{g.story}</div>
                          <ul className="list-disc ml-5">
                            {g.criteria.map((c, j) => (<li key={j}>{c}</li>))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSteps[currentStep] === 'objectives' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Objectives</label>
                  <div className="space-y-2">
                    {formData.objectives.map((o, i) => (
                      <input key={i} value={o} onChange={(e) => {
                        const next = [...formData.objectives]; next[i] = e.target.value; updateFormData('objectives', next);
                      }} className="input w-full" placeholder="e.g., Improve D7 retention by +5%" />
                    ))}
                    <button className="btn btn-secondary w-full" onClick={() => updateFormData('objectives', [...formData.objectives, ''])}>+ Add Objective</button>
                  </div>
                  {stepObjectives.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-medium text-gray-900 mb-1">Suggested Objectives</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {stepObjectives.map((o, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <span>{o}</span>
                            <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => updateFormData('objectives', [...formData.objectives, o])}>Add</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSteps[currentStep] === 'requirements' && (
              <div className="space-y-3">
                <label className="label">Requirements</label>
                {formData.requirements.map((r, i) => (
                  <input key={i} value={r} onChange={(e) => { const next = [...formData.requirements]; next[i] = e.target.value; updateFormData('requirements', next); }} className="input w-full" placeholder="Functional or non-functional requirement" />
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button className="btn btn-secondary" onClick={() => updateFormData('requirements', [...formData.requirements, ''])}>+ Add Requirement</button>
                  <button className="btn btn-primary flex items-center justify-center gap-2" onClick={autoGenerateRequirements}><ListChecks className="h-4 w-4" />Generate Suggested Requirements</button>
                </div>
              </div>
            )}

            {activeSteps[currentStep] === 'review' && (
              <div className="space-y-6">
                <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Review & Export</h4>
                    <span className={`text-sm font-semibold ${
                      liveGeminiScore == null ? 'text-gray-500' : Number(liveGeminiScore) >= 80 ? 'text-green-700' : Number(liveGeminiScore) >= 60 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {liveGeminiScore ?? '—'}/100
                    </span>
                  </div>
                  <div className="text-sm text-gray-800/90">
                    {liveGaps.length === 0 && liveImprovements.length === 0 ? (
                      <p>
                        {liveGeminiScore == null ? (!geminiEnabled ? 'Gemini scoring is disabled. Set VITE_GEMINI_API_KEY to enable.' : 'Continue editing or try again.') : 'Looks good. You can export or share.'}
                      </p>
                    ) : (
                      <>
                        {liveGaps.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium mb-1">Gaps</div>
                            <ul className="list-disc ml-5 space-y-1">{liveGaps.map((m, i) => (<li key={i}>{m}</li>))}</ul>
                          </div>
                        )}
                        {liveImprovements.length > 0 && (
                          <div className="mt-3">
                            <div className="font-medium mb-1">Improvements</div>
                            <ul className="list-disc ml-5 space-y-1">{liveImprovements.map((s, i) => (<li key={i}>{s}</li>))}</ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <button className="btn btn-primary" onClick={exportPRD}>Export PRD</button>
                    {exportPanels}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0} className={`btn ${currentStep === 0 ? 'btn-secondary opacity-60 cursor-not-allowed' : 'btn-secondary'}`}>Previous</button>
              {currentStep < activeSteps.length - 1 ? (
                <button onClick={() => setCurrentStep((s) => Math.min(activeSteps.length - 1, s + 1))} className="btn btn-primary">Next Step</button>
              ) : (
                <button onClick={exportPRD} className="btn btn-success">Finish (Export PRD)</button>
              )}
            </div>
          </div>
        </div>

        {/* Assistant */}
        <div className="lg:col-span-1">
          <div className="card card-section sticky top-4 max-h-[calc(100vh-120px)] overflow-auto">
            {/* Tabs */}
            <div className="flex items-center border-b border-gray-200 mb-3">
              <button className={`px-3 py-2 text-sm ${rightTab === 'ai' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-600'}`} onClick={() => setRightTab('ai')}>Assistant</button>
              <button className={`px-3 py-2 text-sm ${rightTab === 'history' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-600'}`} onClick={() => setRightTab('history')}>History</button>
              <button className={`px-3 py-2 text-sm ${rightTab === 'config' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-600'}`} onClick={() => setRightTab('config')}>Configure</button>
            </div>

            {rightTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Gemini Suggestions</h4>
                  </div>
                  {stepLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 bg-purple-200/60 rounded w-11/12" />
                      <div className="h-3 bg-purple-200/60 rounded w-10/12" />
                      <div className="h-3 bg-purple-200/60 rounded w-9/12" />
                    </div>
                  ) : stepSuggestions.length === 0 ? (
                    <div className="text-sm text-gray-700">
                      <p>{geminiEnabled ? 'No suggestions yet. Add content in this step to get ideas.' : 'Gemini is not configured. Add VITE_GEMINI_API_KEY in .env to enable suggestions.'}</p>
                      {geminiEnabled && (<button className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline" onClick={() => setCurrentStep((s) => s)}>Retry</button>)}
                    </div>
                  ) : (
                    <ul className="text-sm text-gray-700 space-y-2 max-h-64 overflow-auto pr-1">
                      {stepSuggestions
                        .filter((s) => {
                          const k = activeSteps[currentStep];
                          if (!k || k === 'review') return true;
                          const { score, down } = getSuggestionStats(k as any, s);
                          return !(down >= 2 && score < 0);
                        })
                        .map((s, i) => (
                          <li key={i} className="flex items-start justify-between space-x-2">
                            <div className="flex items-start space-x-2">
                              <span className="text-purple-400 mt-1">•</span>
                              <span className="break-words leading-relaxed">{s}</span>
                            </div>
                            {activeSteps[currentStep] === 'problem' && (
                              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => { updateFormData('problem', (formData.problem ? formData.problem + '\n' : '') + s); incSuggestionsApplied(); toast.info('Suggestion added to Problem'); }}>Use</button>
                            )}
                            {activeSteps[currentStep] === 'solution' && (
                              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => { updateFormData('solution', (formData.solution ? formData.solution + '\n' : '') + s); incSuggestionsApplied(); toast.info('Suggestion added to Solution'); }}>Use</button>
                            )}
                            {activeSteps[currentStep] === 'userStories' && (
                              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => { updateFormData('userStories', [...formData.userStories, s]); incSuggestionsApplied(); toast.info('Story added'); }}>Add</button>
                            )}
                            {activeSteps[currentStep] === 'requirements' && (
                              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => { updateFormData('requirements', [...formData.requirements, s]); incSuggestionsApplied(); toast.info('Requirement added'); }}>Add</button>
                            )}
                            {activeSteps[currentStep] === 'objectives' && (
                              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => { updateFormData('objectives', [...formData.objectives, s]); incSuggestionsApplied(); toast.info('Objective added'); }}>Add</button>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Export & Integrations</h4>
                  {exportPanels}
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Completeness</h4>
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Gemini Score</span>
                      <span className={`font-bold ${
                        liveGeminiScore == null ? 'text-gray-500' : Number(liveGeminiScore) >= 80 ? 'text-green-700' : Number(liveGeminiScore) >= 60 ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {liveGeminiScore ?? '—'}/100
                      </span>
                    </div>
                    {liveGaps.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium mb-1">Gaps</div>
                        <ul className="list-disc ml-5 space-y-1">{liveGaps.map((m, i) => (<li key={i}>{m}</li>))}</ul>
                      </div>
                    )}
                    {liveImprovements.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium mb-1">Improvements</div>
                        <ul className="list-disc ml-5 space-y-1">{liveImprovements.map((s, i) => (<li key={i}>{s}</li>))}</ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Snapshots</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => saveSnapshot()}>Save snapshot</button>
                </div>
                {snapshots.length === 0 ? (
                  <p className="text-sm text-gray-600">No snapshots yet. Create one to enable rollback and diff.</p>
                ) : (
                  <ul className="space-y-3">
                    {snapshots.map((s) => {
                      const changed: Array<{ key: keyof FormState | 'sections' | 'templateId'; label: string } > = [];
                      if (changedString(formData.title, s.formData.title)) changed.push({ key: 'title', label: 'Title' });
                      if (changedString(formData.problem, s.formData.problem)) changed.push({ key: 'problem', label: 'Problem' });
                      if (changedString(formData.solution, s.formData.solution)) changed.push({ key: 'solution', label: 'Solution' });
                      const obj = diffArrays(s.formData.objectives, formData.objectives);
                      if (obj.added.length || obj.removed.length) changed.push({ key: 'objectives', label: 'Objectives' });
                      const ust = diffArrays(s.formData.userStories, formData.userStories);
                      if (ust.added.length || ust.removed.length) changed.push({ key: 'userStories', label: 'User Stories' });
                      const req = diffArrays(s.formData.requirements, formData.requirements);
                      if (req.added.length || req.removed.length) changed.push({ key: 'requirements', label: 'Requirements' });
                      if (JSON.stringify(s.sections) !== JSON.stringify(sections)) changed.push({ key: 'sections', label: 'Sections' });
                      if (s.templateId !== templateId) changed.push({ key: 'templateId', label: 'Template' });
                      const date = new Date(s.ts).toLocaleString();
                      return (
                        <li key={s.id} className="bg-white/60 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{date}{s.note ? ` — ${s.note}` : ''}</div>
                              <div className="text-xs text-gray-600">{changed.length === 0 ? 'No differences' : `${changed.length} change(s): ${changed.map(c => c.label).join(', ')}`}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="btn btn-success btn-sm" onClick={() => restoreSnapshot(s)}>Restore</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => deleteSnapshot(s.id)}>Delete</button>
                            </div>
                          </div>
                          {changed.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-700 cursor-pointer">View diff</summary>
                              <div className="mt-2 space-y-2 text-xs">
                                {changed.map((c) => (
                                  <div key={String(c.key)} className="bg-gray-50 border border-gray-200 rounded p-2">
                                    <div className="font-medium mb-1">{c.label}</div>
                                    {(['title','problem','solution'] as const).includes(c.key as any) ? (
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <div className="text-gray-500 mb-1">Snapshot</div>
                                          <div className="rounded bg-white p-2 border text-gray-800 whitespace-pre-wrap break-words">{(s.formData as any)[c.key] || '—'}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-500 mb-1">Current</div>
                                          <div className="rounded bg-white p-2 border text-gray-800 whitespace-pre-wrap break-words">{(formData as any)[c.key] || '—'}</div>
                                        </div>
                                      </div>
                                    ) : c.key === 'objectives' ? (
                                      <div>
                                        <div className="text-gray-700">Added: {diffArrays(s.formData.objectives, formData.objectives).added.length}, Removed: {diffArrays(s.formData.objectives, formData.objectives).removed.length}</div>
                                      </div>
                                    ) : c.key === 'userStories' ? (
                                      <div>
                                        <div className="text-gray-700">Added: {diffArrays(s.formData.userStories, formData.userStories).added.length}, Removed: {diffArrays(s.formData.userStories, formData.userStories).removed.length}</div>
                                      </div>
                                    ) : c.key === 'requirements' ? (
                                      <div>
                                        <div className="text-gray-700">Added: {diffArrays(s.formData.requirements, formData.requirements).added.length}, Removed: {diffArrays(s.formData.requirements, formData.requirements).removed.length}</div>
                                      </div>
                                    ) : c.key === 'sections' ? (
                                      <div className="text-gray-700">Sections changed</div>
                                    ) : (
                                      <div className="text-gray-700">Template changed</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {rightTab === 'config' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Configure Integrations</h3>
                <div className="bg-white/60 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="label">Linear Workspace</label>
                    <input className="input" placeholder="your-workspace" value={cfgDraft.linearWorkspace || ''} onChange={(e) => setCfgDraft({ ...cfgDraft, linearWorkspace: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Linear Team Hint (optional)</label>
                    <input className="input" placeholder="TEAM" value={cfgDraft.linearTeamHint || ''} onChange={(e) => setCfgDraft({ ...cfgDraft, linearTeamHint: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Jira Base URL</label>
                    <input className="input" placeholder="https://yourcompany.atlassian.net" value={cfgDraft.jiraBaseUrl || ''} onChange={(e) => setCfgDraft({ ...cfgDraft, jiraBaseUrl: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Jira Project Hint (optional)</label>
                    <input className="input" placeholder="PROJ" value={cfgDraft.jiraProjectHint || ''} onChange={(e) => setCfgDraft({ ...cfgDraft, jiraProjectHint: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button className="btn btn-secondary" onClick={() => { setCfgDraft(integrationCfg); }}>Reset</button>
                    <button className="btn btn-primary" onClick={() => { setIntegrationConfig(cfgDraft); setIntegrationCfg(cfgDraft); toast.success('Integration settings saved'); }}>Save</button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">These settings are stored locally in your browser. We don’t send them anywhere.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
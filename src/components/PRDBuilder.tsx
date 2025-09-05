import { useEffect, useState } from 'react';
import { Lightbulb, Users, Target, CheckCircle, ArrowRight, Download, Sparkles, Wand2, ListChecks } from 'lucide-react';
import { assessPRDGemini, generateRequirementsGemini, generateUserStoriesGemini, suggestImprovementsGemini, geminiEnabled } from '../utils/gemini';

const PRDBuilder = () => {
  const [currentStep, setCurrentStep] = useState(0);
  type FormState = {
    title: string;
    problem: string;
    solution: string;
    objectives: string[];
    userStories: string[];
    requirements: string[];
  };

  const [formData, setFormData] = useState<FormState>({
    title: '',
    problem: '',
    solution: '',
    objectives: [],
    userStories: [],
    requirements: []
  });
  const [dirty, setDirty] = useState(false);

  const steps = [
    { title: 'Problem Definition', icon: Target },
    { title: 'Solution Overview', icon: Lightbulb },
    { title: 'User Stories', icon: Users },
    { title: 'Requirements', icon: CheckCircle }
  ];

  // Live, step-specific Gemini suggestions and optional objectives
  const [stepSuggestions, setStepSuggestions] = useState<string[]>([]);
  const [stepObjectives, setStepObjectives] = useState<string[]>([]);
  const [stepLoading, setStepLoading] = useState(false);
  // Track auto-apply for Problem/Solution and backups for undo
  const [autoApplied, setAutoApplied] = useState<{ problem: boolean; solution: boolean }>({ problem: false, solution: false });
  const [backup, setBackup] = useState<{ problem: string; solution: string }>({ problem: '', solution: '' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStepLoading(true);
        const res = await suggestImprovementsGemini(currentStep, {
          title: formData.title,
          problem: formData.problem,
          solution: formData.solution,
          objectives: formData.objectives as string[],
          userStories: formData.userStories as string[],
          requirements: formData.requirements as string[],
        });
        if (!cancelled) {
          setStepSuggestions(res.suggestions || []);
          setStepObjectives(res.objectives || []);
          // Auto-apply first suggestion into the active field for Problem/Solution if it's empty
          if (currentStep === 0 && !autoApplied.problem) {
            const first = (res.suggestions || [])[0];
            if (first && !String(formData.problem || '').trim()) {
              setBackup((b) => ({ ...b, problem: formData.problem }));
              updateFormData('problem', first);
              setAutoApplied((s) => ({ ...s, problem: true }));
            }
          }
          if (currentStep === 1 && !autoApplied.solution) {
            const first = (res.suggestions || [])[0];
            if (first && !String(formData.solution || '').trim()) {
              setBackup((b) => ({ ...b, solution: formData.solution }));
              updateFormData('solution', first);
              setAutoApplied((s) => ({ ...s, solution: true }));
            }
          }
        }
      } catch {
        if (!cancelled) { setStepSuggestions([]); setStepObjectives([]); }
      } finally {
        if (!cancelled) setStepLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentStep, formData.title, formData.problem, formData.solution, formData.objectives, formData.userStories, formData.requirements, autoApplied.problem, autoApplied.solution]);

  // On entering Step 1, auto-populate Objectives from Gemini once if empty
  useEffect(() => {
    if (currentStep === 1 && (formData.objectives as string[]).length === 0 && stepObjectives.length > 0) {
      updateFormData('objectives', stepObjectives);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, stepObjectives]);

  // Live Gemini assessment
  const [liveGeminiScore, setLiveGeminiScore] = useState<number | null>(null);
  const [liveGaps, setLiveGaps] = useState<string[]>([]);
  const [liveImprovements, setLiveImprovements] = useState<string[]>([]);
  useEffect(() => {
    if (!formData.problem && !formData.solution) return setLiveGeminiScore(null);
    const ctrl = new AbortController();
    const run = async () => {
      try {
        const res = await assessPRDGemini({
          title: formData.title,
          problem: formData.problem,
          solution: formData.solution,
          objectives: formData.objectives as string[],
          userStories: formData.userStories as string[],
          requirements: formData.requirements as string[],
        });
        if (!ctrl.signal.aborted) {
          setLiveGeminiScore(res.score);
          setLiveGaps(res.missing || []);
          setLiveImprovements(res.suggestions || []);
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setLiveGeminiScore(null);
          setLiveGaps([]);
          setLiveImprovements([]);
        }
      }
    };
    const id = setTimeout(run, 600);
    return () => { ctrl.abort(); clearTimeout(id); };
  }, [formData.title, formData.problem, formData.solution, formData.objectives, formData.userStories, formData.requirements]);

  // Load/save draft in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_prd');
      if (saved) setFormData(JSON.parse(saved));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(() => {
      try { localStorage.setItem('pmcopilot_prd', JSON.stringify(formData)); } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [formData, dirty]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field: keyof FormState, value: any) => {
    setDirty(true);
    setFormData((prev: FormState) => ({ ...prev, [field]: value }));
  };

  const autoGenerateStories = async () => {
    // Indicate background generation to avoid duplicate triggers
    setGeneratingStories(true);
    try {
      const stories = await generateUserStoriesGemini(formData.problem, formData.solution);
      if (stories.length) updateFormData('userStories', stories);
    } finally {
      setGeneratingStories(false);
    }
  };

  const autoGenerateRequirements = async () => {
    const reqs = await generateRequirementsGemini(formData.userStories as string[]);
    if (reqs.length) updateFormData('requirements', reqs);
  };

  const exportPRD = () => {
  const completenessText = `Gemini Score: ${liveGeminiScore ?? '—'}/100\nMissing: ${liveGaps.length ? liveGaps.map((m) => `"${m}"`).join(', ') : 'None'}`;
  const prdContent = `
# ${formData.title || 'Product Requirements Document'}

## Problem Statement
${formData.problem || 'Problem definition needed...'}

## Solution Overview
${formData.solution || 'Solution description needed...'}

## Objectives & Success Metrics
${(formData.objectives as string[]).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n') || '- Define measurable objectives (e.g., +15% activation, -20% time-to-task)'}

## User Stories
${formData.userStories.map((story: string, i: number) => `${i + 1}. ${story}`).join('\n') || 'User stories needed...'}

## Requirements
${formData.requirements.map((req: string, i: number) => `${i + 1}. ${req}`).join('\n') || 'Requirements needed...'}

## Success Metrics
- User adoption rate
- Feature usage metrics
- User satisfaction scores
- Business impact measurements

## Completeness Score (Gemini)
${completenessText}

---
*Generated by PM Copilot AI Assistant*
    `.trim();

    const blob = new Blob([prdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.title || 'PRD'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Auto suggestions: when entering Step 2 (User Stories), kick off generation if empty ---
  const [generatingStories, setGeneratingStories] = useState(false);
  useEffect(() => {
    if (currentStep === 2 && formData.userStories.length === 0 && !generatingStories) {
      // Fire-and-forget; relies on Gemini using any available context (problem/solution) if present
      autoGenerateStories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // --- Auto-generate Requirements on entering Step 3. If no stories, draft them first ---
  const [generatingRequirements, setGeneratingRequirements] = useState(false);
  useEffect(() => {
    if (currentStep !== 3 || generatingRequirements) return;
    if (formData.requirements.length > 0) return;
    (async () => {
      setGeneratingRequirements(true);
      try {
        let stories = formData.userStories;
        if (stories.length === 0) {
          const generatedStories = await generateUserStoriesGemini(formData.problem, formData.solution);
          if (generatedStories.length) {
            stories = generatedStories;
            updateFormData('userStories', generatedStories);
          }
        }
        if (stories.length > 0) {
          const reqs = await generateRequirementsGemini(stories as string[]);
          if (reqs.length) updateFormData('requirements', reqs);
        }
      } finally {
        setGeneratingRequirements(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="card card-section mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered PRD Builder</h2>
            <p className="text-gray-600 mt-1">Create comprehensive PRDs with intelligent guidance</p>
          </div>
          <button
            onClick={exportPRD}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export PRD</span>
          </button>
        </div>
                {currentStep === 0 && autoApplied.problem && (
                  <div className="text-xs text-purple-700 mt-2">
                    Applied first suggestion to Problem.{' '}
                    <button
                      className="text-blue-600 hover:text-blue-700 underline"
                      onClick={() => { updateFormData('problem', backup.problem); setAutoApplied((s) => ({ ...s, problem: false })); }}
                    >
                      Undo
                    </button>
                  </div>
                )}
                {currentStep === 1 && autoApplied.solution && (
                  <div className="text-xs text-purple-700 mt-2">
                    Applied first suggestion to Solution.{' '}
                    <button
                      className="text-blue-600 hover:text-blue-700 underline"
                      onClick={() => { updateFormData('solution', backup.solution); setAutoApplied((s) => ({ ...s, solution: false })); }}
                    >
                      Undo
                    </button>
                  </div>
                )}
      </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Progress Steps */}
          <div className="card card-section mb-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    index === currentStep ? 'bg-blue-600 text-white' :
                    index < currentStep ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    index === currentStep ? 'text-blue-600' :
                    index < currentStep ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-300 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="card card-section">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="label">
                    PRD Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="e.g., Mobile App Push Notifications Feature"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">
                    Problem Statement
                  </label>
                  <textarea
                    value={formData.problem}
                    onChange={(e) => updateFormData('problem', e.target.value)}
                    rows={6}
                    placeholder="Describe the user problem you're solving... Include user segment, impact, frequency, and current workaround."
                    className="input"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="label">
                    Solution Overview
                  </label>
                  <textarea
                    value={formData.solution}
                    onChange={(e) => updateFormData('solution', e.target.value)}
                    rows={6}
                    placeholder="Describe your proposed solution... Outline value proposition, approach, and rollout phases."
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Objectives</label>
                  <div className="space-y-3">
                    {(formData.objectives as string[]).map((obj: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={obj}
                          onChange={(e) => {
                            const next = [...(formData.objectives as string[])];
                            next[index] = e.target.value;
                            updateFormData('objectives', next);
                          }}
                          placeholder="e.g., Improve D7 retention by +5%"
                          className="input flex-1"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateFormData('objectives', [...(formData.objectives as string[]), ''])}
                      className="w-full btn btn-secondary"
                    >
                      + Add Objective
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
          <label className="label">
                    User Stories
                  </label>
                  <div className="space-y-3">
                    {generatingStories && formData.userStories.length === 0 && (
                      <div className="text-sm text-purple-700 flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span>Getting Gemini suggestions…</span>
                      </div>
                    )}
                    {formData.userStories.map((story: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={story}
                          onChange={(e) => {
                            const newStories = [...formData.userStories];
                            newStories[index] = e.target.value;
                            updateFormData('userStories', newStories);
                          }}
                          placeholder="As a [user], I want [goal] so that [benefit]"
              className="input flex-1"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateFormData('userStories', [...formData.userStories, ''])}
            className="w-full btn btn-secondary"
                    >
                      + Add User Story
                    </button>
                    <button
                      onClick={autoGenerateStories}
            className="w-full mt-2 btn btn-primary flex items-center justify-center space-x-2"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span>Generate Suggested Stories</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
          <label className="label">
                    Requirements
                  </label>
                  <div className="space-y-3">
                    {generatingRequirements && formData.requirements.length === 0 && (
                      <div className="text-sm text-purple-700 flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span>Drafting requirements with Gemini…</span>
                      </div>
                    )}
                    {formData.requirements.map((req: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => {
                            const newReqs = [...formData.requirements];
                            newReqs[index] = e.target.value;
                            updateFormData('requirements', newReqs);
                          }}
                          placeholder="Functional or non-functional requirement"
              className="input flex-1"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateFormData('requirements', [...formData.requirements, ''])}
            className="w-full btn btn-secondary"
                    >
                      + Add Requirement
                    </button>
                    <button
                      onClick={autoGenerateRequirements}
            className="w-full mt-2 btn btn-primary flex items-center justify-center space-x-2"
                    >
                      <ListChecks className="h-4 w-4" />
                      <span>Generate Suggested Requirements</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`btn ${currentStep === 0 ? 'btn-secondary opacity-60 cursor-not-allowed' : 'btn-secondary'}`}
              >
                Previous
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className={`btn btn-primary`}
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={exportPRD}
                  className={`btn btn-success`}
                >
                  Finish (Export PRD)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">AI Assistant</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Gemini Suggestions</h4>
                {stepLoading && (
                  <p className="text-sm text-purple-700 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Thinking…</span>
                  </p>
                )}
                {!stepLoading && stepSuggestions.length === 0 ? (
                  <div className="text-sm text-purple-700">
                    <p>
                      {geminiEnabled ? 'No suggestions yet. Add content in this step to get ideas.' : 'Gemini is not configured. Add VITE_GEMINI_API_KEY in .env to enable suggestions.'}
                    </p>
                    {geminiEnabled && (
                      <button
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                        onClick={() => {
                          // Trigger suggestions refetch by nudging step state
                          setCurrentStep((s) => s);
                        }}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : (!stepLoading && stepSuggestions.length > 0 ? (
                  <ul className="text-sm text-purple-700 space-y-2">
                    {stepSuggestions.map((s, i) => (
                      <li key={i} className="flex items-start justify-between space-x-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-400 mt-1">•</span>
                          <span>{s}</span>
                        </div>
                        {currentStep === 0 && (
                          <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => updateFormData('problem', (formData.problem ? formData.problem + '\n' : '') + s)}>Use</button>
                        )}
                        {currentStep === 1 && (
                          <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => updateFormData('solution', (formData.solution ? formData.solution + '\n' : '') + s)}>Use</button>
                        )}
                        {currentStep === 2 && (
                          <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => updateFormData('userStories', [...formData.userStories, s])}>Add</button>
                        )}
                        {currentStep === 3 && (
                          <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => updateFormData('requirements', [...formData.requirements, s])}>Add</button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null)}
                {currentStep === 1 && stepObjectives.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-purple-900 mb-1">Suggested Objectives</h5>
                    <ul className="text-sm text-purple-700 space-y-1">
                      {stepObjectives.map((o, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span>{o}</span>
                          <button className="text-xs text-blue-600 hover:text-blue-700" onClick={() => updateFormData('objectives', [...(formData.objectives as string[]), o])}>Add</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Best Practices</h4>
                <p className="text-sm text-purple-700">
                  {currentStep === 0 && "Focus on user pain points and business impact. Use data to support your problem statement."}
                  {currentStep === 1 && "Clearly articulate the value proposition and how it solves the identified problem."}
                  {currentStep === 2 && "Write user stories from the perspective of different user personas and prioritize by value."}
                  {currentStep === 3 && "Include both functional requirements and success criteria. Don't forget non-functional requirements."}
                </p>
              </div>

              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Completeness</h4>
                <div className="text-sm text-purple-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Gemini Score</span>
                    <span className={`font-bold ${Number(liveGeminiScore) >= 80 ? 'text-green-700' : Number(liveGeminiScore) >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                      {liveGeminiScore ?? '—'}/100
                    </span>
                  </div>
                  {liveGaps.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Gaps</div>
                      <ul className="list-disc ml-5 space-y-1">
                        {liveGaps.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {liveImprovements.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Improvements</div>
                      <ul className="list-disc ml-5 space-y-1">
                        {liveImprovements.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Progress Insight</h4>
                <p className="text-sm text-purple-700">
                  You're {Math.round(((currentStep + 1) / steps.length) * 100)}% complete with your PRD. 
                  Keep going - you're building something great! 🚀
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRDBuilder;
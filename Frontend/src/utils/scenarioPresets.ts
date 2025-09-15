import { PRDFormState, SectionsState } from '../store/prdStore';

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  sections: Partial<SectionsState>;
  seed?: Partial<Pick<PRDFormState, 'title' | 'problem' | 'solution' | 'objectives' | 'userStories' | 'requirements'>>;
  rationale?: string;
  tags?: string[];
}

// Helper: determine if string array is effectively empty (all blank or length 0)
const isArrayEmpty = (arr: string[] | undefined): boolean => !arr || arr.every(v => !v || !v.trim());

export const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'mvp',
    label: 'MVP',
    description: 'Lean spec focused on core problem, high-level solution and a few critical user stories.',
    sections: { problem: true, solution: true, objectives: true, userStories: true, requirements: false },
    seed: {
      title: 'MVP – Working Title',
      problem: 'Describe the single most painful user problem this MVP solves.',
      solution: 'Outline the smallest viable slice that validates the core value.',
      objectives: [ 'Validate core demand', 'Shorten time-to-first-value', 'Gather qualitative feedback' ],
      userStories: [ 'As a <primary user>, I can <core action> so that <value>' ],
    },
    rationale: 'Reduces scope to validation slice; omits detailed requirements until learnings obtained.',
    tags: ['lean','validation']
  },
  {
    id: 'full-spec',
    label: 'Full Spec',
    description: 'Comprehensive specification including all requirement details.',
    sections: { problem: true, solution: true, objectives: true, userStories: true, requirements: true },
    seed: {
      problem: 'Provide a detailed description of the current pain points and context.',
      solution: 'Describe the end-to-end solution architecture and user experience.',
      objectives: [ 'Objective 1 – measurable', 'Objective 2 – measurable', 'Objective 3 – measurable' ],
      userStories: [ 'As a <actor>, I want <capability> so that <outcome>.' ],
      requirements: [ 'REQ-1: <short requirement statement>', 'REQ-2: <short requirement statement>' ]
    },
    rationale: 'Used when moving from discovery to full implementation readiness.',
    tags: ['detailed']
  },
  {
    id: 'experiment',
    label: 'Experiment',
    description: 'Hypothesis-driven experiment spec focused on learning objectives.',
    sections: { problem: true, solution: true, objectives: true, userStories: false, requirements: false },
    seed: {
      title: 'Experiment – Hypothesis Name',
      problem: 'Hypothesis: We believe that <change> will result in <impact metric> because <reasoning>.',
      solution: 'Test design: briefly outline variant(s) and control conditions.',
      objectives: [ 'Primary metric: <metric>', 'Success threshold: <value>', 'Secondary signals: <metrics>' ]
    },
    rationale: 'Removes delivery-heavy sections to focus on learn / decide fast.',
    tags: ['hypothesis','fast']
  },
  {
    id: 'growth',
    label: 'Growth Initiative',
    description: 'Emphasizes acquisition, activation or retention—story-led with minimal low-level requirements early.',
    sections: { problem: true, solution: true, objectives: true, userStories: true, requirements: false },
    seed: {
      objectives: [ 'Increase activation rate from X% → Y%', 'Lift weekly retention from X% → Y%', 'Improve conversion funnel step <n>' ],
      userStories: [ 'As a new user, I understand value within <n> minutes.' ]
    },
    rationale: 'Keeps iteration speed high—requirements emerge after initial impact validation.',
    tags: ['growth','iteration']
  },
  {
    id: 'hardening',
    label: 'Hardening / Quality',
    description: 'Focus on tightening reliability, performance and compliance aspects.',
    sections: { problem: true, solution: true, objectives: true, userStories: false, requirements: true },
    seed: {
      objectives: [ 'Reduce p95 latency from Xms → Yms', 'Lower error rate <metric> from X% → Y%', 'Achieve compliance <standard>' ],
      requirements: [ 'PERF: p95 latency ≤ Y ms under Z load', 'ERROR: <service> error rate ≤ Y%', 'SEC: All data encrypted at rest and in transit' ]
    },
    rationale: 'Story volume less relevant; emphasize measurable quality gates.',
    tags: ['quality','performance','reliability']
  }
];

export function mergePresetSeed(current: PRDFormState, preset: ScenarioPreset): Partial<PRDFormState> {
  const next: Partial<PRDFormState> = {};
  if (preset.seed) {
    if (preset.seed.title && !current.title.trim()) next.title = preset.seed.title;
    if (preset.seed.problem && !current.problem.trim()) next.problem = preset.seed.problem;
    if (preset.seed.solution && !current.solution.trim()) next.solution = preset.seed.solution;
    if (preset.seed.objectives && isArrayEmpty(current.objectives)) next.objectives = preset.seed.objectives;
    if (preset.seed.userStories && isArrayEmpty(current.userStories)) next.userStories = preset.seed.userStories;
    if (preset.seed.requirements && isArrayEmpty(current.requirements)) next.requirements = preset.seed.requirements;
  }
  return next;
}

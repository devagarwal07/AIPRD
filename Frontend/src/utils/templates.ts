export type Sections = {
  problem: boolean;
  solution: boolean;
  objectives: boolean; // nested under solution
  userStories: boolean;
  requirements: boolean;
};

export type TemplateChecklistItem = { id: string; label: string };

export type TemplateConfig = {
  id: string;
  label: string;
  description: string;
  defaultSections: Sections;
  checklist: TemplateChecklistItem[];
};

export const DEFAULT_TEMPLATE_ID = 'feature';

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'feature',
    label: 'Feature PRD',
    description: 'Standard feature proposal with problems, solutions, stories, and requirements.',
    defaultSections: {
      problem: true,
      solution: true,
      objectives: true,
      userStories: true,
      requirements: true,
    },
    checklist: [
      { id: 'user_problem', label: 'Clear user problem and context' },
      { id: 'solution_value', label: 'Solution outlines value proposition' },
      { id: 'objectives', label: 'Objectives and success metrics defined' },
      { id: 'stories', label: 'At least 3 user stories' },
      { id: 'requirements', label: 'Functional and non-functional requirements' },
    ],
  },
  {
    id: 'experiment',
    label: 'Experiment',
    description: 'Lean experiment format, focused on hypothesis and success metrics.',
    defaultSections: {
      problem: true,
      solution: true,
      objectives: true, // success metrics are key
      userStories: false,
      requirements: false,
    },
    checklist: [
      { id: 'hypothesis', label: 'Hypothesis stated and falsifiable' },
      { id: 'metrics', label: 'Primary and guardrail metrics' },
      { id: 'scope', label: 'Scope and timeline defined' },
      { id: 'risks', label: 'Risks and ethics reviewed' },
    ],
  },
  {
    id: 'techspec',
    label: 'Tech Spec',
    description: 'Technical plan emphasizing requirements and constraints.',
    defaultSections: {
      problem: true,
      solution: true,
      objectives: false,
      userStories: false,
      requirements: true,
    },
    checklist: [
      { id: 'nonfunctional', label: 'Non-functional requirements (perf, reliability, security)' },
      { id: 'constraints', label: 'Constraints and trade-offs documented' },
      { id: 'rollout', label: 'Rollout plan and monitoring' },
    ],
  },
];

export function getTemplateById(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

import { Lightbulb, Target, Users, ListChecks, CheckCircle } from 'lucide-react';

export interface PRDStepDef { key: StepKey; title: string; icon: any; optional?: boolean }
export type StepKey = 'problem'|'solution'|'objectives'|'userStories'|'requirements'|'review';

export const BASE_STEPS: PRDStepDef[] = [
  { key: 'problem', title: 'Problem', icon: Lightbulb },
  { key: 'solution', title: 'Solution', icon: Target },
  { key: 'objectives', title: 'Objectives', icon: Target, optional: true },
  { key: 'userStories', title: 'User Stories', icon: Users },
  { key: 'requirements', title: 'Requirements', icon: ListChecks },
  { key: 'review', title: 'Review', icon: CheckCircle }
];

export function deriveActiveSteps(sections: { problem: boolean; solution: boolean; objectives?: boolean; userStories: boolean; requirements: boolean; }) {
  return BASE_STEPS.filter(s =>
    (s.key==='problem' && sections.problem) ||
    (s.key==='solution' && sections.solution) ||
    (s.key==='objectives' && sections.objectives) ||
    (s.key==='userStories' && sections.userStories) ||
    (s.key==='requirements' && sections.requirements) ||
    s.key==='review'
  );
}

export function useStepIndex(active: PRDStepDef[], key: StepKey): number {
  return active.findIndex(s=>s.key===key);
}

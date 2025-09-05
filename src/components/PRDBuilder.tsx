import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Users, Target, CheckCircle, ArrowRight, Download, Sparkles, Wand2, ListChecks } from 'lucide-react';
import { assessPRD, generateRequirements, generateUserStories } from '../utils/ai';

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

  const aiSuggestions = {
    0: [
      "Consider framing the problem from the user's perspective",
      "Include quantitative data about the problem's impact",
      "Mention competitive landscape or market opportunity"
    ],
    1: [
      "Describe the core value proposition clearly",
      "Outline the main user journey or workflow",
      "Consider technical feasibility and constraints"
    ],
    2: [
      "Write stories in 'As a [user], I want [goal] so that [benefit]' format",
      "Prioritize stories by user value and business impact",
      "Include edge cases and error scenarios"
    ],
    3: [
      "Separate functional and non-functional requirements",
      "Include success metrics and acceptance criteria",
      "Consider security, performance, and accessibility"
    ]
  };

  const generateAISuggestion = (step: number, _content: string) => {
    const suggestions: Record<number, string[]> = {
      0: [
        "Based on industry trends, consider adding user pain points around mobile experience",
        "This problem aligns with common SaaS challenges. Consider mentioning scalability concerns",
        "Great problem statement! You might want to add specific user segments affected"
      ],
      1: [
        "Your solution approach looks solid. Consider how this integrates with existing workflows",
        "This solution could benefit from a phased rollout approach",
        "Excellent direction! Think about measuring user adoption metrics"
      ]
    };
    
    return suggestions[step] ? suggestions[step][Math.floor(Math.random() * suggestions[step].length)] : "Keep refining your content!";
  };

  const dynamicSuggestion = useMemo(() => {
    const content = `${formData.problem}\n${formData.solution}`;
    return generateAISuggestion(currentStep, content);
  }, [currentStep, formData.problem, formData.solution]);

  // PRD completeness assessment
  const prdAssessment = useMemo(() => assessPRD({
    title: formData.title,
    problem: formData.problem,
    solution: formData.solution,
    objectives: formData.objectives as string[],
    userStories: formData.userStories as string[],
    requirements: formData.requirements as string[],
  }), [formData]);

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

  const autoGenerateStories = () => {
    const stories = generateUserStories(formData.problem, formData.solution);
    updateFormData('userStories', stories);
  };

  const autoGenerateRequirements = () => {
    const reqs = generateRequirements(formData.userStories as string[]);
    updateFormData('requirements', reqs);
  };

  const exportPRD = () => {
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

## Completeness Score
- Score: ${prdAssessment.score}/100
- Missing: ${prdAssessment.missing.length ? prdAssessment.missing.map((m: string) => `"${m}"`).join(', ') : 'None'}

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

  return (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered PRD Builder</h2>
            <p className="text-gray-600 mt-1">Create comprehensive PRDs with intelligent guidance</p>
          </div>
          <button
            onClick={exportPRD}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export PRD</span>
          </button>
        </div>
      </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Progress Steps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PRD Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="e.g., Mobile App Push Notifications Feature"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Problem Statement
                  </label>
                  <textarea
                    value={formData.problem}
                    onChange={(e) => updateFormData('problem', e.target.value)}
                    rows={6}
                    placeholder="Describe the user problem you're solving... Include user segment, impact, frequency, and current workaround."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Solution Overview
                  </label>
                  <textarea
                    value={formData.solution}
                    onChange={(e) => updateFormData('solution', e.target.value)}
                    rows={6}
                    placeholder="Describe your proposed solution... Outline value proposition, approach, and rollout phases."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objectives</label>
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
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateFormData('objectives', [...(formData.objectives as string[]), ''])}
                      className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Stories
                  </label>
                  <div className="space-y-3">
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
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateFormData('userStories', [...formData.userStories, ''])}
                      className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      + Add User Story
                    </button>
                    <button
                      onClick={autoGenerateStories}
                      className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements
                  </label>
                  <div className="space-y-3">
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
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => updateFormData('requirements', [...formData.requirements, ''])}
                      className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      + Add Requirement
                    </button>
                    <button
                      onClick={autoGenerateRequirements}
                      className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
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
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentStep === steps.length - 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next Step
              </button>
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
                <h4 className="font-medium text-purple-900 mb-2">Smart Suggestions</h4>
                <ul className="text-sm text-purple-700 space-y-2">
                  {aiSuggestions[currentStep as keyof typeof aiSuggestions]?.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span className="italic">{dynamicSuggestion}</span>
                  </li>
                </ul>
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
                    <span className="font-medium">Score</span>
                    <span className={`font-bold ${prdAssessment.score >= 80 ? 'text-green-700' : prdAssessment.score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                      {prdAssessment.score}/100
                    </span>
                  </div>
                  {prdAssessment.missing.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Gaps</div>
                      <ul className="list-disc ml-5 space-y-1">
                        {prdAssessment.missing.map((m, i) => (
                          <li key={i}>{m}</li>
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
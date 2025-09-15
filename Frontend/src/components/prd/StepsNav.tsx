import { CheckCircle, ArrowRight } from 'lucide-react';
// Default React import removed (automatic JSX runtime)

export interface StepMeta { key: string; title: string; icon: any }

interface Props { steps: StepMeta[]; activeIndex: number; onSelect?: (i:number)=>void }
export const StepsNav: React.FC<Props> = ({ steps, activeIndex, onSelect }) => {
  const onKey = (e: React.KeyboardEvent) => {
    if(!onSelect) return;
    if(e.key==='ArrowRight' || e.key==='ArrowDown') { e.preventDefault(); onSelect(Math.min(steps.length-1, activeIndex+1)); }
    if(e.key==='ArrowLeft' || e.key==='ArrowUp') { e.preventDefault(); onSelect(Math.max(0, activeIndex-1)); }
    if(e.key==='Home') { e.preventDefault(); onSelect(0); }
    if(e.key==='End') { e.preventDefault(); onSelect(steps.length-1); }
  };
  return (
  <div className="card card-section mb-4 sticky top-4 z-30" role="tablist" aria-label="PRD steps" onKeyDown={onKey}>
      <div className="flex items-center justify-between overflow-x-auto">
        {steps.map((s, index) => {
          const IconComp = s.icon;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={index===activeIndex}
              aria-controls={`panel-step-${s.key}`}
              tabIndex={index===activeIndex?0:-1}
              onClick={() => onSelect?.(index)}
              className="flex items-center mr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${index === activeIndex ? 'bg-blue-600 text-white' : index < activeIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {index < activeIndex ? <CheckCircle className="h-4 w-4" /> : IconComp ? <IconComp className="h-4 w-4" /> : null}
              </div>
              <span className={`ml-2 text-sm font-medium ${index === activeIndex ? 'text-blue-600' : index < activeIndex ? 'text-green-600' : 'text-gray-400'}`}>{s.title}</span>
              {index < steps.length - 1 && <ArrowRight className="h-4 w-4 text-gray-300 mx-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// React import not required with new JSX transform
import { usePrdStore } from '../../store/prdStore';
import { useState, useMemo } from 'react';

interface Props { step: 'problem'|'solution'|'objectives'|'userStories'|'requirements'; }

export const StepEditor: React.FC<Props> = ({ step }) => {
  const form = usePrdStore(s=>s.formData);
  const update = usePrdStore(s=>s.updateForm);

  // Always define pagination hooks; only used for requirements view.
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const totalReq = form.requirements.length;
  const pageCount = Math.max(1, Math.ceil(totalReq / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalReq);
  const pageSlice = useMemo(()=> form.requirements.slice(start, end), [form.requirements, start, end]);

  const updateRequirement = (globalIdx: number, value: string) => {
    update('requirements', form.requirements.map((v, idx)=> idx===globalIdx ? value : v));
  };
  const addRequirement = () => {
    update('requirements', [...form.requirements, '']);
    if(page === pageCount-1 && (totalReq % PAGE_SIZE)===0) {
      setPage(page+1);
    }
  };

  let content: JSX.Element | null = null;
  switch(step) {
    case 'objectives':
      content = (
        <div className="space-y-2">
          {form.objectives.map((o,i)=>(
            <input key={i} className="input" value={o} placeholder={`Objective ${i+1}`} onChange={e=>update('objectives', form.objectives.map((v,idx)=>idx===i?e.target.value:v))} />
          ))}
          <button className="btn btn-secondary btn-sm" onClick={()=>update('objectives',[...form.objectives,''])}>Add Objective</button>
        </div>
      );
      break;
    case 'userStories':
      content = (
        <div className="space-y-2">
          {form.userStories.map((o,i)=>(
            <input key={i} className="input" value={o} placeholder={`User Story ${i+1}`} onChange={e=>update('userStories', form.userStories.map((v,idx)=>idx===i?e.target.value:v))} />
          ))}
          <button className="btn btn-secondary btn-sm" onClick={()=>update('userStories',[...form.userStories,''])}>Add Story</button>
        </div>
      );
      break;
    case 'requirements':
      content = (
        <div className="space-y-2">
          {pageCount>1 && (
            <div className="flex items-center justify-between text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <div>Requirements {start+1}-{end} of {totalReq}</div>
              <div className="flex items-center gap-1">
                <button className="btn btn-outline btn-xxs" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button>
                <span>Page {page+1}/{pageCount}</span>
                <button className="btn btn-outline btn-xxs" disabled={page===pageCount-1} onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))}>Next</button>
              </div>
            </div>
          )}
          {pageSlice.map((o,i)=>{
            const globalIdx = start + i;
            return (
              <input key={globalIdx} className="input" value={o} placeholder={`Requirement ${globalIdx+1}`} onChange={e=>updateRequirement(globalIdx, e.target.value)} />
            );
          })}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button className="btn btn-secondary btn-sm" onClick={addRequirement}>Add Requirement</button>
            {totalReq>50 && <button className="btn btn-outline btn-xs" onClick={()=>{
              alert('Consider enabling virtualization for extremely large requirement sets (future enhancement).');
            }}>Performance Hint</button>}
          </div>
        </div>
      );
      break;
    case 'problem':
      content = <textarea className="input h-40" value={form.problem} placeholder="Describe the problem" onChange={e=>update('problem', e.target.value)} />;
      break;
    case 'solution':
      content = <textarea className="input h-40" value={form.solution} placeholder="Outline the solution" onChange={e=>update('solution', e.target.value)} />;
      break;
    default:
      content = null;
  }
  return content;
};

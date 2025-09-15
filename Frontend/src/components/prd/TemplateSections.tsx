// Automatic JSX runtime removes need for React default import
import { SectionsState, usePrdStore } from '../../store/prdStore';
import { TEMPLATES, getTemplateById, DEFAULT_TEMPLATE_ID } from '../../utils/templates';

export const TemplateSections: React.FC = () => {
  const templateId = usePrdStore(s=>s.templateId);
  const setTemplateId = usePrdStore(s=>s.setTemplateId);
  const sections = usePrdStore(s=>s.sections);
  const setSections = usePrdStore(s=>s.setSections);
  const template = getTemplateById(templateId || DEFAULT_TEMPLATE_ID);
  return (
    <div className="card card-section mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Template</label>
          <select className="input" value={templateId} onChange={(e)=>setTemplateId(e.target.value)}>
            {TEMPLATES.map(t=> <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-2">{template.description}</p>
        </div>
        <div className="md:col-span-2">
          <label className="label">Sections</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([['problem','Problem'],['solution','Solution'],['objectives','Objectives'],['userStories','User Stories'],['requirements','Requirements']] as const).map(([k,label])=> (
              <label key={k} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={(sections as any)[k]} onChange={(e)=> setSections({ [k]: e.target.checked } as Partial<SectionsState>)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

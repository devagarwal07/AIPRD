import { useState, useEffect } from 'react';
import { getIntegrationConfig, setIntegrationConfig } from '../../utils/integrations';
import { toast } from '../../utils/toast';
import { Api, backendEnabled } from '../../utils/api';

export interface IntegrationConfig { linearWorkspace?: string; linearTeamHint?: string; jiraBaseUrl?: string; jiraProjectHint?: string; jiraProjectKey?: string; }

export const ConfigIntegrations: React.FC = () => {
  const [integrationCfg, setIntegrationCfg] = useState<IntegrationConfig>(() => getIntegrationConfig());
  const [draft, setDraft] = useState<IntegrationConfig>(integrationCfg);
  const [preview, setPreview] = useState<{ linear?: string; jira?: string }>({});
  const [errors, setErrors] = useState<{ jiraProjectKey?: string }>({});

  useEffect(() => { if (backendEnabled()) { (async () => { try { const remote = await Api.getIntegration(); if (remote) { const merged = { ...integrationCfg, ...remote }; setIntegrationCfg(merged); setDraft(merged); setIntegrationConfig(merged); } } catch { /* ignore */ } })(); } // eslint-disable-next-line
  }, []);

  // Live preview + validation
  useEffect(()=>{
    const examples: { linear?: string; jira?: string } = {};
    if (draft.linearWorkspace) {
      const team = draft.linearTeamHint ? `[${draft.linearTeamHint}] ` : '';
      examples.linear = `${team}User Story: Example feature title`;
    }
    if (draft.jiraBaseUrl) {
      const proj = draft.jiraProjectHint ? `[${draft.jiraProjectHint}] ` : '';
      examples.jira = `${proj}Requirement: Example requirement summary`;
    }
    setPreview(examples);
    // Validate Jira Project Key pattern
    if (draft.jiraProjectKey && !/^[A-Z][A-Z0-9]{1,9}$/.test(draft.jiraProjectKey)) {
      setErrors(e=> ({ ...e, jiraProjectKey: 'Must be 2–10 uppercase alphanumeric characters' }));
    } else {
      setErrors(e=> ({ ...e, jiraProjectKey: undefined }));
    }
  }, [draft.linearWorkspace, draft.linearTeamHint, draft.jiraBaseUrl, draft.jiraProjectHint, draft.jiraProjectKey]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Configure Integrations</h3>
      <div className="bg-white/60 rounded-lg p-4 space-y-3">
        <div>
          <label className="label">Linear Workspace</label>
          <input className="input" placeholder="your-workspace" value={draft.linearWorkspace || ''} onChange={e=> setDraft({ ...draft, linearWorkspace: e.target.value })} />
        </div>
        <div>
          <label className="label">Linear Team Hint (optional)</label>
          <input className="input" placeholder="TEAM" value={draft.linearTeamHint || ''} onChange={e=> setDraft({ ...draft, linearTeamHint: e.target.value })} />
        </div>
        <div>
          <label className="label">Jira Base URL</label>
          <input className="input" placeholder="https://yourcompany.atlassian.net" value={draft.jiraBaseUrl || ''} onChange={e=> setDraft({ ...draft, jiraBaseUrl: e.target.value })} />
        </div>
        <div>
          <label className="label">Jira Project Hint (optional)</label>
          <input className="input" placeholder="PROJ" value={draft.jiraProjectHint || ''} onChange={e=> setDraft({ ...draft, jiraProjectHint: e.target.value })} />
        </div>
        <div>
          <label className="label">Jira Project Key (API)</label>
          <input className="input" placeholder="REALKEY" value={draft.jiraProjectKey || ''} onChange={e=> setDraft({ ...draft, jiraProjectKey: e.target.value.toUpperCase() })} />
          <p className="text-[11px] text-gray-500 mt-1">Optional explicit key (A–Z, 2–10 chars) for backend Jira sync.</p>
          {errors.jiraProjectKey && <p className="text-[11px] text-red-600 mt-1">{errors.jiraProjectKey}</p>}
        </div>
        {(preview.linear || preview.jira) && (
          <div className="mt-4 rounded-md border bg-gray-50 p-3 text-xs space-y-2">
            <div className="font-medium text-gray-700">Prefix Preview</div>
            {preview.linear && <div><span className="text-gray-500">Linear Title:</span> <span className="font-mono">{preview.linear}</span></div>}
            {preview.jira && <div><span className="text-gray-500">Jira Summary:</span> <span className="font-mono">{preview.jira}</span></div>}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button className="btn btn-secondary" onClick={()=> setDraft(integrationCfg)}>Reset</button>
          <button className="btn btn-primary" disabled={!!errors.jiraProjectKey} onClick={async ()=> { setIntegrationConfig(draft); setIntegrationCfg(draft); toast.success('Integration settings saved'); if (backendEnabled()) { try { await Api.saveIntegration(draft); } catch { toast.error('Server integration save failed'); } } }}>Save</button>
        </div>
      </div>
      <p className="text-xs text-gray-600">{backendEnabled() ? 'Settings stored locally and synced to server.' : 'Settings stored locally only.'}</p>
    </div>
  );
};

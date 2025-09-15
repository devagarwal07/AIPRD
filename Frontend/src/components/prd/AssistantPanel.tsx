// React 17+ automatic JSX runtime: no need for default React import
import { Sparkles } from 'lucide-react';
import React, { useState, useCallback } from 'react';

interface AssistantProps {
  suggestions: string[];
  loadingSuggestions: boolean;
  loadingAssessment: boolean;
  onUse: (s: string)=>void;
  onRefresh: () => void;
  lastUpdated: number | null;
  liveScore: number | null;
  liveGaps: string[];
  liveImprovements: string[];
  exportPanels: React.ReactNode;
  error?: string | null;
  /** allow parent to hide header refresh button if it renders an external control */
  showHeaderRefresh?: boolean;
}

export const AssistantPanel: React.FC<AssistantProps> = ({ suggestions, loadingSuggestions, loadingAssessment, onUse, onRefresh, lastUpdated, liveScore, liveGaps, liveImprovements, exportPanels, error, showHeaderRefresh = true }) => {
  const tabs = [
    { key: 'suggestions', label: 'Suggestions' },
    { key: 'export', label: 'Export & Integrations' },
    { key: 'completeness', label: 'Completeness' },
  ];
  const [active, setActive] = useState('suggestions');
  const onKey = useCallback((e: React.KeyboardEvent) => {
    const idx = tabs.findIndex(t=>t.key===active);
    if(e.key==='ArrowRight') { e.preventDefault(); setActive(tabs[(idx+1)%tabs.length].key); }
    if(e.key==='ArrowLeft') { e.preventDefault(); setActive(tabs[(idx-1+tabs.length)%tabs.length].key); }
    if(e.key==='Home') { e.preventDefault(); setActive(tabs[0].key); }
    if(e.key==='End') { e.preventDefault(); setActive(tabs[tabs.length-1].key); }
  }, [active, tabs]);
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-1">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">AI Assistant</h3>
        {showHeaderRefresh && (
          <button className="ml-auto btn btn-xs btn-outline" onClick={onRefresh} disabled={loadingSuggestions || loadingAssessment} aria-label="Refresh AI now">Refresh</button>
        )}
      </div>
      <div role="tablist" aria-label="Assistant panels" onKeyDown={onKey} className="flex gap-2">
        {tabs.map(t=> {
          const selected = t.key===active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`assistant-panel-${t.key}`}
              tabIndex={selected?0:-1}
              onClick={()=> setActive(t.key)}
              className={`px-3 py-1 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 ${selected? 'bg-purple-600 text-white' : 'bg-white/60 text-gray-700 hover:bg-purple-100'}`}
            >{t.label}</button>
          );
        })}
      </div>
      <div id="assistant-panel-suggestions" role="tabpanel" hidden={active!=='suggestions'} aria-labelledby="assistant-tab-suggestions" className="bg-white/60 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">Gemini Suggestions</h4>
          {lastUpdated && (
            <span className="text-[10px] text-gray-500">Updated {Math.max(1, Math.floor((Date.now()-lastUpdated)/1000))}s ago</span>
          )}
        </div>
        {error && <div className="text-xs text-red-600 mb-2" role="alert">{error}</div>}
        {loadingSuggestions ? (
          <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Loading suggestions">
            <div className="h-3 bg-purple-200/60 rounded w-11/12" />
            <div className="h-3 bg-purple-200/60 rounded w-10/12" />
            <div className="h-3 bg-purple-200/60 rounded w-9/12" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-sm text-gray-700">
            <p>No suggestions yet. Add content in this step to get ideas.</p>
          </div>
        ) : (
          <ul className="text-sm text-gray-700 space-y-2 max-h-64 overflow-auto pr-1">
            {suggestions.map((s,i)=>(
              <li key={i} className="flex items-start justify-between space-x-2">
                <div className="flex items-start space-x-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span className="break-words leading-relaxed">{s}</span>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700" onClick={()=>onUse(s)}>Use</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div id="assistant-panel-export" role="tabpanel" hidden={active!=='export'} aria-labelledby="assistant-tab-export" className="bg-white/60 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Export & Integrations</h4>
        {exportPanels}
      </div>
      <div id="assistant-panel-completeness" role="tabpanel" hidden={active!=='completeness'} aria-labelledby="assistant-tab-completeness" className="bg-white/60 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Completeness</h4>
        <div className="text-sm text-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Gemini Score</span>
            <span className={`font-bold ${liveScore == null ? 'text-gray-500' : Number(liveScore) >= 80 ? 'text-green-700' : Number(liveScore) >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{liveScore ?? '—'}/100</span>
          </div>
          {loadingAssessment && <div className="text-[10px] text-gray-500 mb-2" aria-live="polite">Assessing...</div>}
          {liveGaps.length > 0 && (
            <div className="mt-2">
              <div className="font-medium mb-1">Gaps</div>
              <ul className="list-disc ml-5 space-y-1">{liveGaps.map((m,i)=><li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {liveImprovements.length > 0 && (
            <div className="mt-2">
              <div className="font-medium mb-1">Improvements</div>
              <ul className="list-disc ml-5 space-y-1">{liveImprovements.map((m,i)=><li key={i}>{m}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

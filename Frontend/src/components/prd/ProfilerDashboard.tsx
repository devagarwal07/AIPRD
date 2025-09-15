import { getProfilerSummary, getWebVitalsAggregates, clearProfilingData, getWebVitals } from '../../utils/telemetry';
import { useEffect, useState } from 'react';

interface Agg { id:string; count:number; total:number; max:number; min:number; avg:number; last:number; }

export const ProfilerDashboard: React.FC = () => {
  const [agg, setAgg] = useState<Agg[]>([]);
  const [ts, setTs] = useState<number>(Date.now());
  const [vitals, setVitals] = useState<any[]>([]);
  useEffect(()=>{
    const i = setInterval(()=> {
      const { aggregates } = getProfilerSummary();
      setAgg(aggregates as any);
      setVitals(getWebVitalsAggregates() as any);
      setTs(Date.now());
    }, 1500);
    return ()=> clearInterval(i);
  }, []);
  const [virtOverride, setVirtOverride] = useState<string>(()=>{
    try { return localStorage.getItem('pmc_snap_virtual_override') || 'auto'; } catch { return 'auto'; }
  });
  const updateOverride = (val: string) => {
    setVirtOverride(val);
    try { if(val==='auto') localStorage.removeItem('pmc_snap_virtual_override'); else localStorage.setItem('pmc_snap_virtual_override', val); } catch {}
    window.dispatchEvent(new CustomEvent('pmc_virtual_override', { detail: { value: val } }));
  };
  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">React Profiler</h4>
        <span className="text-[10px] text-gray-500 tabular-nums">{new Date(ts).toLocaleTimeString()}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-medium">Virtualization:</span>
        <select className="select select-xs" value={virtOverride} onChange={e=> updateOverride(e.target.value)}>
          <option value="auto">Auto</option>
            <option value="force-on">Force On</option>
            <option value="force-off">Force Off</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            className="btn btn-xs btn-outline"
            onClick={()=> {
              const summary = getProfilerSummary();
              const vitalsRaw = getWebVitals();
              const vitalsAgg = getWebVitalsAggregates();
              const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), profiler: summary, vitals: { aggregates: vitalsAgg, samples: vitalsRaw } }, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'profiling-summary.json';
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(()=> URL.revokeObjectURL(url), 2000);
            }}
            title="Download current aggregated profiler + web vitals data as JSON"
          >Download JSON</button>
          <button
            className="btn btn-xs"
            onClick={()=> { clearProfilingData(); setAgg([]); setVitals([]); }}
            title="Clear profiler and web vitals buffers"
          >Clear</button>
        </div>
      </div>
      {agg.length===0 && <div className="text-gray-500">No samples yet… interact with the app.</div>}
      <ul className="space-y-2 max-h-72 overflow-auto pr-1">
        {agg.map(a=> (
          <li key={a.id} className="border rounded p-2 bg-white/60">
            <div className="font-medium text-gray-700 mb-1 truncate" title={a.id}>{a.id}</div>
            <div className="grid grid-cols-6 gap-x-3 gap-y-1 leading-tight text-[11px] tabular-nums">
              <span><span className="text-gray-500">Ct</span>: <strong>{a.count}</strong></span>
              <span><span className="text-gray-500">Avg</span>: <strong>{a.avg.toFixed(2)}ms</strong></span>
              <span><span className="text-gray-500">Last</span>: <strong>{a.last.toFixed(2)}ms</strong></span>
              <span><span className="text-gray-500">Tot</span>: <strong>{a.total.toFixed(1)}ms</strong></span>
              <span><span className="text-gray-500">Max</span>: <strong>{a.max.toFixed(1)}ms</strong></span>
              <span><span className="text-gray-500">Min</span>: <strong>{a.min === Number.POSITIVE_INFINITY ? '—' : a.min.toFixed(1)+'ms'}</strong></span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <h5 className="font-semibold text-gray-800 mb-1">Web Vitals</h5>
        {vitals.length===0 && <div className="text-gray-500 text-[11px]">No vitals captured yet.</div>}
        {vitals.length>0 && (
          <ul className="space-y-1 text-[11px] tabular-nums">
            {vitals.map(v=> (
              <li key={v.name} className="flex flex-wrap gap-x-4 gap-y-0.5">
                <span className="font-medium">{v.name}</span>
                <span>Count: {v.count}</span>
                <span>Avg: {v.avg.toFixed(2)}</span>
                <span>Last: {v.last.toFixed(2)}</span>
                <span>Max: {v.max.toFixed(2)}</span>
                <span>Min: {v.min.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[10px] text-gray-500">Data cleared on refresh. Emitted from React Profiler onRender hook.</p>
    </div>
  );
};

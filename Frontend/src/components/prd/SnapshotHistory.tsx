import { useEffect, useMemo, useState, memo, useRef } from 'react';
import { metric } from '../../utils/telemetry';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { usePrdStore } from '../../store/prdStore';
import { toast } from '../../utils/toast';

// Snapshot list item (memoized) to avoid recalculating diff logic for unaffected rows
type Snapshot = ReturnType<typeof usePrdStore> extends { snapshots: infer T } ? T extends Array<infer U> ? U : any : any;
interface SnapshotItemProps {
  s: Snapshot;
  idx: number;
  baseline: any;
  sideBySide: boolean;
  expanded: boolean;
  onToggle: () => void;
  buildSnapshotMarkdown: (s: any, idx: number, changed: Array<{key:string;label:string}>) => string;
  diffArrays: (a:string[], b:string[])=> { added:string[]; removed:string[] };
  lineDiff: (a:string,b:string)=> Array<{type:'same'|'add'|'remove'; text:string}>;
  restoreSnapshot: (id:string)=>void;
  deleteSnapshot: (id:string)=>void;
  toast: typeof toast;
}

const SnapshotItem = memo((props: SnapshotItemProps) => {
  const { s, idx, baseline, sideBySide, expanded, onToggle, buildSnapshotMarkdown, diffArrays, lineDiff, restoreSnapshot, deleteSnapshot, toast } = props;
  // Compute changed summary only when needed (collapsed or expanded) & memoize by dependencies
  const changed = useMemo(()=>{
    const list: Array<{key:string; label:string}> = [];
    const baseForm = baseline.formData;
    const baseSections = baseline.sections;
    const baseTemplate = baseline.templateId;
    const changedString = (a:string,b:string)=> (a||'') !== (b||'');
    if(changedString(baseForm.title, s.formData.title)) list.push({key:'title', label:'Title'});
    if(changedString(baseForm.problem, s.formData.problem)) list.push({key:'problem', label:'Problem'});
    if(changedString(baseForm.solution, s.formData.solution)) list.push({key:'solution', label:'Solution'});
    const obj = diffArrays(baseForm.objectives, s.formData.objectives); if(obj.added.length||obj.removed.length) list.push({key:'objectives',label:'Objectives'});
    const ust = diffArrays(baseForm.userStories, s.formData.userStories); if(ust.added.length||ust.removed.length) list.push({key:'userStories',label:'User Stories'});
    const req = diffArrays(baseForm.requirements, s.formData.requirements); if(req.added.length||req.removed.length) list.push({key:'requirements',label:'Requirements'});
    if(JSON.stringify(baseSections)!==JSON.stringify(s.sections)) list.push({key:'sections',label:'Sections'});
    if(baseTemplate!==s.templateId) list.push({key:'templateId',label:'Template'});
    return list;
  }, [baseline, s]);

  const date = useMemo(()=> new Date(s.ts).toLocaleString(), [s.ts]);

  return (
    <li className="bg-white/60 rounded-lg p-3 border border-gray-200" key={s.id}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle} aria-expanded={expanded} aria-controls={`snapshot-details-${s.id}`}>
        <div>
          <div className="text-sm font-medium text-gray-900">{date}{s.note?` — ${s.note}`:''}</div>
          <div className="text-xs text-gray-600">{changed.length===0 ? 'No differences' : `${changed.length} change(s): ${changed.map(c=>c.label).join(', ')}`}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-success btn-sm" onClick={(e)=> { e.stopPropagation(); restoreSnapshot(s.id); toast.success('Restored from snapshot — click to undo'); const region = document.getElementById('snapshot-live-region'); if(region) { region.textContent = `Snapshot from ${date} restored`; } setTimeout(()=>{ const container=document.getElementById('pmcopilot_toast_container'); if(container){ const last=container.lastElementChild; if(last){ const handler = () => { const ev = new CustomEvent('pmc_snapshot_undo'); window.dispatchEvent(ev); last.removeEventListener('click', handler); }; last.addEventListener('click', handler); } } }, 10); }}>Restore</button>
          <button className="btn btn-secondary btn-sm" onClick={(e)=> { e.stopPropagation(); deleteSnapshot(s.id); }}>Delete</button>
        </div>
      </div>
      {expanded && changed.length>0 && (
        <div id={`snapshot-details-${s.id}`} className="mt-3 border-t pt-3 space-y-4">
          <div className="flex justify-end gap-2">
            <button className="btn btn-outline btn-xs" onClick={(e)=>{
              e.stopPropagation();
              const md = buildSnapshotMarkdown(s, idx, changed);
              navigator.clipboard.writeText(md).then(()=> toast.success('Diff copied as Markdown')).catch(()=> toast.error('Copy failed'));
            }}>Copy Diff (MD)</button>
            <button className="btn btn-secondary btn-xs" onClick={(e)=>{
              e.stopPropagation();
              const md = buildSnapshotMarkdown(s, idx, changed);
              const blob = new Blob([md], { type:'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `snapshot-${s.id}.md`;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(()=> URL.revokeObjectURL(url), 1500);
            }}>Download .md</button>
          </div>
          {changed.map(c=>{
            if(c.key==='objectives' || c.key==='userStories' || c.key==='requirements'){
              const beforeArr = (baseline.formData as any)[c.key] as string[];
              const afterArr = (s.formData as any)[c.key] as string[];
              const diff = diffArrays(beforeArr, afterArr);
              return (
                <div key={c.key} className="text-xs">
                  <div className="font-semibold text-gray-800 mb-1">{c.label}</div>
                  {diff.added.length>0 && <div className="text-green-700 mb-1">+ {diff.added.join(', ')}</div>}
                  {diff.removed.length>0 && <div className="text-red-700 mb-1">- {diff.removed.join(', ')}</div>}
                  {!diff.added.length && !diff.removed.length && <div className="text-gray-500">No list changes</div>}
                </div>
              );
            }
            if(c.key==='sections'){
              const before = Object.keys(baseline.sections).filter((k:any)=>(baseline.sections as any)[k]);
              const after = Object.keys(s.sections).filter((k:any)=>(s.sections as any)[k]);
              const diff = diffArrays(before, after);
              return (
                <div key={c.key} className="text-xs">
                  <div className="font-semibold text-gray-800 mb-1">Sections</div>
                  {diff.added.length>0 && <div className="text-green-700 mb-1">+ {diff.added.join(', ')}</div>}
                  {diff.removed.length>0 && <div className="text-red-700 mb-1">- {diff.removed.join(', ')}</div>}
                </div>
              );
            }
            if(c.key==='templateId'){
              return <div key={c.key} className="text-xs"><span className="font-semibold">Template:</span> {baseline.templateId} → {s.templateId}</div>;
            }
            const beforeVal = (baseline.formData as any)[c.key] as string;
            const afterVal = (s.formData as any)[c.key] as string;
            const rows = lineDiff(beforeVal, afterVal);
            if(sideBySide){
              const beforeLines = (beforeVal||'').split(/\r?\n/);
              const afterLines = (afterVal||'').split(/\r?\n/);
              return (
                <div key={c.key} className="text-xs">
                  <div className="font-semibold text-gray-800 mb-1">{c.label}</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] max-h-60 overflow-auto">
                    <div className="bg-gray-900 text-gray-100 rounded p-2 space-y-0.5">
                      {beforeLines.map((l,i)=> <div key={i} className={afterLines[i]===l? 'text-gray-400':'text-red-300'}>{l || ' '}</div>)}
                    </div>
                    <div className="bg-gray-900 text-gray-100 rounded p-2 space-y-0.5">
                      {afterLines.map((l,i)=> <div key={i} className={beforeLines[i]===l? 'text-gray-400':'text-green-300'}>{l || ' '}</div>)}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={c.key} className="text-xs">
                <div className="font-semibold text-gray-800 mb-1">{c.label}</div>
                {rows.length===0 ? <div className="text-gray-500">Changed</div> : (
                  <pre className="text-[11px] bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto max-h-40">
                    {rows.map((r,i)=> <div key={i} className={r.type==='add'?'text-green-400': r.type==='remove'?'text-red-400':'text-gray-400'}>{r.type==='add'?'+': r.type==='remove'?'-':' '} {r.text}</div>)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}, (prev, next)=>{
  // Custom equality: re-render only if expansion state or side-by-side / context / baseline identity or comparePrev toggles affecting this row
  return prev.expanded === next.expanded &&
    prev.sideBySide === next.sideBySide &&
    prev.baseline === next.baseline &&
    prev.s === next.s; // snapshot object identity changes when updated
});

export const SnapshotHistory: React.FC = () => {
  const snapshots = usePrdStore(s=>s.snapshots);
  const addSnapshot = usePrdStore(s=>s.addSnapshot);
  const restoreSnapshot = usePrdStore(s=>s.restoreSnapshot);
  const deleteSnapshot = usePrdStore(s=>s.deleteSnapshot);
  const form = usePrdStore(s=>s.formData);
  const sections = usePrdStore(s=>s.sections);
  const templateId = usePrdStore(s=>s.templateId);
  const undoRestore = usePrdStore(s=>s.undoRestore);

  function diffArrays(a: string[], b: string[]) {
    const aSet = new Set(a.filter(Boolean));
    const bSet = new Set(b.filter(Boolean));
    const added: string[] = []; const removed: string[] = [];
    bSet.forEach(v=> { if(!aSet.has(v)) added.push(v); });
    aSet.forEach(v=> { if(!bSet.has(v)) removed.push(v); });
    return { added, removed };
  }

  const [openId, setOpenId] = useState<string|null>(null);
  const [comparePrev, setComparePrev] = useState<boolean>(()=>{
    try { return localStorage.getItem('pmc_snap_comparePrev') === '1'; } catch { return false; }
  });
  const [sideBySide, setSideBySide] = useState<boolean>(()=>{
    try { return localStorage.getItem('pmc_snap_sideBySide') === '1'; } catch { return false; }
  });

  useEffect(()=> { try { localStorage.setItem('pmc_snap_comparePrev', comparePrev? '1':'0'); } catch {} }, [comparePrev]);
  useEffect(()=> { try { localStorage.setItem('pmc_snap_sideBySide', sideBySide? '1':'0'); } catch {} }, [sideBySide]);

  const [contextLines, setContextLines] = useState<number>(()=>{
    try { return Number(localStorage.getItem('pmc_snap_ctx')||'3') || 3; } catch { return 3; }
  });
  useEffect(()=> { try { localStorage.setItem('pmc_snap_ctx', String(contextLines)); } catch {} }, [contextLines]);

  function lineDiff(oldStr: string, newStr: string) {
    const oldLines = (oldStr||'').split(/\r?\n/);
    const newLines = (newStr||'').split(/\r?\n/);
    const rows: Array<{ type: 'same'|'add'|'remove'; text: string }>=[];
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);
    for(const l of oldLines) if(!newSet.has(l) && l.trim()) rows.push({ type:'remove', text:l });
    for(const l of newLines) if(!oldSet.has(l) && l.trim()) rows.push({ type:'add', text:l });
    if(rows.length){
      let context = 0;
      for(let i=0;i<oldLines.length && context<contextLines;i++){
        const o = oldLines[i]; const n = newLines[i];
        if(o===n && o?.trim()) { rows.push({ type:'same', text:o }); context++; }
      }
    }
    return rows;
  }

  function buildSnapshotMarkdown(s: typeof snapshots[number], idx: number, changed: Array<{key:string; label:string}>) {
    const date = new Date(s.ts).toLocaleString();
    let md = `### Snapshot ${date}\n`;
    md += comparePrev ? '(Compared to previous snapshot)\n' : '(Compared to current form)\n';
    for(const c of changed){
      if(c.key==='objectives'||c.key==='userStories'||c.key==='requirements'){
        const baselineForm = comparePrev && idx < snapshots.length-1 ? snapshots[idx+1].formData : form;
        const beforeArr = (baselineForm as any)[c.key] as string[];
        const afterArr = (s.formData as any)[c.key] as string[];
        const diff = diffArrays(beforeArr, afterArr);
        md += `\n#### ${c.label}\n`;
        if(diff.added.length) md += diff.added.map(a=>`+ ${a}`).join('\n')+'\n';
        if(diff.removed.length) md += diff.removed.map(r=>`- ${r}`).join('\n')+'\n';
      } else if(c.key==='sections') {
        const baselineSections = comparePrev && idx < snapshots.length-1 ? snapshots[idx+1].sections : sections;
        const before = Object.keys(baselineSections).filter(k=>(baselineSections as any)[k]);
        const after = Object.keys(s.sections).filter(k=>(s.sections as any)[k]);
        const diff = diffArrays(before, after);
        md += `\n#### Sections\n`;
        if(diff.added.length) md += diff.added.map(a=>`+ ${a}`).join('\n')+'\n';
        if(diff.removed.length) md += diff.removed.map(r=>`- ${r}`).join('\n')+'\n';
      } else if(c.key==='templateId') {
        const baselineTemplate = comparePrev && idx < snapshots.length-1 ? snapshots[idx+1].templateId : templateId;
        md += `\n#### Template\n${baselineTemplate} -> ${s.templateId}\n`;
      } else {
        const baselineForm = comparePrev && idx < snapshots.length-1 ? snapshots[idx+1].formData : form;
        const beforeVal = (baselineForm as any)[c.key] as string;
        const afterVal = (s.formData as any)[c.key] as string;
        if(beforeVal!==afterVal){
          md += `\n#### ${c.label}\n`;
          md += '```diff\n';
          const beforeLines = (beforeVal||'').split(/\r?\n/);
          const afterLines = (afterVal||'').split(/\r?\n/);
          const beforeSet = new Set(beforeLines);
          const afterSet = new Set(afterLines);
          for(const l of beforeLines) if(!afterSet.has(l)) md += `- ${l}\n`;
          for(const l of afterLines) if(!beforeSet.has(l)) md += `+ ${l}\n`;
          md += '```\n';
        }
      }
    }
    return md;
  }

  // Virtualization (basic): only when large list & nothing expanded
  // Adaptive virtualization: measure initial full (non-virtual) render cost, then decide.
  const [adaptiveVirtual, setAdaptiveVirtual] = useState<boolean>(()=>{
    try { return localStorage.getItem('pmc_snap_virtual_enabled') === '1'; } catch { return false; }
  });
  const measured = useRef<boolean>(false);
  const startRef = useRef<number>(0);

  // Start timing before list mapping (render phase approximation via layout effect alternative)
  if(!measured.current && startRef.current === 0) {
    startRef.current = performance.now();
  }

  useEffect(()=> {
    if(measured.current) return;
    if(snapshots.length){
      const dur = performance.now() - startRef.current;
      measured.current = true;
      const enable = snapshots.length > 40 || dur > 28; // heuristics
      if(enable) {
        setAdaptiveVirtual(true);
        try { localStorage.setItem('pmc_snap_virtual_enabled','1'); } catch {}
      }
      metric('virtualization_evaluation', { snapshots: snapshots.length, ms: Number(dur.toFixed(2)), enable, persisted: enable });
    }
  // run once after initial list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global undo handler triggered from toast click (fired in SnapshotItem via custom event)
  useEffect(()=> {
    const handler = () => { if(undoRestore()) { toast.info('Undo successful'); const region=document.getElementById('snapshot-live-region'); if(region) region.textContent='Snapshot restore undone'; } };
    window.addEventListener('pmc_snapshot_undo', handler);
    return ()=> window.removeEventListener('pmc_snapshot_undo', handler);
  }, [undoRestore]);

  const [virtOverride, setVirtOverride] = useState<string>(()=>{
    try { return localStorage.getItem('pmc_snap_virtual_override') || 'auto'; } catch { return 'auto'; }
  });
  useEffect(()=>{
    const handler = (e: any)=> { setVirtOverride(e.detail?.value || 'auto'); };
    window.addEventListener('pmc_virtual_override', handler);
    return ()=> window.removeEventListener('pmc_virtual_override', handler);
  }, []);
  const useVirtual = (()=> {
    if(virtOverride==='force-on') return openId == null;
    if(virtOverride==='force-off') return false;
    return (adaptiveVirtual || snapshots.length > 80) && openId == null;
  })();

  // Dynamic row height sampling (collapsed rows only)
  const [rowHeight, setRowHeight] = useState<number>(108);
  const sampleRef = useRef<HTMLDivElement | null>(null);
  useEffect(()=> {
    if(sampleRef.current) {
      const h = sampleRef.current.getBoundingClientRect().height;
      if(h && Math.abs(h - rowHeight) > 4) setRowHeight(Math.ceil(h));
    }
  }, [snapshots.length]);

  return (
    <div className="space-y-4">
      <div id="snapshot-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="font-semibold text-gray-900 flex items-center gap-4 flex-wrap">Snapshots
          {sideBySide && <span className="inline-flex items-center bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">SxS</span>}
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" className="checkbox checkbox-xs" checked={comparePrev} onChange={e=> setComparePrev(e.target.checked)} />
            Prev baseline
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" className="checkbox checkbox-xs" checked={sideBySide} onChange={e=> setSideBySide(e.target.checked)} />
            Side-by-side
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600 select-none">
            Ctx
            <input type="number" min={0} max={10} value={contextLines} onChange={e=> setContextLines(Math.min(10, Math.max(0, Number(e.target.value)||0)))} className="w-12 input input-xs px-1 py-0.5" />
          </label>
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={()=> { addSnapshot({ formData: form, sections, templateId }); toast.success('Snapshot saved'); }}>Save snapshot</button>
      </div>
      {snapshots.length===0 ? <p className="text-sm text-gray-600">No snapshots yet.</p> : (
        <div>
          {useVirtual ? (
            <FixedSizeList height={500} width={'100%'} itemCount={snapshots.length} itemSize={rowHeight} className="space-y-3 pmc-virtual-list">
              {({ index, style }: ListChildComponentProps) => {
                const s = snapshots[index];
                const baseline = comparePrev && index < snapshots.length - 1 ? snapshots[index+1] : { formData: form, sections, templateId } as any;
                return (
                  <div style={style} className="pr-1">
                    <SnapshotItem
                      key={s.id}
                      s={s}
                      idx={index}
                      baseline={baseline}
                      sideBySide={sideBySide}
                      expanded={openId === s.id}
                      onToggle={()=> { setOpenId(openId===s.id? null : s.id); }}
                      buildSnapshotMarkdown={buildSnapshotMarkdown}
                      diffArrays={diffArrays}
                      lineDiff={lineDiff}
                      restoreSnapshot={restoreSnapshot}
                      deleteSnapshot={deleteSnapshot}
                      toast={toast}
                    />
                  </div>
                );
              }}
            </FixedSizeList>
          ) : (
            <ul className="space-y-3">
              {snapshots.map((s, idx)=> {
                const baseline = comparePrev && idx < snapshots.length - 1 ? snapshots[idx+1] : { formData: form, sections, templateId } as any;
                return (
                  <div ref={idx===0 ? sampleRef : undefined} key={s.id}>
                    <SnapshotItem
                    s={s}
                    idx={idx}
                    baseline={baseline}
                    sideBySide={sideBySide}
                    expanded={openId === s.id}
                    onToggle={()=> setOpenId(openId===s.id? null : s.id)}
                    buildSnapshotMarkdown={buildSnapshotMarkdown}
                    diffArrays={diffArrays}
                    lineDiff={lineDiff}
                    restoreSnapshot={restoreSnapshot}
                    deleteSnapshot={deleteSnapshot}
                    toast={toast}
                    />
                  </div>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

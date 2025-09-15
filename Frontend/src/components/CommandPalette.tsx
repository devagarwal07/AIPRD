import React, { useEffect, useRef, useState } from 'react';

export interface CommandItem {
  id: string;
  title: string;
  group?: string;
  keywords?: string;
  onRun: () => void;
  shortcut?: string;
}

interface Props { open: boolean; onClose: ()=>void; items: CommandItem[] }

export const CommandPalette: React.FC<Props> = ({ open, onClose, items }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement|null>(null);
  const listRef = useRef<HTMLDivElement|null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(()=>{ if(open){ setQuery(''); setActiveIdx(0); setTimeout(()=> inputRef.current?.focus(), 30); } },[open]);

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if(!open) return;
      if(e.key==='Escape'){ e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[open,onClose]);

  const norm = (s:string) => s.toLowerCase();
  const filtered = items.filter(i=>{
    if(!query) return true;
    const q = norm(query);
    return norm(i.title).includes(q) || (i.keywords && norm(i.keywords).includes(q));
  });

  const run = (item: CommandItem) => { item.onRun(); onClose(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if(e.key==='ArrowDown'){ e.preventDefault(); setActiveIdx(i=> Math.min(filtered.length-1, i+1)); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setActiveIdx(i=> Math.max(0, i-1)); }
    else if(e.key==='Enter'){ e.preventDefault(); if(filtered[activeIdx]) run(filtered[activeIdx]); }
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl rounded-lg shadow-lg border border-gray-200 bg-white overflow-hidden animate-fade-in" onKeyDown={onKeyDown}>
        <div className="border-b px-3 py-2 flex items-center gap-2 bg-gray-50">
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type a command or search…" className="w-full bg-transparent outline-none text-sm" aria-label="Search commands" />
          <button className="text-xs text-gray-500 hover:text-gray-700" onClick={onClose}>Esc</button>
        </div>
        <div ref={listRef} className="max-h-80 overflow-auto py-2" role="listbox" aria-label="Command results">
          {filtered.length===0 && <div className="px-4 py-6 text-center text-xs text-gray-500">No matches</div>}
          {filtered.map((item, idx)=> (
            <button
              key={item.id}
              role="option"
              aria-selected={idx===activeIdx}
              onClick={()=> run(item)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-3 ${idx===activeIdx? 'bg-indigo-600 text-white':'hover:bg-gray-100 text-gray-700'}`}
            >
              <span>{item.title}</span>
              {item.shortcut && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${idx===activeIdx? 'border-white/40':'border-gray-300 text-gray-500'}`}>{item.shortcut}</span>}
            </button>
          ))}
        </div>
        <div className="border-t px-3 py-2 flex items-center justify-between bg-gray-50 text-[10px] text-gray-500">
          <div>Navigate ↑↓ • Enter run • Esc close</div>
          <div>Total: {filtered.length}</div>
        </div>
      </div>
    </div>
  );
};

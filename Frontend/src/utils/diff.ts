// Lightweight inline diff for small text blocks (word-level)
export type DiffToken = { text: string; type: 'same' | 'add' | 'del' };

export function diffWords(oldText: string, newText: string): DiffToken[] {
  const o = oldText.split(/\s+/);
  const n = newText.split(/\s+/);
  const dp: number[][] = Array(o.length + 1).fill(0).map(()=> Array(n.length + 1).fill(0));
  for (let i= o.length -1; i>=0; i--) {
    for (let j= n.length -1; j>=0; j--) {
      if (o[i] === n[j]) dp[i][j] = 1 + dp[i+1][j+1]; else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  const tokens: DiffToken[] = [];
  let i=0, j=0;
  while (i < o.length && j < n.length) {
    if (o[i] === n[j]) { tokens.push({ text: o[i], type: 'same' }); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { tokens.push({ text: o[i], type: 'del' }); i++; }
    else { tokens.push({ text: n[j], type: 'add' }); j++; }
  }
  while (i < o.length) { tokens.push({ text: o[i], type: 'del' }); i++; }
  while (j < n.length) { tokens.push({ text: n[j], type: 'add' }); j++; }
  return tokens;
}

export function renderDiff(oldText: string, newText: string): string {
  const tokens = diffWords(oldText, newText);
  return tokens.map(t => {
    if (t.type === 'same') return escapeHtml(t.text);
    if (t.type === 'add') return `<span class="px-0.5 bg-green-100 text-green-800 rounded-sm">${escapeHtml(t.text)}</span>`;
    return `<span class="px-0.5 bg-red-100 text-red-800 line-through rounded-sm">${escapeHtml(t.text)}</span>`;
  }).join(' ');
}

function escapeHtml(s: string){
  return s.replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
}

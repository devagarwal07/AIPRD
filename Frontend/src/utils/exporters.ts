import type { PRDFormLike, PRDSections } from '@core';

export function prdToHtml(form: PRDFormLike, sections: PRDSections): string {
  const esc = (s: string) => s
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  const parts: string[] = [];
  parts.push('<!DOCTYPE html><html><head><meta charset="utf-8"/><title>'+esc(form.title||'PRD')+'</title></head><body>');
  parts.push('<h1>'+esc(form.title||'Product Requirements Document')+'</h1>');
  if(sections.problem) parts.push('<h2>Problem</h2><p>'+esc(form.problem||'')+'</p>');
  if(sections.solution) parts.push('<h2>Solution</h2><p>'+esc(form.solution||'')+'</p>');
  if(sections.objectives) parts.push('<h2>Objectives</h2><ul>'+form.objectives.filter(Boolean).map(o=>'\n<li>'+esc(o)+'</li>').join('')+'\n</ul>');
  if(sections.userStories) parts.push('<h2>User Stories</h2><ol>'+form.userStories.filter(Boolean).map(o=>'\n<li>'+esc(o)+'</li>').join('')+'\n</ol>');
  if(sections.requirements) parts.push('<h2>Requirements</h2><ol>'+form.requirements.filter(Boolean).map(o=>'\n<li>'+esc(o)+'</li>').join('')+'\n</ol>');
  parts.push('<footer><small>Exported via PM Copilot</small></footer></body></html>');
  return parts.join('\n');
}

// Placeholder for future PDF generation (would need a library client side or server endpoint)
export async function prdToPdfPlaceholder(html: string): Promise<Blob> {
  // For now, wrap HTML in a text blob; real implementation would render to canvas/pdf
  return new Blob([`PDF_PLACEHOLDER\n${html}`], { type: 'application/pdf' });
}

export async function prdToPdfReal(html: string): Promise<Blob> {
  try {
    const mod = await import('jspdf');
    const jsPDF = (mod as any).jsPDF || (mod as any).default || (mod as any);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    // Simple text extraction from HTML (strip tags) for now; could parse sections for richer layout
    const text = html.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n{2,}/g,'\n')
      .trim();
    const lines = doc.splitTextToSize(text, 520);
    doc.text(lines, 40, 50, { maxWidth: 520 });
    const blob = doc.output('blob');
    return blob;
  } catch (e) {
    // Fallback to placeholder on failure
    return prdToPdfPlaceholder(html);
  }
}

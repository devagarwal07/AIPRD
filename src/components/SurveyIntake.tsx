import { useEffect, useMemo, useState } from 'react';
import { addFeedback, type FeedbackItem } from '../utils/feedback';

export default function SurveyIntake() {
  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    stakeholder: '',
    role: '',
    feature: '',
    sentiment: 'neutral',
    priority: 'medium',
    comment: '',
    tag: qs.get('tag') || '',
  });

  useEffect(() => {
    // Prefill from query string if provided
    const m = (k: string, d = '') => qs.get(k) || d;
    setForm((f) => ({
      ...f,
      stakeholder: m('name', f.stakeholder),
      role: m('role', f.role),
      feature: m('feature', f.feature),
      sentiment: (m('sentiment', f.sentiment) as any),
      priority: (m('priority', f.priority) as any),
      tag: m('tag', f.tag),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (!form.feature || !form.comment || !form.stakeholder) return;
    const item: FeedbackItem = {
      id: String(Date.now()),
      stakeholder: form.stakeholder.trim(),
      role: form.role.trim() || 'Stakeholder',
      feature: form.feature.trim(),
      sentiment: form.sentiment as any,
      priority: form.priority as any,
      comment: form.comment.trim(),
      timestamp: new Date().toLocaleString(),
      tags: form.tag ? [form.tag] : undefined,
    };
    addFeedback(item);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="card card-section">
          <h2 className="text-xl font-bold text-gray-900">Thanks for your feedback</h2>
          <p className="text-gray-600 mt-2">Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="card card-section">
        <h2 className="text-xl font-bold text-gray-900">Stakeholder Feedback</h2>
        <p className="text-gray-600 mt-1">Share your input to help us prioritize and improve.</p>
      </div>
      <div className="card card-section space-y-4">
        <div>
          <label className="label">Your Name</label>
          <input className="input" value={form.stakeholder} onChange={(e) => setForm({ ...form, stakeholder: e.target.value })} />
        </div>
        <div>
          <label className="label">Role</label>
          <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g., Engineering, Design, Sales" />
        </div>
        <div>
          <label className="label">Feature/Topic</label>
          <input className="input" value={form.feature} onChange={(e) => setForm({ ...form, feature: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sentiment</label>
            <select className="input" value={form.sentiment} onChange={(e) => setForm({ ...form, sentiment: e.target.value })}>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Feedback</label>
          <textarea className="input" rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        </div>
        <div>
          <label className="label">Tag (optional)</label>
          <input className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g., Q3-survey" />
        </div>
        <button className="btn btn-primary w-full" onClick={submit} disabled={!form.feature || !form.comment || !form.stakeholder}>Submit</button>
        <p className="text-xs text-gray-600">This form is public and saves directly into the Feedback Hub on this device.</p>
      </div>
    </div>
  );
}

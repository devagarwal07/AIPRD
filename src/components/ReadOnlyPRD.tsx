import { useEffect, useMemo, useState } from 'react';
import { decodeSharePayload, type SharedPRD } from '../utils/share';

export default function ReadOnlyPRD() {
  const [payload, setPayload] = useState<SharedPRD | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qp = useMemo(() => new URLSearchParams(window.location.search), []);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    const view = qp.get('view');
    const raw = qp.get('data');
    const token = qp.get('token') || undefined;
    if (view !== 'prd' || !raw) {
      setError('No shared PRD found.');
      return;
    }
    const obj = decodeSharePayload(raw);
    if (!obj) {
      setError('Invalid or expired share link.');
      return;
    }
    // Preserve token from URL param as the required gate, if provided at creation
    if (token && obj.token && token !== obj.token) {
      // Allow user to enter token
      setPayload({ ...obj });
    } else {
      setPayload(obj);
    }
  }, [qp]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="card card-section">
          <h2 className="text-xl font-bold text-gray-900">Shared PRD</h2>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const urlToken = qp.get('token') || undefined;
  const needsToken = !!payload.token && urlToken !== payload.token;

  if (needsToken) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="card card-section">
          <h2 className="text-xl font-bold text-gray-900">Enter Access Token</h2>
          <p className="text-gray-600 mt-2">This shared PRD is protected. Enter the token to view.</p>
          <input className="input mt-3" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Access token" />
          <button
            className="btn btn-primary mt-3"
            onClick={() => {
              if (tokenInput === payload.token) {
                const url = new URL(window.location.href);
                url.searchParams.set('token', tokenInput);
                window.location.replace(url.toString());
              }
            }}
          >
            View PRD
          </button>
        </div>
      </div>
    );
  }

  const { prd, sections } = payload;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <article className="prose max-w-none">
        <h1>{prd.title || 'Product Requirements Document'}</h1>
        {sections.problem && (
          <section>
            <h2>Problem Statement</h2>
            <p className="whitespace-pre-wrap">{prd.problem || '—'}</p>
          </section>
        )}
        {sections.solution && (
          <section>
            <h2>Solution Overview</h2>
            <p className="whitespace-pre-wrap">{prd.solution || '—'}</p>
          </section>
        )}
        {sections.objectives && (
          <section>
            <h2>Objectives & Success Metrics</h2>
            {prd.objectives?.length ? (
              <ol>
                {prd.objectives.map((o, i) => (<li key={i}>{o}</li>))}
              </ol>
            ) : (
              <p>—</p>
            )}
          </section>
        )}
        {sections.userStories && (
          <section>
            <h2>User Stories</h2>
            {prd.userStories?.length ? (
              <ol>
                {prd.userStories.map((s, i) => (<li key={i}>{s}</li>))}
              </ol>
            ) : (
              <p>—</p>
            )}
          </section>
        )}
        {sections.requirements && (
          <section>
            <h2>Requirements</h2>
            {prd.requirements?.length ? (
              <ol>
                {prd.requirements.map((r, i) => (<li key={i}>{r}</li>))}
              </ol>
            ) : (
              <p>—</p>
            )}
          </section>
        )}
      </article>
      <p className="text-xs text-gray-500 mt-8">Shared via PM Copilot • {new Date(payload.ts).toLocaleString()}</p>
    </div>
  );
}

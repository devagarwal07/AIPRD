export type SharedPRD = {
  v: 1;
  prd: {
    title: string;
    problem: string;
    solution: string;
    objectives: string[];
    userStories: string[];
    requirements: string[];
  };
  sections: { problem: boolean; solution: boolean; objectives?: boolean; userStories: boolean; requirements: boolean };
  templateId?: string;
  ts: number;
  token?: string;
};

// URL-safe base64 helpers
export function encodeSharePayload(obj: SharedPRD): string {
  const json = JSON.stringify(obj);
  const utf8 = encodeURIComponent(json);
  // btoa expects binary string; decodeURIComponent gives UTF-8 bytes as chars
  return btoa(utf8).replace(/=+$/,'').replace(/\+/g, '-').replace(/\//g, '_');
}

export function decodeSharePayload(s: string): SharedPRD | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const utf8 = atob(padded);
    const json = decodeURIComponent(utf8);
    const obj = JSON.parse(json);
    if (obj && obj.v === 1 && obj.prd) return obj as SharedPRD;
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(obj: SharedPRD): string {
  const base = window.location.origin + window.location.pathname;
  const data = encodeSharePayload(obj);
  const params = new URLSearchParams();
  params.set('view', 'prd');
  params.set('data', data);
  if (obj.token) params.set('token', obj.token);
  return `${base}?${params.toString()}`;
}

export function randomToken(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const cryptoObj = (window as any).crypto || (window as any).msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const arr = new Uint8Array(len);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

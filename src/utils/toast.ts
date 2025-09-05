type ToastType = 'info' | 'success' | 'error';

function ensureContainer(): HTMLElement {
  let el = document.getElementById('pmcopilot_toast_container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pmcopilot_toast_container';
    el.style.position = 'fixed';
    el.style.top = '16px';
    el.style.right = '16px';
    el.style.zIndex = '9999';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '8px';
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(message: string, type: ToastType = 'info', duration = 2500) {
  const container = ensureContainer();
  const div = document.createElement('div');
  const base = 'rounded-md shadow px-3 py-2 text-sm border';
  const cls = type === 'success'
    ? 'bg-green-50 text-green-800 border-green-200'
    : type === 'error'
    ? 'bg-red-50 text-red-800 border-red-200'
    : 'bg-blue-50 text-blue-800 border-blue-200';
  div.className = `${base} ${cls}`;
  div.textContent = message;
  container.appendChild(div);
  const t = setTimeout(() => {
    div.style.opacity = '0';
    div.style.transition = 'opacity 200ms ease';
    setTimeout(() => container.removeChild(div), 220);
  }, duration);
  div.addEventListener('click', () => {
    clearTimeout(t);
    if (div.parentElement === container) container.removeChild(div);
  });
}

export const toast = {
  info: (m: string) => showToast(m, 'info'),
  success: (m: string) => showToast(m, 'success'),
  error: (m: string) => showToast(m, 'error'),
};

// Clipboard helper with fallback to execCommand for broader compatibility.
import { toast } from './toast';

export async function writeClipboard(text: string, successMessage?: string) {
  const attemptNative = async () => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  };
  try {
    const ok = await attemptNative();
    if (ok) {
      if (successMessage) toast.success(successMessage);
      return true;
    }
    // Fallback path
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!succeeded) throw new Error('execCommand failed');
    if (successMessage) toast.success(successMessage);
    return true;
  } catch (e) {
    toast.error('Copy failed');
    return false;
  }
}

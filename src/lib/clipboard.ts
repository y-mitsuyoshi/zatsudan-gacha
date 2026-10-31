function fallbackCopy(text: string) {
  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!succeeded) {
    throw new Error('Copy command failed');
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  if (!text) {
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy copy method.
    }
  }

  fallbackCopy(text);
}

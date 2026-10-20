/** 128 bits of randomness as 32 hex characters, e.g. for share links. */
export function generateToken(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
  else window.prompt('Copy this link:', text);
}

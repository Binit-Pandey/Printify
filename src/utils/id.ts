/**
 * Creates a unique id for a new record.
 *
 * `crypto.randomUUID` is only available in a secure context. The app is served
 * from `http://127.0.0.1:3001` in the packaged build, which Chromium does treat
 * as trustworthy — but relying on that leaves every create flow (vendor,
 * inventory, expense, bill) failing if the context is ever non-secure or the
 * API is unavailable. The fallback keeps those flows working.
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    // RFC 4122 version 4 layout.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

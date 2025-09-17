// src/lib/refCode.ts
/** Deterministic 6-digit ref code from a UUID (same UUID → same code). */
export function refFromId(id: string): string {
  // FNV-1a 32-bit
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const num = (h % 900000) + 100000; // 100000..999999
  return String(num);
}

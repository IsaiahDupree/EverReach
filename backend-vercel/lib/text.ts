export function normalizePromptKey(raw: string): string {
  if (!raw) return '';
  let s = raw.toLowerCase();
  s = s.normalize('NFKD');
  // remove diacritics
  s = s.replace(/\p{Diacritic}+/gu, '');
  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  // strip punctuation and most emoji/symbols, keep letters/numbers/spaces
  s = s.replace(/[^\p{L}\p{N} ]+/gu, '');
  // collapse again after stripping
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export type Channel = 'sms' | 'email' | 'dm';

export function formatForChannel(text: string, channel: Channel, opts?: { subject?: string }) {
  const t = (text || '').trim();

  if (channel === 'sms') {
    return t.replace(/\s+/g,' ').trim();
  }

  if (channel === 'email') {
    const subject = (opts?.subject ?? inferSubject(t)).trim();
    const body = t.endsWith('\n') ? t : t + '\n';
    return { subject, body };
  }

  const clean = t.replace(/\n{3,}/g, '\n\n').trim();
  return clean;
}

export function inferSubject(text: string) {
  const firstLine = (text || '').split('\n')[0] ?? '';
  const sentence = firstLine.split(/[.!?]/)[0];
  const words = sentence.trim().split(/\s+/).slice(0, 7).join(' ');
  return words ? cap(words) : 'Quick check-in';
}
const cap = (s:string)=> s.charAt(0).toUpperCase() + s.slice(1);

export function smsSegments(text: string) {
  const isGSM7 = /^[\u0000-\u007F€£¥§ÄÖÑÜäöñüà^\[\]{}\\~|@#$%&*'"+=<>:;.,!?/()\-_\s]*$/.test(text);
  const len = [...text].length;
  const single = isGSM7 ? 160 : 70;
  const multi = isGSM7 ? 153 : 67;
  if (len <= single) return { len, segments: len ? 1 : 0, encoding: isGSM7 ? 'GSM-7' : 'Unicode' };
  const segs = Math.ceil(len / multi);
  return { len, segments: segs, encoding: isGSM7 ? 'GSM-7' : 'Unicode' };
}
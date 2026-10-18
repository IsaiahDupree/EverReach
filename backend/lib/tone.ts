// backend/lib/tone.ts
export type Tone = 'Casual' | 'Professional' | 'Warm' | 'Direct';

const contractions: Record<string, string> = {
  "do not":"don't","does not":"doesn't","did not":"didn't","cannot":"can't","can not":"can't",
  "i am":"i'm","we are":"we're","you are":"you're","they are":"they're","it is":"it's",
  "that is":"that's","there is":"there's","we will":"we'll","you will":"you'll","i will":"i'll",
  "we have":"we've","you have":"you've","i have":"i've"
};
const expand: Record<string, string> = Object.fromEntries(Object.entries(contractions).map(([k,v])=>[v,k]));

function smartTrim(s:string){ return s.replace(/\s{2,}/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim(); }
function sentenceCase(s:string){ return s.replace(/(^\s*\w)|([.!?]\s+)\w/g, m => m.toUpperCase()); }


function applyContractions(s:string){
  let t=' '+s.toLowerCase()+' ';
  for(const [k,v] of Object.entries(contractions)){ t = t.replace(new RegExp(`\\b${k}\\b`,'g'), v); }
  return preserveCasing(s, t.trim());
}
function expandContractions(s:string){
  let t=' '+s.toLowerCase()+' ';
  for(const [k,v] of Object.entries(expand)){ t = t.replace(new RegExp(`\\b${k}\\b`,'g'), v); }
  return preserveCasing(s, t.trim());
}
function preserveCasing(orig:string, lowerOut:string){
  // naive casing restore: capitalize starts of sentences
  return sentenceCase(lowerOut);
}

// micro-style helpers
function addWarmth(s:string){
  let t = s;

  // If message already expresses gratitude, keep it as-is.
  if (/\b(thanks|thank you|appreciate|grateful|much appreciated)\b/i.test(t)) {
    return smartTrim(t);
  }

  // If message ends with a question OR common CTA, don't append appreciation.
  if (endsWithQuestionOrCTA(t)) {
    return smartTrim(t);
  }

  // Otherwise, lightly warm it up without fluff.
  t = t.replace(/\bthanks\b/gi, 'thank you'); // if present in middle
  // add a compact appreciation signoff
  t = t.replace(/\s*[.!?]*\s*$/, '') + ' \u2014 appreciate you.';
  return smartTrim(t);
}

function endsWithQuestionOrCTA(text:string){
  const trimmed = text.trim();

  // direct question mark at end
  if (/\?\s*$/.test(trimmed)) return true;

  // common micro-CTAs at the end (case-insensitive, punctuation optional)
  const ctaRe = new RegExp(
    [
      'let me know',
      'can you.*',
      'could you.*',
      'are you (free|available).*',
      'does that work',
      'sound good',
      'confirm',
      'thoughts',
      'next step',
      'book a time',
      'schedule',
      'reply',
      'respond',
      'follow up'
    ].map(p=>`(${p})`).join('|'),
    'i'
  );

  // check the last ~10 words for a CTA phrase
  const lastWords = trimmed.split(/\s+/).slice(-12).join(' ');
  return ctaRe.test(lastWords.replace(/[.!]$/, ''));
}

function makeDirect(s:string){
  // remove hedges & filler, keep call-to-action
  let t = s
    .replace(/\b(just|quick|really|maybe|might|a bit|a little)\b/gi,'')
    .replace(/\b(i think|i believe|i feel|perhaps|hopefully)\b/gi,'')
    .replace(/\b(would you be able to|would it be possible to)\b/gi,'can you')
    .replace(/\s{2,}/g,' ');
  // tighten endings
  t = t.replace(/(Let me know|Does that work|What do you think)[.?!]?$/i, 'Can you confirm?');
  // ensure final CTA or ask
  if(!/[?]$/.test(t) && !/\b(can|could|are|do|did|will|when|which|how|what)\b.*\?$/i.test(t)){
    t = t.replace(/[.]\s*$/,'') + ' \u2014 can you confirm?';
  }
  return t;
}
function professionalPolish(s:string){
  let t = expandContractions(s);
  t = t.replace(/\bhey\b/gi,'Hello').replace(/\bokay\b/gi,'Understood');
  t = t.replace(/\bguys\b/gi,'team').replace(/\bawesome\b/gi,'great');
  // courteous close if missing
  if(!/(thank you|thanks|kind regards|regards)/i.test(t)){
    t = t.replace(/[.!?]\s*$/,'') + '. Thank you.';
  }
  return t;
}
function casualize(s:string){
  let t = applyContractions(s);
  t = t.replace(/\bhello\b/gi,'hey');
  t = t.replace(/\bthank you\b/gi,'thanks');
  // shorten phrases
  t = t.replace(/\bI would love to\b/gi,"I'd love to")
       .replace(/\bI would like to\b/gi,"I'd like to");
  return t;
}

export function rewriteTone(input: string, tone: Tone){
  let s = smartTrim(input);
  // keep message single-paragraph, light breaks preserved by caller if needed
  switch(tone){
    case 'Casual':       s = casualize(s); break;
    case 'Professional': s = professionalPolish(s); break;
    case 'Warm':         s = addWarmth(expandContractions(sentenceCase(s))); break;
    case 'Direct':       s = makeDirect(applyContractions(s)); break;
  }
  return smartTrim(s);
}

// optional: label helpers for UI chips
export const TONE_LABELS: Record<Tone,string> = {
  Casual:'Casual', Professional:'Professional', Warm:'Warm', Direct:'Direct'
};
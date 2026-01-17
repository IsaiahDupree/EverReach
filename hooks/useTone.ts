'use client';
import { useEffect, useMemo, useState } from 'react';
import { rewriteTone, type Tone } from '@/lib/tone';
import { debounce } from '@/lib/debounce';

export function useTone(rawText: string, initial: Tone = 'casual') {
  const [base, setBase] = useState(rawText);
  const [tone, setTone] = useState<Tone>(initial);
  const [text, setText] = useState(rewriteTone(rawText, initial));

  const run = useMemo(()=>debounce((b:string, t:Tone)=>setText(rewriteTone(b, t)), 80),[]);
  useEffect(()=>{ run(base, tone); }, [base, tone, run]);

  return { base, setBase, tone, setTone, text };
}
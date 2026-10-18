'use client';
import { useEffect, useMemo, useState } from 'react';
import { debounce } from '@/lib/debounce';
import { formatForChannel, smsSegments } from '@/lib/channelPreview';
import type { Channel } from '@/lib/channelPreview';

export function useChannelPreview(initialText: string, initialChannel: Channel) {
  const [text, setText] = useState(initialText);
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [preview, setPreview] = useState<any>(initialText);
  const [meta, setMeta] = useState<any>({});

  const run = useMemo(()=>debounce((t:string, ch:Channel, subj?:string)=>{
    if (ch === 'email') {
      const f = formatForChannel(t, 'email', { subject: subj });
      setPreview(f.body);
      setEmailSubject(f.subject);
      setMeta({ subject: f.subject });
    } else if (ch === 'sms') {
      const f = formatForChannel(t, 'sms');
      const s = smsSegments(f);
      setPreview(f);
      setMeta({ len: s.len, segments: s.segments, encoding: s.encoding });
    } else {
      const f = formatForChannel(t, 'dm');
      setPreview(f);
      setMeta({});
    }
  }, 120), []);

  useEffect(()=>{ run(text, channel, emailSubject); }, [text, channel, emailSubject, run]);

  return { text, setText, channel, setChannel, preview, meta, emailSubject, setEmailSubject };
}
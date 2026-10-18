# Voice Notes & Transcripts Display Guide

**Frontend implementation guide for displaying voice notes with transcripts, audio playback, and AI insights**

---

## 📋 Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Models](#data-models)
3. [List View Component](#list-view-component)
4. [Detail View Component](#detail-view-component)
5. [Audio Player Component](#audio-player-component)
6. [Transcript Display](#transcript-display)
7. [AI Insights Card](#ai-insights-card)
8. [Complete Examples](#complete-examples)

---

## API Endpoints

### Get Voice Notes List

```http
GET /api/v1/me/persona-notes?type=voice
Authorization: Bearer {token}
```

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid",
      "content": "Transcript text...",
      "audio_url": "https://...",
      "duration_seconds": 45,
      "created_at": "2025-10-01T10:00:00Z",
      "metadata": {
        "extracted_contacts": ["John", "Sarah"],
        "detected_actions": ["Call John tomorrow"],
        "sentiment": { "overall": "positive", "score": 0.8 },
        "tags": ["meeting", "sales"]
      }
    }
  ]
}
```

### Get Single Voice Note

```http
GET /api/v1/me/persona-notes/{id}
Authorization: Bearer {token}
```

---

## Data Models

```typescript
interface VoiceNote {
  id: string;
  content: string;                    // Transcript
  audio_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  metadata?: {
    extracted_contacts?: string[];
    detected_actions?: string[];
    sentiment?: {
      overall: 'positive' | 'neutral' | 'negative';
      score: number;
    };
    suggested_tags?: string[];
  };
  attachments?: Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }>;
}
```

---

## List View Component

### React/Next.js Example

```typescript
// components/VoiceNotesList.tsx
import { useEffect, useState } from 'react';
import { VoiceNoteCard } from './VoiceNoteCard';

export function VoiceNotesList() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotes() {
      const response = await fetch('/api/v1/me/persona-notes?type=voice', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setNotes(data.notes);
      setLoading(false);
    }
    fetchNotes();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="grid gap-4">
      {notes.map(note => (
        <VoiceNoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
```

### React Native Example

```typescript
// screens/VoiceNotesScreen.tsx
import { FlatList } from 'react-native';
import { VoiceNoteCard } from '@/components/VoiceNoteCard';

export function VoiceNotesScreen() {
  const { data: notes, isLoading } = useQuery(['voice-notes'], fetchNotes);

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <VoiceNoteCard note={item} />}
      refreshing={isLoading}
    />
  );
}
```

---

## Detail View Component

```typescript
// components/VoiceNoteDetail.tsx
import { AudioPlayer } from './AudioPlayer';
import { TranscriptDisplay } from './TranscriptDisplay';
import { AIInsightsCard } from './AIInsightsCard';

interface Props {
  noteId: string;
}

export function VoiceNoteDetail({ noteId }: Props) {
  const [note, setNote] = useState<VoiceNote | null>(null);

  useEffect(() => {
    async function fetchNote() {
      const res = await fetch(`/api/v1/me/persona-notes/${noteId}`);
      setNote(await res.json());
    }
    fetchNote();
  }, [noteId]);

  if (!note) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {note.audio_url && (
        <AudioPlayer
          url={note.audio_url}
          duration={note.duration_seconds || 0}
        />
      )}

      {/* Transcript */}
      <TranscriptDisplay text={note.content} />

      {/* AI Insights */}
      {note.metadata && (
        <AIInsightsCard metadata={note.metadata} />
      )}

      {/* Metadata */}
      <div className="text-sm text-gray-500">
        Created {new Date(note.created_at).toLocaleString()}
      </div>
    </div>
  );
}
```

---

## Audio Player Component

### Web (HTML5 Audio)

```typescript
// components/AudioPlayer.tsx
import { useState, useRef } from 'react';

interface Props {
  url: string;
  duration: number;
}

export function AudioPlayer({ url, duration }: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      
      <div className="flex items-center gap-4">
        <button onClick={togglePlay} className="p-2">
          {playing ? '⏸️' : '▶️'}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => {
              const time = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = time;
              setCurrentTime(time);
            }}
            className="w-full"
          />
        </div>
        
        <span className="text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
```

### React Native (expo-av)

```typescript
// components/AudioPlayer.native.tsx
import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function AudioPlayer({ url, duration }: Props) {
  const [sound, setSound] = useState<Audio.Sound>();
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    async function loadAudio() {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis / 1000);
          setPlaying(status.isPlaying);
        }
      });
    }
    loadAudio();
    return () => { sound?.unloadAsync(); };
  }, [url]);

  const togglePlay = async () => {
    if (playing) await sound?.pauseAsync();
    else await sound?.playAsync();
  };

  return (
    <View className="bg-gray-100 p-4 rounded-lg">
      <TouchableOpacity onPress={togglePlay}>
        <Text className="text-2xl">{playing ? '⏸️' : '▶️'}</Text>
      </TouchableOpacity>
      <Text>{Math.floor(position)}s / {duration}s</Text>
    </View>
  );
}
```

---

## Transcript Display

```typescript
// components/TranscriptDisplay.tsx
interface Props {
  text: string;
  searchTerm?: string;
}

export function TranscriptDisplay({ text, searchTerm }: Props) {
  const highlightedText = searchTerm
    ? text.replace(
        new RegExp(searchTerm, 'gi'),
        (match) => `<mark>${match}</mark>`
      )
    : text;

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold mb-2">Transcript</h3>
      <div
        className="text-gray-700 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    </div>
  );
}
```

---

## AI Insights Card

```typescript
// components/AIInsightsCard.tsx
interface Props {
  metadata: VoiceNote['metadata'];
}

export function AIInsightsCard({ metadata }: Props) {
  if (!metadata) return null;

  const sentimentColor = {
    positive: 'text-green-600',
    neutral: 'text-gray-600',
    negative: 'text-red-600',
  }[metadata.sentiment?.overall || 'neutral'];

  return (
    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
      <h3 className="font-semibold">🤖 AI Insights</h3>

      {/* Contacts */}
      {metadata.extracted_contacts && metadata.extracted_contacts.length > 0 && (
        <div>
          <p className="text-sm font-medium">People Mentioned:</p>
          <div className="flex gap-2 mt-1">
            {metadata.extracted_contacts.map((name, i) => (
              <span key={i} className="px-2 py-1 bg-blue-100 rounded text-sm">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {metadata.detected_actions && metadata.detected_actions.length > 0 && (
        <div>
          <p className="text-sm font-medium">Action Items:</p>
          <ul className="list-disc list-inside mt-1 text-sm">
            {metadata.detected_actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sentiment */}
      {metadata.sentiment && (
        <div>
          <p className="text-sm font-medium">Sentiment:</p>
          <span className={`${sentimentColor} font-semibold`}>
            {metadata.sentiment.overall.toUpperCase()}
          </span>
          <span className="text-gray-500 ml-2 text-sm">
            ({Math.round(metadata.sentiment.score * 100)}%)
          </span>
        </div>
      )}

      {/* Tags */}
      {metadata.suggested_tags && metadata.suggested_tags.length > 0 && (
        <div>
          <p className="text-sm font-medium">Tags:</p>
          <div className="flex gap-2 mt-1">
            {metadata.suggested_tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Complete Examples

### Full Voice Note Card

```typescript
// components/VoiceNoteCard.tsx
import { formatDistanceToNow } from 'date-fns';

export function VoiceNoteCard({ note }: { note: VoiceNote }) {
  const truncate = (text: string, length: number) =>
    text.length > length ? text.slice(0, length) + '...' : text;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎤</span>
          <div>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </p>
            {note.duration_seconds && (
              <p className="text-xs text-gray-400">
                {Math.floor(note.duration_seconds / 60)}:{String(note.duration_seconds % 60).padStart(2, '0')}
              </p>
            )}
          </div>
        </div>

        {note.metadata?.sentiment && (
          <span className="text-lg">
            {{
              positive: '😊',
              neutral: '😐',
              negative: '😟',
            }[note.metadata.sentiment.overall]}
          </span>
        )}
      </div>

      {/* Transcript Preview */}
      <p className="text-gray-700 mb-3">
        {truncate(note.content, 150)}
      </p>

      {/* Quick Insights */}
      <div className="flex gap-2 flex-wrap">
        {note.metadata?.extracted_contacts?.slice(0, 2).map((name, i) => (
          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
            👤 {name}
          </span>
        ))}
        {note.metadata?.detected_actions?.length > 0 && (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
            ✅ {note.metadata.detected_actions.length} tasks
          </span>
        )}
      </div>
    </div>
  );
}
```

### Complete Page Layout

```typescript
// pages/voice-notes/[id].tsx (Next.js)
import { useRouter } from 'next/router';
import { VoiceNoteDetail } from '@/components/VoiceNoteDetail';

export default function VoiceNotePage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <VoiceNoteDetail noteId={id as string} />
    </div>
  );
}
```

---

## Styling Tips

### TailwindCSS Classes

```css
/* Voice note card */
.voice-note-card {
  @apply bg-white p-4 rounded-lg border shadow-sm 
         hover:shadow-md transition-shadow;
}

/* Audio player */
.audio-player {
  @apply bg-gradient-to-r from-blue-50 to-indigo-50 
         p-4 rounded-lg shadow-inner;
}

/* Transcript text */
.transcript {
  @apply text-gray-700 leading-relaxed whitespace-pre-wrap
         font-mono text-sm;
}

/* AI insights */
.ai-insights {
  @apply bg-gradient-to-r from-purple-50 to-pink-50
         p-4 rounded-lg border border-purple-200;
}
```

---

## Accessibility

```typescript
// Add ARIA labels for screen readers
<button
  onClick={togglePlay}
  aria-label={playing ? 'Pause audio' : 'Play audio'}
  aria-pressed={playing}
>
  {playing ? '⏸️' : '▶️'}
</button>

<div role="article" aria-label="Voice note transcript">
  {note.content}
</div>
```

---

## Related Documentation

- [Voice Notes API](./VOICE_NOTES_FRONTEND_INTEGRATION.md)
- [Screenshot Analysis Display](./SCREENSHOT_ANALYSIS_DEPLOYMENT.md)
- [Frontend API Guide](./FRONTEND_API_GUIDE.md)

---

**Last Updated**: November 7, 2025  
**Status**: ✅ Production Ready

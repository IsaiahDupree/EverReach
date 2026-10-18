import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

type RecState = 'idle' | 'recording' | 'stopped' | 'permission-denied';

type WebRecorderRefs = {
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: BlobPart[];
  durationTimer: ReturnType<typeof setInterval> | null;
};

export function useAudioRecorder() {
  const [state, setState] = useState<RecState>('idle');
  const [level, setLevel] = useState<number | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const recRef = useRef<Audio.Recording | null>(null);
  const meterTimer = useRef<number | null>(null);
  const durationTimer = useRef<number | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const webRef = useRef<WebRecorderRefs>({ stream: null, recorder: null, chunks: [], durationTimer: null });

  useEffect(() => {
    return () => {
      if (meterTimer.current) clearInterval(meterTimer.current);
      if (durationTimer.current) clearInterval(durationTimer.current);
      recRef.current?.stopAndUnloadAsync().catch(() => {});
      if (Platform.OS === 'web') {
        try {
          webRef.current.recorder?.stop();
        } catch {}
        try {
          webRef.current.stream?.getTracks().forEach(t => t.stop());
        } catch {}
        webRef.current.recorder = null;
        webRef.current.stream = null;
        webRef.current.chunks = [];
        if (webRef.current.durationTimer) clearInterval(webRef.current.durationTimer);
        webRef.current.durationTimer = null;
      }
    };
  }, []);

  const askPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        if (!(navigator as any).mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        const stream: MediaStream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error: any) {
        console.error('Web microphone permission error:', error);
        setState('permission-denied');
        return false;
      }
    }

    if (permissionResponse?.status !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission.status !== 'granted') {
        setState('permission-denied');
        return false;
      }
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    return true;
  }, [permissionResponse, requestPermission]);

  const start = useCallback(async () => {
    try {
      if (!(await askPermission())) {
        throw new Error('Permission denied');
      }

      if (Platform.OS === 'web') {
        const mediaDevices: any = (navigator as any).mediaDevices;
        const MediaRec: any = (window as any).MediaRecorder;
        if (!mediaDevices?.getUserMedia || !MediaRec) {
          throw new Error('Recording not supported in this browser');
        }
        const stream: MediaStream = await mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        webRef.current.stream = stream;

        let mime = 'audio/webm';
        if (!MediaRec.isTypeSupported?.(mime)) {
          if (MediaRec.isTypeSupported?.('audio/mp4')) mime = 'audio/mp4';
          else if (MediaRec.isTypeSupported?.('audio/ogg')) mime = 'audio/ogg';
          else mime = '';
        }
        const mr: MediaRecorder = mime ? new MediaRec(stream, { mimeType: mime }) : new MediaRec(stream);
        webRef.current.recorder = mr;
        webRef.current.chunks = [];
        mr.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) webRef.current.chunks.push(e.data);
        };
        mr.start(500);
        setState('recording');
        setDuration(0);
        webRef.current.durationTimer = setInterval(() => setDuration(prev => prev + 1), 1000);
        return;
      }

      if (recRef.current) {
        await recRef.current.stopAndUnloadAsync().catch(() => {});
      }

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await rec.startAsync();
      recRef.current = rec;
      setState('recording');
      setDuration(0);

      durationTimer.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      meterTimer.current = setInterval(async () => {
        if (!recRef.current) return;
        try {
          const status = await recRef.current.getStatusAsync();
          if ('metering' in status && typeof (status as any).metering === 'number') {
            setLevel((status as any).metering as number);
          }
        } catch {}
      }, 200);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setState('permission-denied');
      throw error;
    }
  }, [askPermission]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (state !== 'recording') return uri;

    if (Platform.OS === 'web') {
      const mr = webRef.current.recorder as any;
      const stream = webRef.current.stream as MediaStream | null;
      if (webRef.current.durationTimer) {
        clearInterval(webRef.current.durationTimer);
        webRef.current.durationTimer = null;
      }
      try {
        if (mr && mr.state !== 'inactive') mr.stop();
      } catch {}
      try {
        stream?.getTracks().forEach(t => t.stop());
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
      const mimeFallback = 'audio/webm';
      const blob = new Blob(webRef.current.chunks, { type: (mr?.mimeType || mimeFallback) as string });
      const url = URL.createObjectURL(blob);
      setUri(url);
      setState('stopped');
      webRef.current.recorder = null;
      webRef.current.stream = null;
      webRef.current.chunks = [];
      return url;
    }

    if (meterTimer.current) {
      clearInterval(meterTimer.current);
      meterTimer.current = null;
    }
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }

    if (!recRef.current) return null;
    await recRef.current.stopAndUnloadAsync();
    const _uri = recRef.current.getURI();

    let finalUri: string | null = null;
    if (_uri) {
      const dest = `${FileSystem.documentDirectory}recordings/${Date.now()}.${Platform.OS === 'ios' ? 'wav' : 'm4a'}`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}recordings/`, { intermediates: true }).catch(() => {});
      await FileSystem.copyAsync({ from: _uri, to: dest });
      setUri(dest);
      finalUri = dest;
    }

    setState('stopped');
    recRef.current = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    return finalUri;
  }, [state, uri]);

  const reset = useCallback(() => {
    setUri(null);
    setDuration(0);
    setLevel(null);
    setState('idle');
  }, []);

  return {
    state,
    level,
    uri,
    duration,
    start,
    stop,
    reset,
    isRecording: state === 'recording',
    hasRecording: !!uri,
    permissionGranted: (permissionResponse?.granted ?? false) || Platform.OS === 'web',
  };
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Square, Play, Pause } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  runOnJS
} from 'react-native-reanimated';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onTranscriptReady?: (transcript: string) => void;
  personId?: string;
  contextScope?: 'about_person' | 'about_me';
  maxDuration?: number; // in seconds
  showTranscript?: boolean;
  enableTranscription?: boolean;
}

interface AudioLevel {
  level: number;
  timestamp: number;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onTranscriptReady,
  personId,
  contextScope = 'about_person',
  maxDuration = 300, // 5 minutes
  showTranscript = false,
  enableTranscription = false
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [, setAudioLevels] = useState<AudioLevel[]>([]);
  // Removed Audio.usePermissions() - we request permissions manually on button press
  const [webMicStatus, setWebMicStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const webMediaStreamRef = useRef<MediaStream | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAnalyserRef = useRef<AnalyserNode | null>(null);
  const webChunksRef = useRef<BlobPart[]>([]);
  const webDataArrayRef = useRef<Uint8Array | null>(null);

  // Animation values
  const micScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const waveformBars = useSharedValue(Array(20).fill(0));

  // Refs
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (levelInterval.current) {
        clearInterval(levelInterval.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (Platform.OS === 'web') {
        try {
          webMediaStreamRef.current?.getTracks().forEach(t => t.stop());
        } catch {}
        webMediaStreamRef.current = null;
      }
    };
  }, [sound]);

  const requestWebMic = useCallback(async () => {
    if (Platform.OS !== 'web') return true;
    try {
      if (!(navigator as any).mediaDevices?.getUserMedia) {
        Alert.alert('Unsupported', 'Your browser does not support audio recording.');
        setWebMicStatus('denied');
        return false;
      }
      const tmpStream: MediaStream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      tmpStream.getTracks().forEach(t => t.stop());
      setWebMicStatus('granted');
      return true;
    } catch (e: any) {
      setWebMicStatus('denied');
      const reason = e?.name === 'NotAllowedError' ? 'Microphone permission was denied. Please enable it in your browser settings and reload.' : 'Could not access microphone.';
      Alert.alert('Microphone Access', reason);
      return false;
    }
  }, []);

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        if (webMicStatus === 'denied') {
          Alert.alert('Microphone Access Required', 'Please enable microphone permissions in your browser settings and reload the page.');
          return;
        }
        if (webMicStatus === 'unknown') {
          const ok = await requestWebMic();
          if (!ok) return;
        }

        console.log('Requesting mic permission (web)');

        if (!(navigator as any).mediaDevices || !(navigator as any).mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported in this browser');
        }

        let stream: MediaStream;
        try {
          stream = await (navigator as any).mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
        } catch (permError: any) {
          console.error('Permission error:', permError);
          let message = 'Microphone access denied.';
          if (permError.name === 'NotAllowedError') {
            message = 'Microphone permission denied. Please allow microphone access and try again.';
            setWebMicStatus('denied');
          } else if (permError.name === 'NotFoundError') {
            message = 'No microphone found. Please connect a microphone and try again.';
          } else if (permError.name === 'NotReadableError') {
            message = 'Microphone is being used by another application.';
          }
          Alert.alert('Microphone Access Required', message);
          return;
        }

        webMediaStreamRef.current = stream;

        // Set up audio analysis for waveform
        let audioCtx: AudioContext | null = null;
        try {
          const Ctor: any = (window as any).AudioContext || (window as any).webkitAudioContext;
          const ctx = new Ctor() as AudioContext;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          webAudioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          webAnalyserRef.current = analyser;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.fftSize);
          webDataArrayRef.current = dataArray;
        } catch (audioError) {
          console.warn('Audio analysis setup failed:', audioError);
        }

        // Set up MediaRecorder
        let mimeType = 'audio/webm';
        if (!(window as any).MediaRecorder?.isTypeSupported?.('audio/webm')) {
          if ((window as any).MediaRecorder?.isTypeSupported?.('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if ((window as any).MediaRecorder?.isTypeSupported?.('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else {
            mimeType = '';
          }
        }

        const mr = new (window as any).MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        webRecorderRef.current = mr;
        webChunksRef.current = [];

        mr.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            webChunksRef.current.push(e.data);
          }
        };

        mr.onerror = (e: any) => {
          console.error('MediaRecorder error:', e);
          Alert.alert('Recording Error', 'Failed to record audio');
        };

        mr.start(1000);

        setIsRecording(true);
        setDuration(0);

        micScale.value = withRepeat(withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })), -1, false);
        pulseOpacity.value = withRepeat(withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.2, { duration: 1000 })), -1, false);

        durationInterval.current = setInterval(() => {
          setDuration((prev) => {
            const d = prev + 1;
            if (d >= maxDuration) runOnJS(stopRecording)();
            return d;
          });
        }, 1000);

        // Set up audio level monitoring (only if audio context is available)
        if (webAnalyserRef.current && webDataArrayRef.current) {
          levelInterval.current = setInterval(() => {
            const analyserNode = webAnalyserRef.current;
            const arr = webDataArrayRef.current;
            if (!analyserNode || !arr) return;

            try {
              analyserNode.getByteTimeDomainData(arr);
              let sum = 0;
              for (let i = 0; i < arr.length; i++) {
                const v = (arr[i] - 128) / 128; // -1..1
                sum += v * v;
              }
              const rms = Math.sqrt(sum / arr.length); // 0..~1
              const level = Math.min(1, Math.max(0, rms * 2));
              const timestamp = Date.now();
              setAudioLevels((prev) => {
                const next = [...prev, { level, timestamp }].slice(-20);
                const bars = next.map((l) => l.level);
                while (bars.length < 20) bars.unshift(0);
                waveformBars.value = bars;
                return next;
              });
            } catch (levelError) {
              console.warn('Audio level monitoring error:', levelError);
            }
          }, 100);
        }
        console.log('Web recording started');
        setWebMicStatus('granted');
        return;
      }

      // Native (iOS/Android) recording
      console.log('Requesting permission (native)..');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      console.log('Starting recording (native)..');
      
      // Create and prepare recording
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
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

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      micScale.value = withRepeat(withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })), -1, false);
      pulseOpacity.value = withRepeat(withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.2, { duration: 1000 })), -1, false);

      durationInterval.current = setInterval(() => {
        setDuration((prev) => {
          const d = prev + 1;
          if (d >= maxDuration) runOnJS(stopRecording)();
          return d;
        });
      }, 1000);

      console.log('Recording started (native)');
    } catch (err: any) {
      console.error('Failed to start recording', err);
      
      let message = 'Failed to start recording';
      if (err?.name === 'NotAllowedError') {
        message = 'Microphone permission denied. Please allow access in your browser settings and reload.';
        setWebMicStatus('denied');
      } else if (err?.message) {
        message = err.message;
      }
      
      Alert.alert('Recording Error', message);
      
      // Clean up any partial setup
      if (webMediaStreamRef.current) {
        webMediaStreamRef.current.getTracks().forEach(track => track.stop());
        webMediaStreamRef.current = null;
      }
      if (webAudioCtxRef.current && webAudioCtxRef.current.state !== 'closed') {
        webAudioCtxRef.current.close();
        webAudioCtxRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    try {
      setIsRecording(false);
      micScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
      waveformBars.value = Array(20).fill(0);

      if (durationInterval.current) { clearInterval(durationInterval.current); durationInterval.current = null; }
      if (levelInterval.current) { clearInterval(levelInterval.current); levelInterval.current = null; }

      if (Platform.OS === 'web') {
        const mr = webRecorderRef.current as any;
        const stream = webMediaStreamRef.current;
        const ctx = webAudioCtxRef.current;
        if (mr && mr.state !== 'inactive') mr.stop();
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (ctx && ctx.state !== 'closed') ctx.close();

        await new Promise<void>((resolve) => setTimeout(resolve, 50));

        let mimeType = 'audio/webm';
        if (!(window as any).MediaRecorder?.isTypeSupported?.('audio/webm')) {
          if ((window as any).MediaRecorder?.isTypeSupported?.('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if ((window as any).MediaRecorder?.isTypeSupported?.('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else {
            mimeType = 'audio/wav';
          }
        }
        const blob = new Blob(webChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordingUri(url);
        onRecordingComplete(url, duration);
        
        // Start transcription if enabled
        if (enableTranscription) {
          handleTranscription(url);
        }
        
        webRecorderRef.current = null;
        webMediaStreamRef.current = null;
        webAudioCtxRef.current = null;
        webAnalyserRef.current = null;
        webChunksRef.current = [];
        webDataArrayRef.current = null;
        return;
      }

      if (!recording) return;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);
      if (uri) {
        setRecordingUri(uri);
        onRecordingComplete(uri, duration);
        
        // Start transcription if enabled
        if (enableTranscription) {
          handleTranscription(uri);
        }
      }
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      console.log('Loading Sound');
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(newSound);

      console.log('Playing Sound');
      setIsPlaying(true);
      await newSound.playAsync();
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if ((status as any).isLoaded && (status as any).didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play recording', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const pauseRecording = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleTranscription = async (audioUri: string) => {
    if (!enableTranscription) return;
    
    setIsTranscribing(true);
    try {
      console.log('Starting transcription for:', audioUri);
      
      // Create FormData for the transcription API
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For web, convert blob URL to blob and append
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('audio', blob, 'recording.webm');
      } else {
        // For mobile, create file object from URI
        const uriParts = audioUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const audioFile = {
          uri: audioUri,
          name: "recording." + fileType,
          type: "audio/" + fileType
        } as any;
        formData.append('audio', audioFile);
      }
      
      // Call the speech-to-text API
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
      const response = await fetch(`${baseUrl}/api/v1/transcribe`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      const transcriptText = result.text || '';
      
      console.log('Transcription result:', transcriptText);
      setTranscript(transcriptText);
      
      if (onTranscriptReady) {
        onTranscriptReady(transcriptText);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscript('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animated styles
  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: micScale.value * 1.5 }],
  }));

  const waveformAnimatedStyle = useAnimatedStyle(() => {
    return {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      height: 60,
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Note</Text>
      
      {/* Context Scope Selector */}
      <View style={styles.scopeSelector}>
        <TouchableOpacity 
          style={[styles.scopeButton, contextScope === 'about_person' && styles.scopeButtonActive]}
          onPress={() => {}}
        >
          <Text style={[styles.scopeText, contextScope === 'about_person' && styles.scopeTextActive]}>
            About Contact
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.scopeButton, contextScope === 'about_me' && styles.scopeButtonActive]}
          onPress={() => {}}
        >
          <Text style={[styles.scopeText, contextScope === 'about_me' && styles.scopeTextActive]}>
            Personal Context
          </Text>
        </TouchableOpacity>
      </View>

      {/* Waveform Visualization */}
      {isRecording && Platform.OS === 'web' && (
        <Animated.View style={waveformAnimatedStyle}>
          {Array.from({ length: 20 }, (_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: interpolate(
                    (waveformBars.value[i] as number) || 0,
                    [0, 1],
                    [4, 40]
                  ),
                }
              ]}
            />
          ))}
        </Animated.View>
      )}

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        {/* Pulse Effect */}
        {isRecording && (
          <Animated.View style={[styles.pulseCircle, pulseAnimatedStyle]} />
        )}
        
        {/* Main Record Button */}
        <Animated.View style={micAnimatedStyle}>
          <TouchableOpacity
            testID="record-button"
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={Platform.OS === 'web' && webMicStatus === 'denied'}
          >
            {isRecording ? (
              <Square size={32} color="white" fill="white" />
            ) : (
              <Mic size={32} color="white" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Duration Display */}
      {(isRecording || recordingUri) && (
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      )}

      {/* Playback Controls */}
      {recordingUri && !isRecording && (
        <View style={styles.playbackControls}>
          <TouchableOpacity
            testID="playback-toggle"
            style={styles.playButton}
            onPress={isPlaying ? pauseRecording : playRecording}
          >
            {isPlaying ? (
              <Pause size={24} color="#007AFF" />
            ) : (
              <Play size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
          <Text style={styles.playbackText}>
            {isPlaying ? 'Playing...' : 'Tap to play'}
          </Text>
        </View>
      )}

      {/* Status Messages */}
      {Platform.OS === 'web' && webMicStatus !== 'granted' && (
        <View style={styles.webPermWrapper}>
          <TouchableOpacity style={styles.webPermButton} onPress={requestWebMic}>
            <Text style={styles.webPermText}>
              {webMicStatus === 'denied' ? 'Enable microphone in browser settings, then tap to retry' : 'Allow Microphone Access'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {isRecording && (
        <Text style={styles.recordingText}>
          Recording... Tap to stop
        </Text>
      )}
      
      {/* Transcription Display */}
      {showTranscript && enableTranscription && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptTitle}>Transcript:</Text>
          {isTranscribing ? (
            <View style={styles.transcribingContainer}>
              <Text style={styles.transcribingText}>Transcribing audio...</Text>
            </View>
          ) : transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : recordingUri && (
            <Text style={styles.transcriptPlaceholder}>
              Transcript will appear here after recording
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    color: '#1F2937',
  },
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  scopeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scopeButtonActive: {
    backgroundColor: '#007AFF',
  },
  scopeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  scopeTextActive: {
    color: 'white',
  },
  controlsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#007AFF',
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  duration: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 10,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playbackText: {
    fontSize: 16,
    color: '#374151',
  },
  permissionText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
  },
  webPermWrapper: {
    marginTop: 12,
  },
  webPermButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E5F2FF',
    borderRadius: 8,
  },
  webPermText: {
    color: '#0369A1',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  recordingText: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  transcriptContainer: {
    marginTop: 20,
    width: '100%',
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  transcriptBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
  },
  transcriptText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  transcriptPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  transcribingContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  transcribingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
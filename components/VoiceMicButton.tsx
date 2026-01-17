import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Text,
} from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useAppSettings } from '@/providers/AppSettingsProvider';


interface VoiceMicButtonProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onTranscriptReady?: (transcript: string) => void;
  size?: number;
  disabled?: boolean;
  style?: any;
  compact?: boolean;
}

export default function VoiceMicButton({
  onRecordingComplete,
  onTranscriptReady,
  size = 40,
  disabled = false,
  style,
  compact = false,
}: VoiceMicButtonProps) {
  const { theme } = useAppSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  // Removed Audio.usePermissions() - we request permissions manually on button press
  const [webMicStatus, setWebMicStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const waveformAnims = useRef(Array(20).fill(0).map(() => new Animated.Value(0))).current;

  
  // Web recording refs
  const webMediaStreamRef = useRef<MediaStream | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<BlobPart[]>([]);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAnalyserRef = useRef<AnalyserNode | null>(null);
  const webDataArrayRef = useRef<Uint8Array | null>(null);
  const levelInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (levelInterval.current) {
        clearInterval(levelInterval.current);
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
      if (Platform.OS === 'web') {
        try {
          webMediaStreamRef.current?.getTracks().forEach(t => t.stop());
        } catch {}
        try {
          webAudioCtxRef.current?.close();
        } catch {}
        webMediaStreamRef.current = null;
        webAudioCtxRef.current = null;
        webAnalyserRef.current = null;
        webDataArrayRef.current = null;
      }
    };
  }, [recording]);

  const requestWebMic = async () => {
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
      const reason = e?.name === 'NotAllowedError' 
        ? 'Microphone permission was denied. Please enable it in your browser settings and reload.' 
        : 'Could not access microphone.';
      Alert.alert('Microphone Access', reason);
      return false;
    }
  };

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
        try {
          const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          webAudioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.8;
          webAnalyserRef.current = analyser;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
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
        setWebMicStatus('granted');
      } else {
        // Native recording (Expo AV)
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });

        // Use HIGH_QUALITY preset to avoid prepare/start race issues
        const { recording: createdRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(createdRecording);
        setIsRecording(true);
        setDuration(0);
      }

      // Start animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start audio level monitoring for waveform
      if (webAnalyserRef.current && webDataArrayRef.current) {
        levelInterval.current = setInterval(() => {
          const analyser = webAnalyserRef.current;
          const dataArray = webDataArrayRef.current;
          if (!analyser || !dataArray) return;

          try {
            analyser.getByteFrequencyData(dataArray as any);
            
            // Create 20 frequency bands for visualization
            const bands = 20;
            const bandSize = Math.floor(dataArray.length / bands);
            const newLevels: number[] = [];
            
            for (let i = 0; i < bands; i++) {
              let sum = 0;
              const start = i * bandSize;
              const end = Math.min(start + bandSize, dataArray.length);
              
              for (let j = start; j < end; j++) {
                sum += dataArray[j];
              }
              
              const average = sum / (end - start);
              const normalized = Math.min(1, average / 255);
              newLevels.push(normalized);
            }
            
            // Animate waveform bars
            newLevels.forEach((level, index) => {
              Animated.timing(waveformAnims[index], {
                toValue: level,
                duration: 100,
                useNativeDriver: false,
              }).start();
            });
          } catch (error) {
            console.warn('Audio level monitoring error:', error);
          }
        }, 50);
      }

    } catch (err: any) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      
      // Stop animations
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      
      if (levelInterval.current) {
        clearInterval(levelInterval.current);
        levelInterval.current = null;
      }
      
      // Reset waveform
      waveformAnims.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });

      if (Platform.OS === 'web') {
        const mr = webRecorderRef.current as any;
        const stream = webMediaStreamRef.current;
        if (mr && mr.state !== 'inactive') mr.stop();
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (webAudioCtxRef.current && webAudioCtxRef.current.state !== 'closed') {
          webAudioCtxRef.current.close();
        }

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
        onRecordingComplete(url, duration);
        
        // Start transcription if callback provided
        if (onTranscriptReady) {
          handleTranscription(url);
        }
        
        webRecorderRef.current = null;
        webMediaStreamRef.current = null;
        webChunksRef.current = [];
        webAudioCtxRef.current = null;
        webAnalyserRef.current = null;
        webDataArrayRef.current = null;
      } else {
        if (!recording) return;
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI();
        if (uri) {
          onRecordingComplete(uri, duration);
          
          // Start transcription if callback provided
          if (onTranscriptReady) {
            handleTranscription(uri);
          }
        }
        setRecording(null);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleTranscription = async (audioUri: string) => {
    if (!onTranscriptReady) return;
    
    console.log('[VoiceMicButton] Starting transcription for:', audioUri);
    
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        console.log('[VoiceMicButton] Web blob size:', blob.size, 'type:', blob.type);
        formData.append('audio', blob, 'recording.webm');
      } else {
        const uriParts = audioUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const audioFile = {
          uri: audioUri,
          name: "recording." + fileType,
          type: "audio/" + fileType
        } as any;
        console.log('[VoiceMicButton] Native audio file:', audioFile);
        formData.append('audio', audioFile);
      }
      
      console.log('[VoiceMicButton] Calling transcription API...');
      // Use backend transcription endpoint
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
      const response = await fetch(`${baseUrl}/api/v1/transcribe`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('[VoiceMicButton] Transcription API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VoiceMicButton] Transcription API error:', errorText);
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[VoiceMicButton] Transcription result:', result);
      const transcriptText = result.text || '';
      
      if (transcriptText.trim()) {
        console.log('[VoiceMicButton] Calling onTranscriptReady with:', transcriptText);
        onTranscriptReady(transcriptText);
      } else {
        console.warn('[VoiceMicButton] Transcription returned empty text');
        Alert.alert('Transcription Error', 'Could not transcribe audio. Please try again.');
      }
    } catch (error) {
      console.error('[VoiceMicButton] Transcription error:', error);
      Alert.alert('Transcription Error', 'Failed to transcribe audio. Please check your internet connection.');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    if (disabled) return;
    // Light haptic feedback on press
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const canRecord = Platform.OS === 'web' 
    ? webMicStatus !== 'denied'
    : true; // For native, we'll request permission when user taps record

  // Dynamic colors by theme and variant
  const buttonBg = isRecording
    ? '#EF4444'
    : (compact ? theme.colors.surface : theme.colors.primary);
  const iconColor = isRecording
    ? '#FFFFFF'
    : (compact ? theme.colors.text : '#FFFFFF');
  const buttonBorder = compact ? { borderWidth: 1, borderColor: theme.colors.border } : null;

  return (
    <View style={[styles.container, style]}>
      {/* Audio Waveform Visualizer */}
      {isRecording && !compact && (
        <View style={styles.waveformContainer}>
          <View style={styles.waveformBars}>
            {waveformAnims.map((anim, index) => {
              const barKey = `waveform-bar-${index}`;
              return (
                <Animated.View
                  key={barKey}
                  style={[
                    styles.waveformBar,
                    {
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, size * 0.6],
                        extrapolate: 'clamp',
                      }),
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}
      
      {/* Pulse effect when recording */}
      {isRecording && !compact && (
        <Animated.View 
          style={[
            styles.pulseRing,
            {
              width: size * 2.5,
              height: size * 2.5,
              borderRadius: size * 1.25,
              backgroundColor: theme.colors.primary + '15',
              transform: [{ scale: pulseAnim }],
            }
          ]} 
        />
      )}
      
      {/* Main mic button */}
      <Animated.View style={[styles.animatedContainer, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.micButton,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonBg,
            },
            buttonBorder as any,
            disabled && styles.disabled,
          ]}
          onPress={handlePress}
          disabled={disabled || !canRecord}
          activeOpacity={0.8}
        >
          {isRecording ? (
            <Square size={size * 0.4} color={iconColor} fill={iconColor} />
          ) : (
            <Mic size={size * 0.5} color={iconColor} />
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {/* Duration display */}
      {isRecording && duration > 0 && !compact && (
        <View style={styles.durationContainer}>
          <Text style={[styles.durationText, { color: 'white' }]}>
            {formatDuration(duration)}
          </Text>
        </View>
      )}
      
      {!compact && !canRecord && (
        <View style={styles.permissionContainer}>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={requestWebMic}
          >
            <Text style={[styles.permissionText, { color: theme.colors.primary }]}>
              Enable Mic
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  waveformContainer: {
    position: 'absolute',
    top: -50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 40,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 2,
  },
  pulseRing: {
    position: 'absolute',
    opacity: 0.4,
  },
  micButton: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  durationContainer: {
    position: 'absolute',
    top: -35,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  permissionContainer: {
    position: 'absolute',
    top: -45,
    alignItems: 'center',
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  permissionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  animatedContainer: {
    // Empty style for animated container
  },
});
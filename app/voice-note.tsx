import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { VoiceNotesRepo } from "@/repos/VoiceNotesRepo";
import { useVoiceNotes } from "@/providers/VoiceNotesProvider";
import { TextNotesRepo } from "@/repos/TextNotesRepo";
import { usePeople } from "@/providers/PeopleProvider";
import { Mic, Square, X, Check, User, AlertCircle } from "lucide-react-native";
import { Audio } from 'expo-av';
// Using legacy import for expo-file-system (SDK 54+ deprecated many methods)
import * as FileSystem from 'expo-file-system/legacy';
import AuthGate from '@/components/AuthGate';
import { usePaywallGate } from '@/hooks/usePaywallGate';
import ContactPickerBottomSheet from '@/components/ContactPickerBottomSheet';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { 
  getAudioPermissionPreference, 
  requestAudioPermission, 
  shouldRequestAudioPermission,
  type AudioPermissionPreference 
} from '@/lib/audioPermissions';

const { width } = Dimensions.get('window');
const INTEREST_SUGGESTIONS = [
  'AI/ML', 'Product Design', 'Startups', 'Hiking', 'Photography',
  'Music', 'Travel', 'Cooking', 'Reading', 'Fitness', 'Gaming',
  'Art', 'Technology', 'Business', 'Marketing', 'Sales'
];

export default function VoiceNoteScreen() {
  const { personId } = useLocalSearchParams();

  const { people, updatePerson } = usePeople();
  const { addVoiceNote } = useVoiceNotes();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(() => (personId ? (personId as string) : null));
  const [contextScope, setContextScope] = useState<'about_person' | 'about_me'>('about_person');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showInterestTags, setShowInterestTags] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string>('');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  
  // Permission state
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<AudioPermissionPreference>('not-asked');
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('VoiceNote');
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barsAnim = useRef(Array.from({ length: 20 }, () => new Animated.Value(0.1))).current;

  // Load permission state on mount
  useEffect(() => {
    getAudioPermissionPreference().then(state => {
      setPermissionState(state.preference);
    });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
    } else {
      pulseAnim.setValue(1);
      setAudioLevel(0);
      barsAnim.forEach(bar => bar.setValue(0.1));
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Web-specific refs for audio recording
  const webMediaStreamRef = useRef<MediaStream | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAnalyserRef = useRef<AnalyserNode | null>(null);
  const webChunksRef = useRef<BlobPart[]>([]);
  const webAnimationFrameRef = useRef<number | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animateBars = (level: number) => {
    barsAnim.forEach((bar, index) => {
      const delay = index * 50;
      const height = Math.random() * level;
      Animated.timing(bar, {
        toValue: height,
        duration: 150,
        delay,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleStartRecordingClick = async () => {
    // Check if we should request permission
    const shouldRequest = await shouldRequestAudioPermission();
    
    if (permissionState === 'denied' && !shouldRequest) {
      // User previously denied, show them how to enable
      alert(
        Platform.OS === 'web'
          ? 'Microphone access was previously denied. Please enable it in your browser settings and reload the page.'
          : 'Microphone permission was denied. Please enable it in Settings > Privacy > Microphone.'
      );
      return;
    }
    
    // Show friendly prompt before requesting permission
    if (permissionState === 'not-asked') {
      setShowPermissionPrompt(true);
    } else {
      // Permission already granted, start recording directly
      proceedWithRecording();
    }
  };

  const proceedWithRecording = async () => {
    try {
      // Request permission if needed
      if (permissionState !== 'granted') {
        const { granted, preference } = await requestAudioPermission();
        setPermissionState(preference);
        
        if (!granted) {
          alert(
            Platform.OS === 'web'
              ? 'Microphone access is required to record voice notes.'
              : 'Microphone permission is required to record voice notes.'
          );
          return;
        }
      }
      
      // Start recording
      await startRecording();
    } catch (error) {
      console.error('Failed to proceed with recording:', error);
      analytics.errors.occurred(error as Error, 'VoiceNote');
    }
  };

  const startRecording = async () => {
    try {
      setDuration(0);
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      
      // Track recording started
      screenAnalytics.track('recording_started', {
        contactId: selectedPersonId || undefined,
        contactIds: selectedPersonId ? [selectedPersonId] : undefined,
        contextScope: contextScope,
      });
      
      if (Platform.OS === 'web') {
        // Web recording using MediaRecorder API
        console.log('Starting web recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webMediaStreamRef.current = stream;

        // Set up audio context for visualization
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        webAudioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        webAnalyserRef.current = analyser;
        source.connect(analyser);

        // Set up MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        const recorder = new MediaRecorder(stream, { mimeType });
        webRecorderRef.current = recorder;
        webChunksRef.current = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            webChunksRef.current.push(e.data);
          }
        };
        
        recorder.start(100); // Collect data every 100ms
        setIsRecording(true);
        
        // Start visualization
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!webAnalyserRef.current || !isRecording) return;
          
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const level = Math.min(1, Math.max(0, rms * 5));
          setAudioLevel(level);
          animateBars(level);
          
          webAnimationFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
        
      } else {
        // Native recording for iOS/Android
        await Audio.setAudioModeAsync({ 
          allowsRecordingIOS: true, 
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });

        // Create new Recording instance
        const rec = new Audio.Recording();
        
        // Prepare recording with options
        await rec.prepareToRecordAsync({
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
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
        
        // Set up metering before starting
        rec.setOnRecordingStatusUpdate((status) => {
          if (status.isRecording && status.metering) {
            const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 160) / 160));
            setAudioLevel(normalizedLevel);
            animateBars(normalizedLevel);
          }
        });
        
        // Enable metering
        await rec.setProgressUpdateInterval(100);
        
        // Start recording
        await rec.startAsync();
        
        setRecording(rec);
        setIsRecording(true);
      }
      
      console.log('Recording started successfully');
    } catch (err: any) {
      console.error('Failed to start recording', err);
      analytics.errors.occurred(err as Error, 'VoiceNote');
      
      // Check for specific iOS background audio error
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes('background') || errorMessage.includes('audio session could not be activated')) {
        alert('Please keep the app in the foreground to record. Tap the record button again when ready.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        alert('Microphone permission is required. Please enable it in Settings.');
      } else {
        alert('Failed to start recording. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    let audioUri: string | null = null;
    let audioBlob: Blob | null = null;
    
    try {
      if (Platform.OS === 'web') {
        // Stop web recording
        const recorder = webRecorderRef.current;
        const stream = webMediaStreamRef.current;
        const ctx = webAudioCtxRef.current;
        
        if (webAnimationFrameRef.current) {
          cancelAnimationFrame(webAnimationFrameRef.current);
          webAnimationFrameRef.current = null;
        }
        
        if (recorder && recorder.state !== 'inactive') {
          await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            recorder.stop();
          });
        }
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        if (ctx && ctx.state !== 'closed') {
          await ctx.close();
        }
        
        // Create blob from chunks
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        audioBlob = new Blob(webChunksRef.current, { type: mimeType });
        audioUri = URL.createObjectURL(audioBlob);
        
        // Clean up refs
        webRecorderRef.current = null;
        webMediaStreamRef.current = null;
        webAudioCtxRef.current = null;
        webAnalyserRef.current = null;
        webChunksRef.current = [];
        
      } else {
        // Stop native recording
        if (!recording) return;
        
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        
        const uri = recording.getURI();
        if (!uri) {
          console.error('No recording URI');
          return;
        }
        
        // For native, we might want to move the file to a permanent location
        const fileName = `voice-note-${Date.now()}.${Platform.OS === 'ios' ? 'wav' : 'm4a'}`;
        const newUri = `${FileSystem.documentDirectory}${fileName}`;
        
        try {
          await FileSystem.moveAsync({
            from: uri,
            to: newUri
          });
          audioUri = newUri;
        } catch (moveError) {
          console.log('Using original URI, move failed:', moveError);
          audioUri = uri;
        }
        
        setRecording(null);
      }
      
      if (!audioUri && !audioBlob) {
        console.error('No audio data available');
        return;
      }
      
      // Transcribe the audio
      setIsTranscribing(true);
      const form = new FormData();
      
      if (Platform.OS === 'web' && audioBlob) {
        // For web, append the blob directly
        form.append('audio', audioBlob, 'recording.webm');
      } else if (audioUri) {
        // For native, create a file object
        const uriParts = audioUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const audioFile: any = {
          uri: audioUri,
          name: `recording.${fileType}`,
          type: `audio/${fileType}`,
        };
        form.append('audio', audioFile);
      }
      
      console.log('Sending audio for transcription...');
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
      const resp = await fetch(`${baseUrl}/api/v1/transcribe`, {
        method: 'POST',
        body: form,
      });
      
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || 'Transcription failed');
      }
      
      const text: string = json.text || '';
      console.log('Transcription received:', text.substring(0, 100) + '...');
      setTranscript(text);
      
      // Store audio data for later upload when saving
      if (audioUri) setRecordedAudioUri(audioUri);
      if (audioBlob) setRecordedAudioBlob(audioBlob);
      
      // Track successful recording completion
      const recordingDuration = recordingStartTime > 0 ? Date.now() - recordingStartTime : duration * 1000;
      screenAnalytics.track('recording_completed', {
        contactId: selectedPersonId || undefined,
        contactIds: selectedPersonId ? [selectedPersonId] : undefined,
        duration: Math.floor(recordingDuration / 1000),
        transcriptLength: text.length,
      });
      
      // Extract interests from transcript
      const extractedInterests = INTEREST_SUGGESTIONS.filter((interest) => 
        text.toLowerCase().includes(interest.toLowerCase())
      ).slice(0, 6);
      
      setSelectedInterests(extractedInterests);
      setShowInterestTags(extractedInterests.length > 0 || text.length > 50);
      
      // Track transcription view and interests extracted
      screenAnalytics.track('transcription_viewed', {
        contactId: selectedPersonId || undefined,
        contactIds: selectedPersonId ? [selectedPersonId] : undefined,
        transcriptLength: text.length,
        duration: Math.floor(recordingDuration / 1000),
      });
      
      if (extractedInterests.length > 0) {
        screenAnalytics.track('contacts_extracted', {
          contactId: selectedPersonId || undefined,
          contactIds: selectedPersonId ? [selectedPersonId] : undefined,
          extractedCount: extractedInterests.length,
          interests: extractedInterests,
        });
      }
      
    } catch (error) {
      console.error('Recording/transcription error:', error);
      analytics.errors.occurred(error as Error, 'VoiceNote');
      
      // Track recording cancelled or failed
      const recordingDuration = recordingStartTime > 0 ? Date.now() - recordingStartTime : duration * 1000;
      screenAnalytics.track('recording_cancelled', {
        contactId: selectedPersonId || undefined,
        contactIds: selectedPersonId ? [selectedPersonId] : undefined,
        duration: Math.floor(recordingDuration / 1000),
        reason: 'error',
      });
      
      alert('Failed to process recording. Please try again.');
    } finally {
      setIsTranscribing(false);
      setAudioLevel(0);
      barsAnim.forEach(bar => bar.setValue(0.1));
    }
  };

  const handleSave = async () => {
    if (transcript) {
      try {
        if (contextScope === 'about_person' && selectedPersonId) {
          // Save voice note linked to selected contact
          await addVoiceNote({
            personId: selectedPersonId,
            audioUri: recordedAudioUri,
            transcription: transcript,
            audioBlob: recordedAudioBlob || undefined,
          });
          const person = people.find(p => p.id === selectedPersonId);
          if (person) {
            const updatedInterests = Array.from(new Set([...(person.interests || []), ...selectedInterests]));
            updatePerson(selectedPersonId, {
              interests: updatedInterests,
              lastInteraction: new Date().toISOString(),
              lastInteractionSummary: transcript.slice(0, 100) + '...',
            });
          }
          // Track voice note saved with contact
          screenAnalytics.track('voice_note_saved', {
            contactId: selectedPersonId,
            transcriptLength: transcript.length,
            interestsCount: selectedInterests.length,
            contextScope: 'about_person',
          });
        } else {
          // Save as personal voice note
          await addVoiceNote({
            personId: undefined, // Personal note, no person associated
            audioUri: recordedAudioUri,
            transcription: transcript,
            audioBlob: recordedAudioBlob || undefined,
          });
          
          // Track personal voice note saved
          screenAnalytics.track('voice_note_saved', {
            transcriptLength: transcript.length,
            contextScope: 'about_me',
          });
        }
        router.back();
      } catch (error) {
        console.error('Failed to save voice note:', error);
        analytics.errors.occurred(error as Error, 'VoiceNote');
        alert('Failed to save voice note. Please try again.');
      }
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-show paywall if user is not paid
  usePaywallGate();

  return (
    <AuthGate requireAuth>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Context Scope Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Save to</Text>
            <View style={styles.scopeSelector}>
              <TouchableOpacity
                style={[styles.scopeButton, contextScope === 'about_person' && styles.scopeButtonSelected]}
                onPress={() => setContextScope('about_person')}
              >
                <Text style={[styles.scopeButtonText, contextScope === 'about_person' && styles.scopeButtonTextSelected]}>
                  Contact
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeButton, contextScope === 'about_me' && styles.scopeButtonSelected]}
                onPress={() => setContextScope('about_me')}
              >
                <User size={16} color={contextScope === 'about_me' ? '#FFFFFF' : '#666666'} />
                <Text style={[styles.scopeButtonText, contextScope === 'about_me' && styles.scopeButtonTextSelected]}>
                  My Personal Context
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Picker - only show if about_person */}
          {contextScope === 'about_person' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Contact</Text>
              <ContactPickerBottomSheet
                selectedId={selectedPersonId ?? undefined}
                onSelect={(id: string) => setSelectedPersonId(id)}
                placeholder="Choose contact..."
                disabled={isRecording}
              />
            </View>
          )}

          {/* Recording Interface */}
          <View style={styles.recordingSection}>
            {/* Audio Visualization */}
            {isRecording && (
              <View style={styles.audioVisualization}>
                <View style={styles.barsContainer}>
                  {barsAnim.map((bar, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.audioBar,
                        {
                          height: bar.interpolate({ inputRange: [0, 1], outputRange: [10, 28] }),
                          opacity: 0.9,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
            
            <View style={styles.recordingVisual}>
              <Animated.View
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.recordButtonInner}
                  onPress={isRecording ? stopRecording : handleStartRecordingClick}
                >
                  {isRecording ? (
                    <Square size={32} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Mic size={32} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
            
            <Text style={styles.duration}>{formatDuration(duration)}</Text>
            <Text style={styles.recordingHint}>
              {isRecording ? "Tap to stop recording" : "Tap to start recording"}
            </Text>
          </View>

          {/* Transcript */}
          {(transcript || isTranscribing) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transcript</Text>
              {isTranscribing ? (
                <View style={styles.transcribingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.transcribingText}>Transcribing and extracting insights...</Text>
                </View>
              ) : (
                <View style={styles.transcriptContainer}>
                  <Text style={styles.transcriptText}>{transcript}</Text>
                </View>
              )}
            </View>
          )}

          {/* Interest Tags */}
          {showInterestTags && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Extracted Interests</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedInterests.length > 0 
                  ? `Tap to add/remove from ${contextScope === 'about_me' ? 'your profile' : 'contact'}`
                  : 'Select interests to tag this note'}
              </Text>
              <View style={styles.interestGrid}>
                {INTEREST_SUGGESTIONS.map(interest => {
                  const isSelected = selectedInterests.includes(interest);
                  const isExtracted = selectedInterests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      style={[
                        styles.interestChip,
                        isSelected && styles.interestChipSelected,
                        isExtracted && !isSelected && styles.interestChipExtracted,
                      ]}
                      onPress={() => toggleInterest(interest)}
                    >
                      <Text style={[
                        styles.interestChipText,
                        isSelected && styles.interestChipTextSelected,
                      ]}>
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <X size={20} color="#666666" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, (!transcript || (contextScope === 'about_person' && !selectedPersonId)) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!transcript || (contextScope === 'about_person' && !selectedPersonId)}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Note</Text>
          </TouchableOpacity>
        </View>

        {/* Permission Prompt Modal - App Store Guideline 5.1.1 compliant */}
        {/* Note: No exit/dismiss button per Apple requirement - user must proceed to permission request */}
        <Modal
          visible={showPermissionPrompt}
          transparent
          animationType="fade"
          onRequestClose={() => {
            // Per Apple Guideline 5.1.1: User must proceed to permission request
            // Closing modal also triggers the permission request
            setShowPermissionPrompt(false);
            screenAnalytics.track('permission_prompt_accepted', { via: 'back_gesture' });
            proceedWithRecording();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Mic size={32} color="#000000" />
              </View>
              
              <Text style={styles.modalTitle}>
                Enable Microphone Access
              </Text>
              
              <Text style={styles.modalMessage}>
                EverReach uses your microphone to record voice notes. For example, you can record a quick note like "Remind me to follow up with Sarah about the project meeting" and it will be transcribed and saved to your contacts. Your audio is processed securely and only used for transcription.
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalAllowButtonFull}
                  onPress={() => {
                    setShowPermissionPrompt(false);
                    screenAnalytics.track('permission_prompt_accepted', {});
                    proceedWithRecording();
                  }}
                >
                  <Text style={styles.modalAllowText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  scopeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  scopeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  scopeButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  scopeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  scopeButtonTextSelected: {
    color: '#FFFFFF',
  },
  personList: {
    flexDirection: 'row',
    gap: 8,
  },
  personChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  personChipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  personChipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  personChipTextSelected: {
    color: '#FFFFFF',
  },
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  audioVisualization: {
    height: 60,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  audioBar: {
    width: 4,
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  recordingVisual: {
    position: 'relative',
    marginBottom: 24,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  duration: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  recordingHint: {
    fontSize: 14,
    color: '#666666',
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  transcribingText: {
    fontSize: 14,
    color: '#666666',
  },
  transcriptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  transcriptText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#000000',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  interestChipSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  interestChipExtracted: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFD93D',
  },
  interestChipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  interestChipTextSelected: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalAllowButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  modalAllowButtonFull: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  modalAllowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
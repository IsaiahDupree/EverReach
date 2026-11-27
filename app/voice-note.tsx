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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { VoiceNotesRepo } from "@/repos/VoiceNotesRepo";
import { TextNotesRepo } from "@/repos/TextNotesRepo";
import { usePeople } from "@/providers/PeopleProvider";
import { Mic, Square, X, Check, User } from "lucide-react-native";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const INTEREST_SUGGESTIONS = [
  'AI/ML', 'Product Design', 'Startups', 'Hiking', 'Photography',
  'Music', 'Travel', 'Cooking', 'Reading', 'Fitness', 'Gaming',
  'Art', 'Technology', 'Business', 'Marketing', 'Sales'
];

export default function VoiceNoteScreen() {
  const { personId } = useLocalSearchParams();

  const { people, updatePerson } = usePeople();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(personId as string || "");
  const [contextScope, setContextScope] = useState<'about_person' | 'about_me'>('about_person');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showInterestTags, setShowInterestTags] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barsAnim = useRef(Array.from({ length: 20 }, () => new Animated.Value(0.1))).current;

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

  const startRecording = async () => {
    try {
      setDuration(0);
      
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
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          alert("Permission to access microphone is required!");
          return;
        }

        await Audio.setAudioModeAsync({ 
          allowsRecordingIOS: true, 
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });

        const { recording: rec } = await Audio.Recording.createAsync({
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
        
        setRecording(rec);
        setIsRecording(true);
        
        // Set up metering for native
        rec.setOnRecordingStatusUpdate((status) => {
          if (status.isRecording && status.metering) {
            const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 160) / 160));
            setAudioLevel(normalizedLevel);
            animateBars(normalizedLevel);
          }
        });
        
        // Enable metering
        await rec.setProgressUpdateInterval(100);
      }
      
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Failed to start recording. Please check microphone permissions.');
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
      const resp = await fetch('https://toolkit.rork.com/stt/transcribe/', {
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
      
      // Extract interests from transcript
      const extractedInterests = INTEREST_SUGGESTIONS.filter((interest) => 
        text.toLowerCase().includes(interest.toLowerCase())
      ).slice(0, 6);
      
      setSelectedInterests(extractedInterests);
      setShowInterestTags(extractedInterests.length > 0 || text.length > 50);
      
    } catch (error) {
      console.error('Recording/transcription error:', error);
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
          // Save voice note to contact
          const voiceNote = {
            id: Date.now().toString(),
            personId: selectedPersonId,
            transcription: transcript,
            audioUri: "", // In production, upload to storage
            createdAt: Date.now(),
            processed: true,
          };
          await VoiceNotesRepo.upsert(voiceNote);
          
          // Update person's interests
          const person = people.find(p => p.id === selectedPersonId);
          if (person) {
            const updatedInterests = Array.from(new Set([...(person.interests || []), ...selectedInterests]));
            updatePerson(selectedPersonId, {
              interests: updatedInterests,
              lastInteraction: new Date().toISOString(),
              lastInteractionSummary: transcript.slice(0, 100) + '...',
            });
          }
        } else {
          // Save as personal voice note
          const voiceNote = {
            id: Date.now().toString(),
            personId: undefined, // Personal note, no person associated
            transcription: transcript,
            audioUri: "", // In production, upload to storage
            createdAt: Date.now(),
            processed: true,
          };
          await VoiceNotesRepo.upsert(voiceNote);
        }
        router.back();
      } catch (error) {
        console.error('Failed to save voice note:', error);
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

  return (
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

        {/* Person Selector - only show if about_person */}
        {contextScope === 'about_person' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Contact</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.personList}>
                {people.map(person => (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.personChip,
                      selectedPersonId === person.id && styles.personChipSelected
                    ]}
                    onPress={() => setSelectedPersonId(person.id)}
                  >
                    <Text style={[
                      styles.personChipText,
                      selectedPersonId === person.id && styles.personChipTextSelected
                    ]}>
                      {person.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
                onPress={isRecording ? stopRecording : startRecording}
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
    </SafeAreaView>
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
});
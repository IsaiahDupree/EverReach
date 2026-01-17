import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useOnboarding, type UserFocus, type ReminderFrequency } from '@/providers/OnboardingProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { useWarmthSettings } from '@/providers/WarmthSettingsProvider';
import { router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { 
  Briefcase, 
  Heart, 
  Handshake, 
  Calendar,
  Clock,
  Settings,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle,
  Edit3,
  RefreshCw,
  Copy,
  Check,
  X
} from 'lucide-react-native';
import { pickOneNativeContact } from '@/helpers/nativePicker';
import * as Clipboard from 'expo-clipboard';
import VoiceRecorder from '@/components/VoiceRecorder';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { useAnalytics } from '@/hooks/useAnalytics';



export default function OnboardingFlow() {
  const { theme, isDark } = useAppSettings();
  const { 
    currentStep, 
    userFocus, 
    reminderFrequency,
    setUserFocus, 
    setReminderFrequency,
    setFirstContact,
    nextStep, 
    completeOnboarding 
  } = useOnboarding();
  const { addPerson, people } = usePeople();
  const { addVoiceNote } = useVoiceNotes();
  const { settings } = useWarmthSettings();
  const screenAnalytics = useAnalytics('Onboarding');
  
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [warmthScore, setWarmthScore] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isMarkingAsSent, setIsMarkingAsSent] = useState<boolean>(false);
  const [hasRecordedVoiceNote, setHasRecordedVoiceNote] = useState<boolean>(false);
  const [voiceNoteTranscript, setVoiceNoteTranscript] = useState<string>('');
  const [voiceNoteUri, setVoiceNoteUri] = useState<string>('');
  const [voiceNoteDuration, setVoiceNoteDuration] = useState<number>(0);

  const styles = createStyles(theme, currentStep);

  useEffect(() => {
    screenAnalytics.track('onboarding_viewed', {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    screenAnalytics.track('onboarding_step_viewed', { step: currentStep });
  }, [currentStep]);

  const handleFocusSelection = async (focus: UserFocus) => {
    if (!focus || !['networking', 'personal', 'business'].includes(focus)) {
      console.error('Invalid focus selection:', focus);
      return;
    }
    screenAnalytics.track('onboarding_focus_selected', { focus });
    await setUserFocus(focus);
    nextStep();
  };

  const handleContactSelection = async () => {
    try {
      console.log('Starting contact selection...');
      
      let addedContact: any = null;
      
      const result = await pickOneNativeContact(people, async (person) => {
        const saved = await addPerson(person);
        addedContact = {
          id: saved.id,
          fullName: saved.fullName,
          name: saved.fullName,
        };
        return saved;
      });
      console.log('Contact selection result:', result);
      
      if (result.imported === 1 && addedContact) {
        screenAnalytics.track('onboarding_contact_chosen', {});
        // Successfully imported a contact
        setSelectedContact({
          id: addedContact.id,
          name: addedContact.fullName,
          firstName: addedContact.fullName.split(' ')[0]
        });
        
        setFirstContact(addedContact.id);
        
        // Generate a sample message
        const firstName = addedContact.fullName.split(' ')[0];
        const messages = [
          `Hey ${firstName}, congrats again on the new role! How's it going so far?`,
          `Hi ${firstName}, hope you're doing well! Would love to catch up soon.`,
          `Hey ${firstName}, thinking of you! How have things been?`
        ];
        const initialMessage = messages[Math.floor(Math.random() * messages.length)];
        setGeneratedMessage(initialMessage);
        setEditedMessage(initialMessage);
        setHasCopied(false);
        setIsEditing(false);
        
        screenAnalytics.track('onboarding_contact_selected', { contact: addedContact });
        nextStep();
      } else if (result.duplicates === 1) {
        console.log('Contact already exists');
        screenAnalytics.track('onboarding_contact_already_exists', {});
      } else if (result.errors === 1) {
        console.log('Permission denied or error occurred');
        screenAnalytics.track('onboarding_contact_selection_error', {});
      }
      // If result.total === 0, user cancelled - do nothing
    } catch (error) {
      console.error('Error selecting contact:', error);
      screenAnalytics.track('onboarding_contact_selection_error', { error });
    }
  };

  const handleEditMessage = () => {
    setIsEditing(true);
    setEditedMessage(generatedMessage);
  };

  const handleSaveEdit = () => {
    setGeneratedMessage(editedMessage);
    setIsEditing(false);
    setHasCopied(false); // Reset copy status when message is edited
  };

  const handleCancelEdit = () => {
    setEditedMessage(generatedMessage);
    setIsEditing(false);
  };

  const handleRegenerateMessage = async () => {
    if (!selectedContact) return;
    
    setIsRegenerating(true);
    try {
      screenAnalytics.track('onboarding_message_regenerated', {});
      // Generate a new message
      const firstName = selectedContact.firstName;
      const messages = [
        `Hey ${firstName}, congrats again on the new role! How's it going so far?`,
        `Hi ${firstName}, hope you're doing well! Would love to catch up soon.`,
        `Hey ${firstName}, thinking of you! How have things been?`,
        `${firstName}, been meaning to reach out! How's everything going?`,
        `Hi ${firstName}, hope your week is going well! Wanted to check in.`,
        `Hey ${firstName}, thinking of our last conversation. How are things?`
      ];
      
      // Filter out the current message to ensure we get a different one
      const availableMessages = messages.filter(msg => msg !== generatedMessage);
      const newMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
      
      setGeneratedMessage(newMessage);
      setEditedMessage(newMessage);
      setHasCopied(false); // Reset copy status when message is regenerated
    } catch (error) {
      console.error('Error regenerating message:', error);
      Alert.alert('Error', 'Failed to regenerate message. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await Clipboard.setStringAsync(generatedMessage);
      setHasCopied(true);
      console.log('Message copied to clipboard');
      screenAnalytics.track('onboarding_message_copied', {});
    } catch (error) {
      console.error('Failed to copy message:', error);
      Alert.alert('Error', 'Failed to copy message. Please try again.');
    }
  };

  const handleMarkAsSent = async () => {
    if (!hasCopied) {
      Alert.alert('Copy Required', 'Please copy the message first before marking it as sent.');
      return;
    }
    
    setIsMarkingAsSent(true);
    try {
      screenAnalytics.track('onboarding_mark_sent', {});
      // Simulate marking as sent
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the same warmth score as new contacts would get
      const initialWarmthScore = settings.defaultWarmthForNewLeads;
      setWarmthScore(initialWarmthScore);
      nextStep();
    } catch (error) {
      console.error('Error marking message as sent:', error);
      Alert.alert('Error', 'Failed to mark message as sent. Please try again.');
    } finally {
      setIsMarkingAsSent(false);
    }
  };

  const handleReminderSetup = async (frequency: ReminderFrequency) => {
    if (!frequency || !['daily', 'weekly', 'custom'].includes(frequency)) {
      console.error('Invalid reminder frequency:', frequency);
      return;
    }
    screenAnalytics.track('onboarding_reminder_selected', { frequency });
    await setReminderFrequency(frequency);
    nextStep();
  };

  const handleVoiceNoteComplete = (uri: string, duration: number) => {
    console.log('Voice note recording completed:', { uri, duration });
    setVoiceNoteUri(uri);
    setVoiceNoteDuration(duration);
    setHasRecordedVoiceNote(true);
    screenAnalytics.track('onboarding_voice_recorded', { duration });
  };
  
  const handleTranscriptReady = (transcript: string) => {
    console.log('Transcript ready:', transcript);
    setVoiceNoteTranscript(transcript);
    screenAnalytics.track('onboarding_voice_transcribed', { length: transcript?.length || 0 });
    
    // Save the voice note with transcript to the selected contact
    if (selectedContact && voiceNoteUri) {
      addVoiceNote({
        personId: selectedContact.id,
        audioUri: voiceNoteUri,
        transcription: transcript,
      });
      console.log('Voice note saved with transcript for contact:', selectedContact.id);
    }
  };

  const handleComplete = async () => {
    screenAnalytics.track('onboarding_completed', {});
    await completeOnboarding();
    router.replace('/home');
  };

  const handleSkip = async () => {
    screenAnalytics.track('onboarding_skipped', {});
    await completeOnboarding();
    router.replace('/home');
  };

  const renderWelcomeScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: isDark ? 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/8e8pms0or37i6ejhdocoh' : 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k06vwypz60k05vjo6ylch' }}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityLabel="EverReach logo"
            testID="everreach-logo-onboarding"
          />
        </View>
        <Text style={styles.title}>Never drop the ball with people again with EverReach.</Text>
        <Text style={styles.subtitle}>EverReach is your memory for relationships, powered by warmth.</Text>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
          <Text style={styles.primaryButtonText}>Let&apos;s Get Started</Text>
          <ArrowRight size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFocusScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>What&apos;s most important to you right now in EverReach?</Text>
        <Text style={styles.subtitle}>We&apos;ll personalize your experience.</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          style={[styles.focusOption, userFocus === 'networking' && styles.focusOptionSelected]}
          onPress={() => handleFocusSelection('networking')}
        >
          <Briefcase size={32} color={userFocus === 'networking' ? theme.colors.surface : theme.colors.primary} />
          <Text style={[styles.focusLabel, userFocus === 'networking' && styles.focusLabelSelected]}>
            Networking
          </Text>
          <Text style={[styles.focusDescription, userFocus === 'networking' && styles.focusDescriptionSelected]}>
            Build professional connections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.focusOption, userFocus === 'personal' && styles.focusOptionSelected]}
          onPress={() => handleFocusSelection('personal')}
        >
          <Heart size={32} color={userFocus === 'personal' ? theme.colors.surface : theme.colors.primary} />
          <Text style={[styles.focusLabel, userFocus === 'personal' && styles.focusLabelSelected]}>
            Personal
          </Text>
          <Text style={[styles.focusDescription, userFocus === 'personal' && styles.focusDescriptionSelected]}>
            Stay close with friends & family
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.focusOption, userFocus === 'business' && styles.focusOptionSelected]}
          onPress={() => handleFocusSelection('business')}
        >
          <Handshake size={32} color={userFocus === 'business' ? theme.colors.surface : theme.colors.primary} />
          <Text style={[styles.focusLabel, userFocus === 'business' && styles.focusLabelSelected]}>
            Business
          </Text>
          <Text style={[styles.focusDescription, userFocus === 'business' && styles.focusDescriptionSelected]}>
            Maintain client relationships
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContactScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Pick one person you&apos;ve been meaning to reconnect with.</Text>
        <Text style={styles.subtitle}>No need to add everyone yet. Just one matters.</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.contactCard}>
          <Users size={48} color={theme.colors.textSecondary} />
          <Text style={styles.contactCardText}>Choose from your contacts</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContactSelection}>
          <Text style={styles.primaryButtonText}>Choose Contact</Text>
          <ArrowRight size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessageScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Here&apos;s a thought you could send.</Text>
        {hasCopied && (
          <Text style={styles.copiedIndicator}>✓ Copied to clipboard</Text>
        )}
      </View>
      
      <View style={styles.content}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.messageInput}
              value={editedMessage}
              onChangeText={setEditedMessage}
              multiline
              placeholder="Edit your message..."
              placeholderTextColor={theme.colors.textSecondary}
            />
            <View style={styles.editButtonRow}>
              <TouchableOpacity 
                style={[styles.secondaryButton, styles.flexButton]} 
                onPress={handleCancelEdit}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.primaryButton, styles.flexButton]} 
                onPress={handleSaveEdit}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{generatedMessage}</Text>
            
            <View style={styles.messageActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleEditMessage}
              >
                <Edit3 size={16} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, isRegenerating && styles.actionButtonDisabled]} 
                onPress={handleRegenerateMessage}
                disabled={isRegenerating}
              >
                <RefreshCw size={16} color={isRegenerating ? theme.colors.textSecondary : theme.colors.primary} />
                <Text style={[styles.actionButtonText, isRegenerating && styles.actionButtonTextDisabled]}>
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, hasCopied && styles.actionButtonSuccess]} 
                onPress={handleCopyMessage}
              >
                {hasCopied ? (
                  <Check size={16} color={theme.colors.success} />
                ) : (
                  <Copy size={16} color={theme.colors.primary} />
                )}
                <Text style={[styles.actionButtonText, hasCopied && styles.actionButtonTextSuccess]}>
                  {hasCopied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        {!isEditing && (
          <TouchableOpacity 
            style={[
              styles.primaryButton, 
              !hasCopied && styles.primaryButtonDisabled
            ]} 
            onPress={handleMarkAsSent}
            disabled={!hasCopied || isMarkingAsSent}
          >
            <Text style={[
              styles.primaryButtonText,
              !hasCopied && styles.primaryButtonTextDisabled
            ]}>
              {isMarkingAsSent ? 'Marking as Sent...' : 'Mark as Sent & Continue'}
            </Text>
            {hasCopied && <ArrowRight size={20} color={theme.colors.surface} />}
          </TouchableOpacity>
        )}
        
        {!hasCopied && !isEditing && (
          <Text style={styles.instructionText}>
            Copy the message above to continue to the next step
          </Text>
        )}
      </View>
    </View>
  );

  const renderWarmthScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>You just warmed up your connection with {selectedContact?.firstName || 'them'}.</Text>
        <Text style={styles.subtitle}>Keep your important people glowing by checking in over time.</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.warmthContainer}>
          <View style={[
            styles.warmthDial, 
            styles.warmthDialBorder,
            { borderColor: getWarmthColor(warmthScore) }
          ]}>
            <Sparkles size={48} color={getWarmthColor(warmthScore)} />
            <Text style={[
              styles.warmthScore, 
              styles.warmthScoreColor,
              { color: getWarmthColor(warmthScore) }
            ]}>
              {warmthScore}°
            </Text>
          </View>
          <Text style={styles.warmthLabel}>Warmth Score</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
          <Text style={styles.primaryButtonText}>See My Warmth Map</Text>
          <ArrowRight size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReminderScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>When do you want reminders?</Text>
        <Text style={styles.subtitle}>Keep a 2-person streak weekly to stay green. 5-person streak unlocks gold.</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          style={[styles.reminderOption, reminderFrequency === 'daily' && styles.reminderOptionSelected]}
          onPress={() => handleReminderSetup('daily')}
        >
          <Calendar size={24} color={reminderFrequency === 'daily' ? theme.colors.surface : theme.colors.primary} />
          <Text style={[styles.reminderLabel, reminderFrequency === 'daily' && styles.reminderLabelSelected]}>
            Daily
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.reminderOption, reminderFrequency === 'weekly' && styles.reminderOptionSelected]}
          onPress={() => handleReminderSetup('weekly')}
        >
          <Clock size={24} color={reminderFrequency === 'weekly' ? theme.colors.surface : theme.colors.primary} />
          <Text style={[styles.reminderLabel, reminderFrequency === 'weekly' && styles.reminderLabelSelected]}>
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.reminderOption, reminderFrequency === 'custom' && styles.reminderOptionSelected]}
          onPress={() => handleReminderSetup('custom')}
        >
          <Settings size={24} color={reminderFrequency === 'custom' ? theme.colors.surface : theme.colors.primary} />
          <Text style={[styles.reminderLabel, reminderFrequency === 'custom' && styles.reminderLabelSelected]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVoiceNoteScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Add a voice note about {selectedContact?.firstName || 'them'}</Text>
        <Text style={styles.subtitle}>
          Record something you want to remember - their interests, recent updates, or context for future conversations.
        </Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.voiceNoteContainer}>
          <VoiceRecorder 
            onRecordingComplete={handleVoiceNoteComplete}
            onTranscriptReady={handleTranscriptReady}
            personId={selectedContact?.id}
            contextScope="about_person"
            maxDuration={120} // 2 minutes for onboarding
            showTranscript={true}
            enableTranscription={true}
          />
          
          {hasRecordedVoiceNote && (
            <View style={styles.successMessage}>
              <CheckCircle size={24} color={theme.colors.success} />
              <Text style={styles.successText}>
                {voiceNoteTranscript ? 'Voice note saved with transcript!' : 'Voice note saved!'}
              </Text>
            </View>
          )}
          
          {voiceNoteTranscript && (
            <View style={styles.transcriptPreview}>
              <Text style={styles.transcriptPreviewTitle}>What you said:</Text>
              <Text style={styles.transcriptPreviewText}>&ldquo;{voiceNoteTranscript}&rdquo;</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !hasRecordedVoiceNote && styles.primaryButtonDisabled
          ]} 
          onPress={nextStep}
          disabled={!hasRecordedVoiceNote}
        >
          <Text style={[
            styles.primaryButtonText,
            !hasRecordedVoiceNote && styles.primaryButtonTextDisabled
          ]}>
            Continue
          </Text>
          {hasRecordedVoiceNote && <ArrowRight size={20} color={theme.colors.surface} />}
        </TouchableOpacity>
        
        {!hasRecordedVoiceNote && (
          <Text style={styles.instructionText}>
            Record a voice note to continue. It will be transcribed and saved.
          </Text>
        )}
      </View>
    </View>
  );

  const renderCompleteScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <View style={styles.celebrationContainer}>
          <CheckCircle size={64} color={theme.colors.success} />
          <Text style={styles.celebrationText}>🎉</Text>
        </View>
        <Text style={styles.title}>You&apos;re all set!</Text>
        <Text style={styles.subtitle}>
          This week we&apos;ll help you keep your relationships warm. Next week, we&apos;ll show you who&apos;s cooling down.
        </Text>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
          <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
          <ArrowRight size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // New: Video showcase page before completion
  const videoStarted = useRef(false);
  const videoCompleted = useRef(false);
  const renderVideoShowcase = () => (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>See EverReach in action</Text>
        <Text style={styles.subtitle}>A quick look at how EverReach helps you connect faster.</Text>
      </View>
      <View style={styles.content}>
        <Video
          style={{ width: '100%', aspectRatio: 16/9, backgroundColor: '#000', borderRadius: 12 }}
          source={{ uri: 'https://cdn.coverr.co/videos/coverr-woman-typing-on-a-phone-8933/1080p.mp4' }}
          resizeMode={ResizeMode.COVER}
          useNativeControls
          shouldPlay={false}
          isLooping
          onPlaybackStatusUpdate={(status: any) => {
            try {
              if (!videoStarted.current && status?.isPlaying) {
                videoStarted.current = true;
                screenAnalytics.track('onboarding_video_started', {});
              }
              if (!videoCompleted.current && status?.didJustFinish) {
                videoCompleted.current = true;
                screenAnalytics.track('onboarding_video_completed', {});
              }
            } catch {}
          }}
        />
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            • Context-aware message generation{"\n"}
            • Warmth tracking & reminders{"\n"}
            • Unified history across channels
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {
            screenAnalytics.track('onboarding_video_next_click', {});
            nextStep();
          }}
        >
          <Text style={styles.primaryButtonText}>Finish</Text>
          <ArrowRight size={20} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getWarmthColor = (score: number) => {
    if (score >= 80) return '#4ECDC4';
    if (score >= 60) return '#FFD93D';
    if (score >= 40) return '#FFA726';
    return '#FF6B6B';
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderWelcomeScreen();
      case 1: return renderFocusScreen();
      case 2: return renderContactScreen();
      case 3: return renderMessageScreen();
      case 4: return renderWarmthScreen();
      case 5: return renderVoiceNoteScreen();
      case 6: return renderReminderScreen();
      case 7: return renderVideoShowcase();
      case 8: return renderCompleteScreen();
      default: return renderWelcomeScreen();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Skip button - only show if not on the final step */}
      {currentStep < 8 && (
        <View style={styles.skipButtonContainer}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkip}
            testID="skip-onboarding-button"
          >
            <Text style={styles.skipButtonText}>Skip</Text>
            <X size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>
      
      {/* Progress indicator */}
      {currentStep < 8 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressText}>{currentStep + 1} of 9</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Unified theme colors matching welcome.tsx
const THEME = {
  primary: '#7C3AED',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  iconBg: {
    purple: '#EDE9FE',
    yellow: '#FEF3C7',
    blue: '#DBEAFE',
    green: '#D1FAE5',
  }
};

const createStyles = (theme: any, currentStep: number = 0) => {
  const progressWidth = `${((currentStep + 1) / 9) * 100}%`;
  
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 32,
  },
  brandLogo: {
    width: 96,
    height: 96,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 17,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  footer: {
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  focusOption: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  focusOptionSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  focusLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
  },
  focusLabelSelected: {
    color: '#FFFFFF',
  },
  focusDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  focusDescriptionSelected: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  contactCard: {
    backgroundColor: THEME.iconBg.purple,
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: THEME.primary + '30',
    borderStyle: 'dashed',
  },
  contactCardText: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  messageText: {
    fontSize: 16,
    color: THEME.text,
    lineHeight: 24,
  },
  warmthContainer: {
    alignItems: 'center',
    gap: 24,
  },
  warmthDial: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.iconBg.green,
  },
  warmthScore: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  warmthLabel: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  reminderOption: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reminderOptionSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  reminderLabelSelected: {
    color: '#FFFFFF',
  },
  celebrationContainer: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  celebrationText: {
    fontSize: 48,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 2,
    width: progressWidth as any,
  },
  progressText: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  flexButton: {
    flex: 1,
  },
  copiedIndicator: {
    fontSize: 14,
    color: THEME.success,
    marginTop: 8,
    fontWeight: '500' as const,
  },
  editContainer: {
    gap: 16,
  },
  messageInput: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 24,
    fontSize: 16,
    color: THEME.text,
    minHeight: 120,
    textAlignVertical: 'top' as const,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  editButtonRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  messageActions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: THEME.iconBg.purple,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonSuccess: {
    backgroundColor: THEME.success + '20',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: THEME.primary,
  },
  actionButtonTextDisabled: {
    color: THEME.textSecondary,
  },
  actionButtonTextSuccess: {
    color: THEME.success,
  },
  primaryButtonDisabled: {
    backgroundColor: THEME.textSecondary,
    opacity: 0.6,
  },
  primaryButtonTextDisabled: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  instructionText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center' as const,
    marginTop: 16,
    fontStyle: 'italic' as const,
  },
  warmthDialBorder: {
    // Dynamic border color will be applied inline
  },
  warmthScoreColor: {
    // Dynamic text color will be applied inline
  },
  voiceNoteContainer: {
    backgroundColor: THEME.iconBg.blue,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.success + '20',
    borderRadius: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.success,
  },
  transcriptPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  transcriptPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  transcriptPreviewText: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  skipButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 1000,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
});
};
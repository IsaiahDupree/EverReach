import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { X, MessageCircle, Mail, Smartphone, Sparkles, Heart, Briefcase, Camera, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useVoiceNotes } from '@/providers/VoiceNotesProvider';
import { useAppSettings, type Theme } from '@/providers/AppSettingsProvider';
import { Channel, ToneStyle } from '@/types/message';
import * as ImagePicker from 'expo-image-picker';
import { useMessages } from '@/providers/MessageProvider';
import { getGoalById } from '@/constants/messageGoals';
import { composeMessage } from '@/lib/agent-api';
import { useSubscription } from '@/providers/SubscriptionProvider';
import PremiumGate from '@/components/PremiumGate';

interface Person {
  id: string;
  fullName: string;
  title?: string;
  company?: string;
  interests?: string[];
  goals?: string[];
  values?: string[];
  lastInteraction?: string;
  lastInteractionSummary?: string;
  emails?: string[];
  phones?: string[];
  comms?: {
    channelsPreferred?: string[];
    style?: {
      tone?: 'casual' | 'neutral' | 'formal';
      brevity?: 'short' | 'medium' | 'long';
    };
  };
}

interface CraftMessageModalProps {
  visible: boolean;
  onClose: () => void;
  person: Person;
  initialAdditionalContext?: string;
}

type WizardStep = 'goal' | 'channel' | 'tone' | 'preview';

export default function CraftMessageModal({ visible, onClose, person, initialAdditionalContext }: CraftMessageModalProps) {
  const router = useRouter();
  const { voiceNotes } = useVoiceNotes();
  const { getAllGoals } = useMessages();
  const { theme } = useAppSettings();
  const { isPaid, isTrialExpired } = useSubscription();
  const gated = isTrialExpired && !isPaid;
  const [currentStep, setCurrentStep] = useState<WizardStep>('goal');
  const [selectedGoal, setSelectedGoal] = useState<string>('check_in');
  const [customGoal, setCustomGoal] = useState<string>('');
  const [contextAwareGoals, setContextAwareGoals] = useState<{id: string, name: string, description: string}[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel>('sms');
  const [selectedTone, setSelectedTone] = useState<ToneStyle>('casual');
  const [contextSummary, setContextSummary] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        Keyboard.dismiss();
      }
    },
  });

  const generateContextSummary = useCallback(() => {
    const personVoiceNotes = voiceNotes.filter(vn => vn.personId === person.id);
    const recentNotes = personVoiceNotes.slice(-3);
    
    let summary = `${person.fullName}`;
    if (person.title && person.company) {
      summary += ` — ${person.title} at ${person.company}`;
    }
    
    if (person.lastInteraction) {
      const daysSince = Math.floor((Date.now() - new Date(person.lastInteraction).getTime()) / (1000 * 60 * 60 * 24));
      summary += `\n\nLast contact: ${daysSince} days ago`;
      if (person.lastInteractionSummary) {
        summary += ` — ${person.lastInteractionSummary}`;
      }
    }
    
    if (person.interests?.length) {
      summary += `\n\nInterests: ${person.interests.slice(0, 3).join(', ')}`;
    }
    
    if (recentNotes.length > 0) {
      summary += `\n\nRecent notes: ${recentNotes.map(n => n.transcription?.slice(0, 50) + '...').join(' • ')}`;
    }
    
    setContextSummary(summary);
  }, [person, voiceNotes]);

  const generateContextAwareGoals = useCallback(() => {
    const personVoiceNotes = voiceNotes.filter(vn => vn.personId === person.id);
    const recentNotes = personVoiceNotes.slice(-2);
    const goals: {id: string, name: string, description: string}[] = [];

    // Generate goals based on last interaction
    if (person.lastInteractionSummary) {
      if (person.lastInteractionSummary.toLowerCase().includes('ai') || 
          person.lastInteractionSummary.toLowerCase().includes('features')) {
        goals.push({
          id: 'follow_up_ai',
          name: 'Follow up on AI features',
          description: `Continue the conversation about ${person.lastInteractionSummary.toLowerCase()}`
        });
      }
      
      if (person.lastInteractionSummary.toLowerCase().includes('meeting') ||
          person.lastInteractionSummary.toLowerCase().includes('call')) {
        goals.push({
          id: 'follow_up_meeting',
          name: 'Follow up on our meeting',
          description: `Reference your recent discussion: ${person.lastInteractionSummary}`
        });
      }
    }

    // Generate goals based on interests
    if (person.interests?.length) {
      const interest = person.interests[0];
      goals.push({
        id: `ask_about_${interest.toLowerCase().replace(/\s+/g, '_')}`,
        name: `Ask about ${interest.toLowerCase()}`,
        description: `Connect over their interest in ${interest}`
      });
    }

    // Generate goals based on recent notes
    if (recentNotes.length > 0) {
      const recentNote = recentNotes[0];
      if (recentNote.transcription && recentNote.transcription.length > 20) {
        const notePreview = recentNote.transcription.slice(0, 50);
        goals.push({
          id: 'follow_up_note',
          name: 'Follow up on recent note',
          description: `Reference: ${notePreview}...`
        });
      }
    }

    // Always add a generic check-in if we don't have enough context-specific goals
    if (goals.length < 2) {
      const daysSince = person.lastInteraction 
        ? Math.floor((Date.now() - new Date(person.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      
      goals.push({
        id: 'check_in_contextual',
        name: daysSince > 30 ? 'Reconnect after time apart' : 'Casual check-in',
        description: daysSince > 30 
          ? `It's been ${daysSince} days since you last connected`
          : 'A friendly check-in to stay in touch'
      });
    }

    setContextAwareGoals(goals.slice(0, 3)); // Limit to 3 suggestions
  }, [person, voiceNotes]);

  useEffect(() => {
    if (visible && person) {
      generateContextSummary();
      generateContextAwareGoals();
      setCurrentStep('goal');
      setCustomGoal('');
      if (initialAdditionalContext) {
        setAdditionalContext(initialAdditionalContext);
      }
      // Set default channel based on person's preferences
      const preferredChannel = person.comms?.channelsPreferred?.[0] as Channel;
      if (preferredChannel && ['sms', 'email', 'dm'].includes(preferredChannel)) {
        setSelectedChannel(preferredChannel);
      }
      // Set default tone based on person's style
      const preferredTone = person.comms?.style?.tone;
      if (preferredTone && ['casual', 'professional', 'warm', 'direct'].includes(preferredTone)) {
        setSelectedTone(preferredTone as ToneStyle);
      }
    }
  }, [visible, person, generateContextSummary, generateContextAwareGoals, initialAdditionalContext]);

  // Quick-generate: tap a suggested goal to jump straight to results
  const quickGenerateFromSuggestion = useCallback((goal: { id: string; name: string }) => {
    // Map context-only IDs to supported ones or treat as custom
    const known = getGoalById(goal.id, getAllGoals());
    let goalId = goal.id;
    let customName: string | undefined = undefined;
    if (!known) {
      if (goalId === 'check_in_contextual') {
        goalId = 'check_in';
      } else {
        goalId = 'custom';
        customName = goal.name;
      }
    }

    if (gated) {
      setCurrentStep('preview');
      return;
    }

    onClose();
    router.push({
      pathname: '/message-results',
      params: {
        personId: person.id,
        goalId,
        customGoal: customName,
        channel: selectedChannel,
        tone: selectedTone,
        additionalContext: additionalContext || undefined,
      },
    });
  }, [additionalContext, getAllGoals, onClose, person.id, router, selectedChannel, selectedTone, gated]);

  const generateMessage = async () => {
    if (gated) {
      return;
    }
    setIsGenerating(true);
    
    try {
      const suggestion = contextAwareGoals.find(g => g.id === selectedGoal);
      const isKnown = !!getGoalById(selectedGoal, getAllGoals());
      let goalText = customGoal.trim();

      if (!goalText) {
        if (!isKnown) {
          if (selectedGoal === 'check_in_contextual') {
            goalText = 'Check in and reconnect';
          } else if (suggestion) {
            goalText = suggestion.name;
          }
        } else {
          const knownGoal = getGoalById(selectedGoal, getAllGoals());
          goalText = knownGoal?.name || 'General message';
        }
      }

      // Do not compose here. Route to results screen; it will compose as single source of truth.
      onClose();
      router.push({
        pathname: '/message-results',
        params: {
          personId: person.id,
          goalId: customGoal.trim() ? 'custom' : selectedGoal,
          customGoal: customGoal.trim() || undefined,
          channel: selectedChannel,
          tone: selectedTone,
          additionalContext: additionalContext || undefined,
        },
      });
    } catch (error) {
      console.error('[CraftMessage] Error generating message:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'Failed to generate message. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScreenshotUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // For now, we'll simulate screenshot analysis
        // In a real implementation, you'd upload and analyze the image
        const mockAnalysis = "Screenshot shows a message about Q2 deliverables and project timeline discussion.";
        setAdditionalContext(mockAnalysis);
        setCustomGoal("Reply to message about Q2 deliverables");
        Alert.alert('Screenshot Analyzed', 'Custom goal generated from screenshot content.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to process screenshot');
    }
  };

  const nextStep = () => {
    switch (currentStep) {
      case 'goal':
        setCurrentStep('channel');
        break;
      case 'channel':
        setCurrentStep('tone');
        break;
      case 'tone':
        setCurrentStep('preview');
        break;
      case 'preview':
        generateMessage();
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case 'channel':
        setCurrentStep('goal');
        break;
      case 'tone':
        setCurrentStep('channel');
        break;
      case 'preview':
        setCurrentStep('tone');
        break;
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'goal': return 1;
      case 'channel': return 2;
      case 'tone': return 3;
      case 'preview': return 4;
      default: return 1;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'goal': return 'Pick or Create Goal';
      case 'channel': return 'Choose Channel';
      case 'tone': return 'Choose Tone';
      case 'preview': return 'Preview & Send';
      default: return 'Craft Message';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'goal': return "What's your goal for reaching out?";
      case 'channel': return 'How will you send it?';
      case 'tone': return "What's your vibe?";
      case 'preview': return 'Ready to generate your message?';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'goal': return selectedGoal || customGoal.trim();
      case 'channel': return selectedChannel;
      case 'tone': return selectedTone;
      case 'preview': return true;
      default: return false;
    }
  };

  const getChannelIcon = (channel: Channel) => {
    const iconColor = selectedChannel === channel ? theme.colors.surface : theme.colors.primary;
    switch (channel) {
      case 'sms': return <Smartphone size={24} color={iconColor} />;
      case 'email': return <Mail size={24} color={iconColor} />;
      case 'dm': return <MessageCircle size={24} color={iconColor} />;
      default: return <MessageCircle size={24} color={iconColor} />;
    }
  };

  const getChannelLabel = (channel: Channel) => {
    switch (channel) {
      case 'sms': return 'Text Message';
      case 'email': return 'Email';
      case 'dm': return 'Direct Message';
      default: return 'Message';
    }
  };

  const getGoalIcon = (goalId: string) => {
    const iconColor = selectedGoal === goalId ? theme.colors.surface : theme.colors.primary;
    const iconSize = 24;
    
    // Map common goal IDs to icons
    if (goalId.includes('congratulate') || goalId.includes('celebrate')) {
      return <Heart size={iconSize} color={iconColor} />;
    }
    if (goalId.includes('professional') || goalId.includes('business')) {
      return <Briefcase size={iconSize} color={iconColor} />;
    }
    if (goalId.includes('follow') || goalId.includes('check')) {
      return <MessageCircle size={iconSize} color={iconColor} />;
    }
    return <Sparkles size={iconSize} color={iconColor} />;
  };

  const getToneEmoji = (tone: ToneStyle) => {
    switch (tone) {
      case 'casual': return '😎';
      case 'professional': return '👔';
      case 'warm': return '❤️';
      case 'direct': return '⚡';
      default: return '💬';
    }
  };

  const styles = createStyles(theme);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{getStepTitle()}</Text>
            <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
            <Text style={styles.progress}>Step {getStepNumber()} of 4</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          {...panResponder.panHandlers}
        >
          {/* Step Content */}
          {currentStep === 'goal' && (
            <>
              {/* Context Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Context</Text>
                <View style={styles.contextCard}>
                  <Text style={styles.contextText}>{contextSummary}</Text>
                  {additionalContext && (
                    <View style={styles.additionalContext}>
                      <Text style={styles.additionalContextLabel}>From screenshot:</Text>
                      <Text style={styles.additionalContextText}>{additionalContext}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Context-Aware Goal Suggestions */}
              {contextAwareGoals.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Suggested Goals</Text>
                  <Text style={styles.sectionSubtitle}>Based on your history with {person.fullName}</Text>
                  <View style={styles.goalGrid}>
                    {contextAwareGoals.map(goal => (
                      <TouchableOpacity
                        key={goal.id}
                        style={[
                          styles.goalCard,
                          selectedGoal === goal.id && styles.goalCardSelected
                        ]}
                        onPress={() => {
                          setSelectedGoal(goal.id);
                          setCustomGoal('');
                          quickGenerateFromSuggestion(goal);
                        }}
                      >
                        <View style={[
                          styles.goalIconContainer,
                          selectedGoal === goal.id && styles.goalIconContainerSelected
                        ]}>
                          {getGoalIcon(goal.id)}
                        </View>
                        <Text style={[
                          styles.goalCardText,
                          selectedGoal === goal.id && styles.goalCardTextSelected
                        ]}>
                          {goal.name}
                        </Text>
                        <Text style={[
                          styles.goalDescription,
                          selectedGoal === goal.id && styles.goalDescriptionSelected
                        ]}>
                          {goal.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Custom Goal Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Custom Goal</Text>
                <Text style={styles.sectionSubtitle}>Type your own goal if the suggestions don&apos;t fit</Text>
                <View style={styles.customGoalContainer}>
                  <TextInput
                    style={[
                      styles.customGoalInput,
                      customGoal.trim() && styles.customGoalInputActive
                    ]}
                    placeholder="Type your own goal..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={customGoal}
                    onChangeText={(text) => {
                      setCustomGoal(text);
                      if (text.trim()) {
                        setSelectedGoal('');
                      }
                    }}
                    multiline
                    maxLength={200}
                  />
                </View>
              </View>

              {/* Screenshot Response Option */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Screenshot Response</Text>
                <Text style={styles.sectionSubtitle}>Create a response to a screenshot</Text>
                <TouchableOpacity
                  style={styles.screenshotCard}
                  onPress={handleScreenshotUpload}
                >
                  <View style={styles.screenshotIconContainer}>
                    <Camera size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.screenshotTextContainer}>
                    <Text style={styles.screenshotCardTitle}>Upload Screenshot</Text>
                    <Text style={styles.screenshotCardSubtitle}>AI will analyze and create a custom goal</Text>
                  </View>
                  <ArrowRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {currentStep === 'channel' && (
            <View style={styles.section}>
              <View style={styles.channelSelector}>
                {(['sms', 'email', 'dm'] as Channel[]).map(channel => (
                  <TouchableOpacity
                    key={channel}
                    style={[
                      styles.channelCard,
                      selectedChannel === channel && styles.channelCardSelected
                    ]}
                    onPress={() => setSelectedChannel(channel)}
                  >
                    <View style={[
                      styles.channelIconContainer,
                      selectedChannel === channel && styles.channelIconContainerSelected
                    ]}>
                      {getChannelIcon(channel)}
                    </View>
                    <Text style={[
                      styles.channelCardText,
                      selectedChannel === channel && styles.channelCardTextSelected
                    ]}>
                      {getChannelLabel(channel)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {currentStep === 'tone' && (
            <View style={styles.section}>
              <View style={styles.toneSelector}>
                {(['casual', 'professional', 'warm', 'direct'] as ToneStyle[]).map(tone => (
                  <TouchableOpacity
                    key={tone}
                    style={[
                      styles.toneChip,
                      selectedTone === tone && styles.toneChipSelected
                    ]}
                    onPress={() => setSelectedTone(tone)}
                  >
                    <Text style={styles.toneEmoji}>{getToneEmoji(tone)}</Text>
                    <Text style={[
                      styles.toneText,
                      selectedTone === tone && styles.toneTextSelected
                    ]}>
                      {tone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {currentStep === 'preview' && (
            <View style={styles.section}>
              {gated ? (
                <PremiumGate />
              ) : (
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Ready to Generate</Text>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Goal:</Text>
                    <Text style={styles.previewValue}>
                      {customGoal.trim() || contextAwareGoals.find(g => g.id === selectedGoal)?.name || 'Check In'}
                    </Text>
                  </View>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Channel:</Text>
                    <Text style={styles.previewValue}>{getChannelLabel(selectedChannel)}</Text>
                  </View>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Tone:</Text>
                    <Text style={styles.previewValue}>{selectedTone}</Text>
                  </View>
                  {additionalContext && (
                    <View style={styles.previewItem}>
                      <Text style={styles.previewLabel}>Context:</Text>
                      <Text style={styles.previewValue}>{additionalContext.slice(0, 100)}...</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Navigation Footer */}
        <View style={styles.footer}>
          {currentStep !== 'goal' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={prevStep}
            >
              <ArrowLeft size={20} color={theme.colors.textSecondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.footerSpacer} />
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!canProceed() || isGenerating || (gated && currentStep === 'preview')) && styles.nextButtonDisabled
            ]}
            onPress={nextStep}
            disabled={!canProceed() || isGenerating || (gated && currentStep === 'preview')}
          >
            {isGenerating && currentStep === 'preview' ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <>
                <Text style={[
                  styles.nextButtonText,
                  (!canProceed() || isGenerating) && styles.nextButtonTextDisabled
                ]}>
                  {currentStep === 'preview' ? 'Generate Messages' : 'Next'}
                </Text>
                {currentStep === 'preview' ? (
                  <Sparkles size={20} color={theme.colors.surface} />
                ) : (
                  <ArrowRight size={20} color={theme.colors.surface} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  progress: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  contextCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  contextText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  goalGrid: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  goalCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  goalCardTextSelected: {
    color: theme.colors.surface,
  },
  goalDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  goalDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  customBadge: {
    backgroundColor: '#FFE4B5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF8C00',
  },
  channelSelector: {
    gap: 12,
  },
  channelCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  channelCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  channelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  channelIconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  channelCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  channelCardTextSelected: {
    color: theme.colors.surface,
  },
  generateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  toneSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toneChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toneChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toneEmoji: {
    fontSize: 16,
  },
  toneText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  toneTextSelected: {
    color: theme.colors.surface,
  },
  attachmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  additionalContext: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  additionalContextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  additionalContextText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  customGoalContainer: {
    marginBottom: 16,
  },
  customGoalInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customGoalInputActive: {
    borderColor: theme.colors.primary,
  },
  screenshotCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  screenshotIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  screenshotTextContainer: {
    flex: 1,
  },
  screenshotCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  screenshotCardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  previewItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: 80,
  },
  previewValue: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  footerSpacer: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  nextButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
});
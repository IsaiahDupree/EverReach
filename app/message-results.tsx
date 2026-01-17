import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Copy, Send, Edit3, Check, Sparkles, Wand2, Mail, MessageSquare, AtSign } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import { useMessages } from '@/providers/MessageProvider';
import { AnalyticsService } from '@/services/analytics';
import { useCopyInference } from '@/hooks/useCopyInference';

import { analytics } from '@/utils/analytics';
import { Channel, ToneStyle, GeneratedVariant, MessageGoal } from '@/types/message';
import { getGoalById } from '@/constants/messageGoals';
import { trpc } from '@/lib/trpc';
import { generateMessages } from '@/services/messageGeneration';
import { FLAGS } from '@/constants/flags';

export default function MessageResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { people, updatePerson } = usePeople();

  const { updateMessage, addMessage, getAllGoals } = useMessages();
  
  // Parse params
  const personId = params.personId as string;
  const goalId = params.goalId as string;
  const customGoal = params.customGoal as string | undefined;
  const channel = params.channel as Channel;
  
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [selectedTone, setSelectedTone] = useState<ToneStyle>('casual');
  const [selectedChannel, setSelectedChannel] = useState<Channel>(channel);
  const [messageId, setMessageId] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempText, setTempText] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateMessageMutation = trpc.messages.generate.useMutation();
  const additionalContext = params.additionalContext as string | undefined;
  const screenshotAssetId = params.screenshotAssetId as string | undefined;
  const screenshotContext = params.screenshotContext as string | undefined;
  const screenshotText = params.screenshotText as string | undefined;
  
  const person = people.find(p => p.id === personId);
  
  const goal = useMemo((): MessageGoal | undefined => {
    if (goalId === 'custom' && customGoal) {
      return {
        id: 'custom',
        name: customGoal,
        template: `Write a ${channel} message to {contact_first} about: ${customGoal}. Keep it {tone} and {length}.`,
        defaultChannels: [channel],
        styleTags: ['custom']
      };
    }
    if (goalId === 'screenshot_response' && screenshotContext) {
      return {
        id: 'screenshot_response',
        name: 'Respond to Screenshot',
        template: `Write a ${channel} message to {contact_first} responding to this screenshot: ${screenshotContext}${screenshotText ? `. Text in image: ${screenshotText}` : ''}. Keep it {tone} and {length}.`,
        defaultChannels: [channel],
        styleTags: ['screenshot']
      };
    }
    return getGoalById(goalId, getAllGoals());
  }, [goalId, customGoal, channel, getAllGoals, screenshotContext, screenshotText]);

  // Track screen view
  useEffect(() => {
    AnalyticsService.trackScreenViewed({ screenName: 'message_results' });
  }, []);

  // If a tone was provided via route param, initialize the selector
  useEffect(() => {
    const toneParam = params.tone as ToneStyle | undefined;
    if (toneParam && (['casual','professional','warm','direct'] as ToneStyle[]).includes(toneParam)) {
      setSelectedTone(toneParam);
    }
  }, [params.tone]);

  const { markAsSent: trackMarkAsSent } = useCopyInference({
    onSentInferred: (msgId: string) => {
      updateMessage(msgId, { status: 'sent_inferred' });
      Alert.alert(
        'Message Sent?',
        'It looks like you may have sent this message. Would you like to mark it as sent?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => handleMarkAsSent(msgId) }
        ]
      );
    }
  });

  const handleMarkAsSent = useCallback(async (msgId?: string) => {
    const finalMessageId = msgId || messageId;
    
    try {
      // Update message status in local database
      updateMessage(finalMessageId, { 
        status: 'sent_confirmed',
        updatedAt: Date.now()
      });
      
      // Update person's last interaction data
      updatePerson(personId, {
        lastInteraction: new Date().toISOString(),
        lastInteractionSummary: `Sent ${goal?.name || 'custom'} message via ${selectedChannel}`
      });
      
      // Track the event for analytics
      trackMarkAsSent(finalMessageId, goalId, personId);
      
      console.log('✅ Message marked as sent and databases updated');
      
      // Dismiss modal and navigate to dashboard home
      router.dismiss();
      router.replace('/(tabs)/home');
      
    } catch (error) {
      console.error('Failed to mark message as sent:', error);
      Alert.alert('Error', 'Failed to update message status. Please try again.');
    }
  }, [messageId, goalId, personId, selectedChannel, goal, updateMessage, updatePerson, trackMarkAsSent, router]);

  const generateInitialMessages = useCallback(async () => {
    if (!person || !goal) return;
    
    const startTime = Date.now();
    
    try {
      setIsGenerating(true);
      
      if (FLAGS.LOCAL_ONLY) {
        console.log('🏠 Using local message generation');
        // Use local message generation service
        const generatedVariants = await generateMessages(goal, {
          personId,
          channel: selectedChannel,
          contact_first: person.fullName?.split(' ')[0] || '',
          contact_last: person.fullName?.split(' ').slice(1).join(' ') || '',
          contact_role: person.title || '',
          company: person.company || '',
          recent_notes: person.lastInteractionSummary || '',
          shared_interests: person.interests?.join(', ') || '',
          tone: selectedTone,
          length: 'medium',
          goal_name: goal.name
        });
        
        setVariants(generatedVariants);
        const newMessageId = `local-${Date.now()}`;
        setMessageId(newMessageId);
        
        // Save the generated message to the database
        const messageRecord = {
          contactId: personId,
          goalId,
          contextSnapshot: {
            goal_name: goal.name,
            contact_first: person.fullName?.split(' ')[0] || '',
            contact_last: person.fullName?.split(' ').slice(1).join(' ') || '',
            contact_role: person.title || '',
            company: person.company || '',
            recent_notes: person.lastInteractionSummary || '',
            shared_interests: person.interests?.join(', ') || '',
            tone: selectedTone,
            length: 'medium' as const
          },
          variants: generatedVariants,
          channelSelected: channel,
          status: 'draft' as const
        };
        
        const savedMessageId = addMessage(messageRecord);
        setMessageId(savedMessageId);
      } else {
        console.log('☁️ Using backend message generation');
        // Use backend tRPC service
        const data = await generateMessageMutation.mutateAsync({
          personId,
          goalId,
          channel: selectedChannel,
          context: {
            goal_name: goal.name,
            contact_first: person.fullName?.split(' ')[0] || '',
            contact_last: person.fullName?.split(' ').slice(1).join(' ') || '',
            contact_role: person.title || '',
            company: person.company || '',
            recent_notes: person.lastInteractionSummary || '',
            shared_interests: person.interests?.join(', ') || '',
            tone: selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1) as 'Casual' | 'Professional' | 'Warm' | 'Direct',
            length: 'medium'
          },
        });

        console.log('Raw API response:', data);
        
        // Handle different response formats
        let variants: any[] = [];
        if (data && Array.isArray(data.variants)) {
          variants = data.variants;
        } else if (Array.isArray(data)) {
          variants = data;
        } else {
          console.error('Unexpected API response format:', data);
          throw new Error('Invalid API response format');
        }

        const generatedVariants: GeneratedVariant[] = variants.map((variant: any) => {
          let text = variant.text || variant.message || 'No message generated';
          let subject = variant.subject;
          
          // Add email-specific formatting if email is selected
          if (selectedChannel === 'email') {
            if (!subject) {
              subject = generateEmailSubject(goal.name, person.fullName || '', selectedTone);
            }
            text = text + generateEmailClosing(selectedTone);
          }
          
          return {
            text,
            subject,
            edited: variant.edited || false,
          };
        });

        setVariants(generatedVariants);
        const newMessageId = data.id || `temp-${Date.now()}`;
        setMessageId(newMessageId);
        
        // Save the generated message to the database
        const messageRecord = {
          contactId: personId,
          goalId,
          contextSnapshot: {
            goal_name: goal.name,
            contact_first: person.fullName?.split(' ')[0] || '',
            contact_last: person.fullName?.split(' ').slice(1).join(' ') || '',
            contact_role: person.title || '',
            company: person.company || '',
            recent_notes: person.lastInteractionSummary || '',
            shared_interests: person.interests?.join(', ') || '',
            tone: selectedTone,
            length: 'medium' as const
          },
          variants: generatedVariants,
          channelSelected: channel,
          status: 'draft' as const
        };
        
        const savedMessageId = addMessage(messageRecord);
        setMessageId(savedMessageId);
      }
      
      setIsGenerating(false);
      
      // Track AI message generation
      AnalyticsService.trackMessageGenerated({
        contactId: personId,
        channel: selectedChannel as any,
        goal: goalId,
        tone: selectedTone as any,
        fromScreenshot: !!screenshotAssetId,
        fromVoiceNote: false,
        latencyMs: Date.now() - startTime,
        tokenCount: variants.reduce((sum, v) => sum + v.text.length, 0) / 4 // rough estimate
      });
      
    } catch (error) {
      console.error('Generation failed:', error);
      setIsGenerating(false);
      Alert.alert('Error', 'Failed to generate messages. Please try again.');
    }
    
  }, [person, goal, goalId, personId, channel, selectedChannel, selectedTone, generateMessageMutation, addMessage, variants.length]);

  // Guard: only generate once per unique combination of inputs.
  const genKey = useMemo(
    () => JSON.stringify({ personId, goalId, channel, selectedTone, additionalContext }),
    [personId, goalId, channel, selectedTone, additionalContext]
  );
  const lastGenKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (person && goal && !hasGeneratedRef.current && isMountedRef.current) {
      hasGeneratedRef.current = true;
      generateInitialMessages();
    }
    // Only generate on initial load, not on tone changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.id, goal?.id]);



  const regenerateAll = async () => {
    hasGeneratedRef.current = false; // Allow regeneration
    await generateInitialMessages();
  };

  const regenerateForTone = async () => {
    if (!person || !goal || isGenerating) return;
    hasGeneratedRef.current = false; // Allow regeneration
    await generateInitialMessages();
  };

  // Regenerate when tone or channel changes
  useEffect(() => {
    if (variants.length > 0) {
      regenerateForTone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTone, selectedChannel]);

  const regenerateOne = async (index: number) => {
    if (!person || !goal) return;
    
    try {
      setIsGenerating(true);
      
      if (FLAGS.LOCAL_ONLY) {
        console.log('🏠 Using local message regeneration');
        // Use local message generation service
        const generatedVariants = await generateMessages(goal, {
          personId,
          channel: selectedChannel,
          contact_first: person.fullName?.split(' ')[0] || '',
          contact_last: person.fullName?.split(' ').slice(1).join(' ') || '',
          contact_role: person.title || '',
          company: person.company || '',
          recent_notes: person.lastInteractionSummary || '',
          shared_interests: person.interests?.join(', ') || '',
          tone: selectedTone,
          length: 'medium',
          goal_name: goal.name
        });
        
        const updatedVariants = [...variants];
        updatedVariants[index] = generatedVariants[0]; // Use first variant as replacement
        
        setVariants(updatedVariants);
        if (updateMessage) {
          updateMessage(messageId, { variants: updatedVariants });
        }
      } else {
        console.log('☁️ Using backend message regeneration');
        // Use backend tRPC service
        const data = await generateMessageMutation.mutateAsync({
          personId,
          goalId,
          channel: selectedChannel,
          context: {
            goal_name: goal.name,
            contact_first: person.fullName?.split(' ')[0] || '',
            contact_last: person.fullName?.split(' ').slice(1).join(' ') || '',
            contact_role: person.title || '',
            company: person.company || '',
            recent_notes: person.lastInteractionSummary || '',
            shared_interests: person.interests?.join(', ') || '',
            tone: selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1) as 'Casual' | 'Professional' | 'Warm' | 'Direct',
            length: 'medium'
          },
        });

        console.log('Raw regeneration response:', data);
        
        // Handle different response formats
        let variants: any[] = [];
        if (data && Array.isArray(data.variants)) {
          variants = data.variants;
        } else if (Array.isArray(data)) {
          variants = data;
        } else {
          console.error('Unexpected regeneration response format:', data);
          throw new Error('Invalid regeneration response format');
        }

        const newVariants: GeneratedVariant[] = variants.map((variant: any) => {
          let text = variant.text || variant.message || 'No message generated';
          let subject = variant.subject;
          
          // Add email-specific formatting if email is selected
          if (selectedChannel === 'email') {
            if (!subject) {
              subject = generateEmailSubject(goal.name, person.fullName || '', selectedTone);
            }
            text = text + generateEmailClosing(selectedTone);
          }
          
          return {
            text,
            subject,
            edited: variant.edited || false,
          };
        });

        const updatedVariants = [...variants];
        updatedVariants[index] = newVariants[0]; // Use first variant as replacement
        
        setVariants(updatedVariants);
        if (updateMessage) {
          updateMessage(messageId, { variants: updatedVariants });
        }
      }
      
      setIsGenerating(false);
      
    } catch (error) {
      console.error('Regeneration failed:', error);
      setIsGenerating(false);
      Alert.alert('Error', 'Failed to regenerate message.');
    }
  };

  const handleCopy = async (variant: GeneratedVariant, index: number) => {
    const fullText = variant.subject ? `${variant.subject}\n\n${variant.text}` : variant.text;
    
    try {
      await Clipboard.setStringAsync(fullText);
      
      updateMessage(messageId, { status: 'copied', chosenIndex: index });
      updatePerson(personId, {
        lastSuggestCopyAt: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        lastInteractionSummary: `Copied ${goal?.name || 'custom'} message`
      });
      
      // Track message copy (implicit acceptance)
      AnalyticsService.trackAiMessageAccepted({
        messageId,
        contactId: personId,
        method: 'copy'
      });
      
      Alert.alert('Copied!', 'Message copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      Alert.alert('Error', 'Failed to copy message to clipboard');
    }
  };

  const handleSend = async (variant: GeneratedVariant, index: number) => {
    if (!person) return;
    
    const fullText = variant.subject ? `${variant.subject}\n\n${variant.text}` : variant.text;
    
    try {
      let intent: 'mailto' | 'sms' | 'share' = 'share';
      
      if (selectedChannel === 'sms' && person.phones?.[0]) {
        intent = 'sms';
        await Linking.openURL(`sms:${person.phones[0]}&body=${encodeURIComponent(variant.text)}`);
      } else if (selectedChannel === 'email' && person.emails?.[0]) {
        intent = 'mailto';
        const subject = variant.subject || 'Following up';
        await Linking.openURL(`mailto:${person.emails[0]}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(variant.text)}`);
      } else {
        intent = 'share';
        await Share.share({ message: fullText });
      }
      
      // Track message sent
      AnalyticsService.trackMessageSent({
        messageId,
        contactId: personId,
        channel: selectedChannel as any,
        wasAiGenerated: true,
        wasEdited: variant.edited || false
      });
      
      updateMessage(messageId, { status: 'sent_confirmed', chosenIndex: index });
      updatePerson(personId, {
        lastInteraction: new Date().toISOString(),
        lastInteractionSummary: `Sent ${goal?.name || 'custom'} message via ${selectedChannel}`
      });
      
    } catch (error) {
      console.error('Send failed:', error);
      Alert.alert('Error', 'Failed to open messaging app');
    }
  };

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setTempText(text);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const updatedVariants = [...variants];
    updatedVariants[editingIndex] = {
      ...updatedVariants[editingIndex],
      text: tempText,
      edited: true
    };
    
    setVariants(updatedVariants);
    updateMessage(messageId, { variants: updatedVariants });
    
    // Track message edited
    AnalyticsService.trackAiMessageEdited({
      messageId,
      contactId: personId,
      editType: 'text',
      charsDelta: tempText.length - updatedVariants[editingIndex].text.length
    });
    
    setEditingIndex(null);
    setTempText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setTempText('');
  };

  const getChannelIcon = (ch: Channel) => {
    switch (ch) {
      case 'sms': return MessageSquare;
      case 'email': return Mail;
      case 'dm': return AtSign;
      default: return MessageSquare;
    }
  };

  const getChannelLabel = (ch: Channel) => {
    switch (ch) {
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      case 'dm': return 'DM';
      default: return 'SMS';
    }
  };

  const generateEmailClosing = (tone: ToneStyle): string => {
    switch (tone) {
      case 'professional':
        return '\n\nBest regards,\n[Your name]';
      case 'warm':
        return '\n\nWarm regards,\n[Your name]';
      case 'casual':
        return '\n\nThanks,\n[Your name]';
      case 'direct':
        return '\n\nBest,\n[Your name]';
      default:
        return '\n\nBest,\n[Your name]';
    }
  };

  const generateEmailSubject = (goalName: string, contactName: string, tone: ToneStyle): string => {
    const firstName = contactName.split(' ')[0];
    
    switch (tone) {
      case 'professional':
        return `Following up - ${firstName}`;
      case 'warm':
        return `Hope you're doing well, ${firstName}!`;
      case 'casual':
        return `Hey ${firstName}!`;
      case 'direct':
        return `Quick follow-up`;
      default:
        return `Following up - ${firstName}`;
    }
  };

  if (!person || !goal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Error: Missing person or goal data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Context Info */}
      <View style={styles.contextInfo}>
        <Text style={styles.contextSubtitle}>{person.fullName}</Text>
      </View>
      
      {/* Channel Selector */}
      <View style={styles.channelSelector}>
        {(['email', 'sms', 'dm'] as Channel[]).map(ch => {
          const IconComponent = getChannelIcon(ch);
          return (
            <TouchableOpacity
              key={ch}
              style={[styles.channelChip, selectedChannel === ch && styles.channelChipSelected]}
              onPress={() => setSelectedChannel(ch)}
            >
              <IconComponent 
                size={16} 
                color={selectedChannel === ch ? '#FFFFFF' : '#666666'} 
              />
              <Text style={[styles.channelText, selectedChannel === ch && styles.channelTextSelected]}>
                {getChannelLabel(ch)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tone Selector */}
      <View style={styles.toneSelector}>
        {(['casual', 'professional', 'warm', 'direct'] as ToneStyle[]).map(tone => (
          <TouchableOpacity
            key={tone}
            style={[styles.toneChip, selectedTone === tone && styles.toneChipSelected]}
            onPress={() => setSelectedTone(tone)}
          >
            <Text style={[styles.toneText, selectedTone === tone && styles.toneTextSelected]}>
              {tone}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingIcon}>
              <Sparkles size={32} color="#4ECDC4" />
            </View>
            <Text style={styles.loadingText}>Crafting your messages...</Text>
            <Text style={styles.loadingSubtext}>Using AI to personalize for {person.fullName}</Text>
          </View>
        ) : (
          <>
            {variants.map((variant, index) => (
              <View key={index} style={styles.messageCard}>
                <View style={styles.messageContent}>
                  <TouchableOpacity
                    style={styles.copyIconButton}
                    onPress={() => handleCopy(variant, index)}
                  >
                    <Copy size={20} color="#4ECDC4" />
                  </TouchableOpacity>
                  
                  <View style={styles.messageTextContainer}>
                    <View style={styles.messageHeader}>
                      <View style={styles.variantBadge}>
                        <Text style={styles.variantBadgeText}>Option {index + 1}</Text>
                      </View>
                      {variant.edited && (
                        <View style={styles.editedBadge}>
                          <Edit3 size={12} color="#4ECDC4" />
                          <Text style={styles.editedBadgeText}>Edited</Text>
                        </View>
                      )}
                    </View>
                    
                    {selectedChannel === 'email' && variant.subject && (
                      <View style={styles.subjectContainer}>
                        <Text style={styles.subjectLabel}>Subject:</Text>
                        <Text style={styles.messageSubject}>{variant.subject}</Text>
                      </View>
                    )}
                    
                    {editingIndex === index ? (
                      <View style={styles.editContainer}>
                        <TextInput
                          style={styles.editInput}
                          value={tempText}
                          onChangeText={setTempText}
                          multiline
                          autoFocus
                          placeholder="Edit your message..."
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity onPress={cancelEdit} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={saveEdit} style={styles.saveButton}>
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.saveButtonText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.messageBodyContainer}>
                        <Text style={styles.messageBody}>{variant.text}</Text>
                      </View>
                    )}
                    
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => startEditing(index, variant.text)}
                      >
                        <Edit3 size={16} color="#666666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => regenerateOne(index)}
                      >
                        <Wand2 size={16} color="#666666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => handleSend(variant, index)}
                      >
                        <Send size={16} color="#FFFFFF" />
                        <Text style={styles.sendButtonText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.regenerateAllButton, isGenerating && styles.buttonDisabled]}
          onPress={regenerateAll}
          disabled={isGenerating}
        >
          <Wand2 size={18} color={isGenerating ? '#999999' : '#4ECDC4'} />
          <Text style={[styles.regenerateAllText, isGenerating && styles.buttonTextDisabled]}>
            {isGenerating ? 'Generating...' : 'Regenerate All'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.markSentButton}
          onPress={() => handleMarkAsSent()}
        >
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.markSentText}>Mark as Sent</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  contextInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
  },
  contextSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  channelSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    gap: 8,
    justifyContent: 'center',
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    gap: 6,
  },
  channelChipSelected: {
    backgroundColor: '#000000',
  },
  channelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  channelTextSelected: {
    color: '#FFFFFF',
  },
  toneSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    gap: 8,
  },
  toneChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  toneChipSelected: {
    backgroundColor: '#000000',
  },
  toneText: {
    fontSize: 14,
    color: '#666666',
    textTransform: 'capitalize',
  },
  toneTextSelected: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingIcon: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  copyIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    marginTop: 4,
  },
  messageTextContainer: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantBadge: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  variantBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  editedBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#4ECDC4',
  },
  subjectContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  subjectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  messageBodyContainer: {
    marginBottom: 12,
  },
  messageSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  messageBody: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  editedLabel: {
    fontSize: 12,
    color: '#4ECDC4',
    marginBottom: 8,
  },
  editContainer: {
    marginBottom: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#666666',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4ECDC4',
    borderRadius: 6,
    gap: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },

  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 6,
    gap: 4,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  regenerateAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  regenerateAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  buttonDisabled: {
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  buttonTextDisabled: {
    color: '#999999',
  },
  markSentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    gap: 6,
  },
  markSentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
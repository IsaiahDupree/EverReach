import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { go } from '@/lib/navigation';
import * as ImagePicker from 'expo-image-picker';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useWarmthSettings } from "@/providers/WarmthSettingsProvider";
import { useWarmth } from "@/providers/WarmthProvider";
import { usePeople } from "@/providers/PeopleProvider";
import { 
  Mic,
  Tag,
  Edit,
  Trash2,
  Zap,
  Camera,
  MessageCircle,
  ChevronLeft,
  Paperclip
} from "lucide-react-native";
import { PipelineStages, PipelineThemes, PipelineLabels, ThemeColors } from "@/constants/pipelines";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/providers/ThemeProvider";
import Avatar from "@/components/Avatar";
import { getWarmthColorFromBand, getWarmthColorFromScore } from "@/lib/imageUpload";
import InteractionsTimeline from "@/features/contacts/components/InteractionsTimeline";
import ChannelsCard from "@/features/contacts/components/ChannelsCard";
import GoalSuggestionsCard from "@/features/contacts/components/GoalSuggestionsCard";
import { useContactDetail } from "@/hooks/useContactDetail";
import { ContactChannels } from "@/components/ContactChannels";
import { SocialMediaChannel } from "@/types/socialChannels";
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';

interface ContextSummary {
  last_contact_delta_days: number | null;
  last_topics: string[];
  interests: string[];
  warmth: number | null;
  warmth_band: string | null;
  recent_interactions: {
    id: string;
    type: string;
    created_at: string;
    snippet: string;
  }[];
}

export default function ContactDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { getWarmthStatus } = useWarmthSettings();
  const { getWarmth, refreshWarmth } = useWarmth();
  const { deletePerson, refreshPeople } = usePeople();
  const { theme } = useTheme();
  const [noteInput, setNoteInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('ContactDetail');
  
  const {
    contact,
    interactions,
    goalSuggestions,
    pipelineHistory,
    channels,
    notes,
    files,
    analysis,
    suggestions,
    isLoading,
    isLoadingGoals,
    isLoadingHistory,
    isLoadingNotes,
    isLoadingFiles,
    isLoadingAnalysis,
    isLoadingSuggestions,
    error,
    refetchAll,
  } = useContactDetail(id as string);

  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pipelineState, setPipelineState] = useState<{
    pipeline_key: string | null;
    stage_key: string | null;
    stage_id: string | null;
    allowed_moves: { stage_id: string; stage_key: string; stage_name: string }[];
  } | null>(null);
  const [updatingPipeline, setUpdatingPipeline] = useState(false);

  // Collapsed sticky header controls
  const scrollY = useRef(new Animated.Value(0)).current;
  const COLLAPSE_THRESHOLD = 180;
  const collapsedOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_THRESHOLD - 20, COLLAPSE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const collapsedTranslateY = scrollY.interpolate({
    inputRange: [COLLAPSE_THRESHOLD - 20, COLLAPSE_THRESHOLD, COLLAPSE_THRESHOLD + 1],
    outputRange: [-10, 0, 0],
    extrapolate: 'clamp',
  });

  React.useEffect(() => {
    loadPipelineState();
    loadContextSummary();
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAll(),
        loadPipelineState(),
        loadContextSummary(),
        refreshPeople(),
      ]);
      console.log('[ContactDetail] Data refreshed successfully');
    } catch (error: any) {
      // Handle AbortError gracefully (navigation during refresh)
      if (error.name === 'AbortError') {
        console.log('[ContactDetail] Refresh request aborted (navigation)');
        return;
      }
      console.error('[ContactDetail] Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadPipelineState = async () => {
    try {
      console.log('[ContactDetail] Loading pipeline state for contact:', id);
      const response = await apiFetch(`/api/v1/contacts/${id}/pipeline`, {
        requireAuth: true,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ContactDetail] Pipeline state loaded:', data);
        setPipelineState(data);
      } else {
        console.log('[ContactDetail] Failed to load pipeline state:', response.status);
      }
    } catch (error: any) {
      // Handle AbortError gracefully (navigation or timeout)
      if (error.name === 'AbortError') {
        console.log('[ContactDetail] Pipeline state request aborted (navigation)');
        return;
      }
      console.error('[ContactDetail] Error loading pipeline state:', error);
    }
  };

  const loadContextSummary = async () => {
    try {
      console.log('[ContactDetail] Loading context summary for contact:', id);
      const response = await apiFetch(`/api/v1/contacts/${id}/context-summary`, {
        requireAuth: true,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ContactDetail] Context summary loaded:', data);
        setContextSummary(data);
      } else {
        console.log('[ContactDetail] Failed to load context summary:', response.status);
      }
    } catch (error: any) {
      // Handle AbortError gracefully (navigation or timeout)
      if (error.name === 'AbortError') {
        console.log('[ContactDetail] Context summary request aborted (navigation)');
        return;
      }
      console.error('[ContactDetail] Error loading context summary:', error);
    }
  };

  const handlePipelineChange = async (pipelineKey: string) => {
    if (updatingPipeline) return;
    
    try {
      setUpdatingPipeline(true);
      console.log('[ContactDetail] Changing pipeline to:', pipelineKey);
      
      const response = await apiFetch(`/api/v1/contacts/${id}/pipeline`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ pipeline_key: pipelineKey }),
      });

      if (response.ok) {
        console.log('[ContactDetail] Pipeline changed successfully');
        await loadPipelineState();
      } else {
        const errorText = await response.text();
        console.error('[ContactDetail] Failed to change pipeline:', response.status, errorText);
        alert('Failed to change pipeline. Please try again.');
      }
    } catch (error) {
      console.error('[ContactDetail] Error changing pipeline:', error);
      alert('Failed to change pipeline. Please try again.');
    } finally {
      setUpdatingPipeline(false);
    }
  };

  // Diagnostics + Auto-persist interests when they differ from stored values
  React.useEffect(() => {
    if (!contact || !contextSummary?.interests) return;
    const c: any = contact as any;
    const interestsFromContext: string[] = Array.isArray(contextSummary.interests) ? (contextSummary.interests as string[]) : [];
    const interestsPersisted: string[] = Array.isArray(c?.metadata?.interests)
      ? c.metadata.interests
      : [];
    const socialTop = Array.isArray(c?.social_channels) ? c.social_channels.length : 0;
    const socialMeta = Array.isArray(c?.metadata?.social_channels) ? c.metadata.social_channels.length : 0;
    const preferred = (
      (c?.metadata?.comms?.channelsPreferred as string[] | undefined) ||
      (c?.comms?.channelsPreferred as string[] | undefined) ||
      []
    );
    console.log('[PersistenceReport]', {
      contactId: contact.id,
      tags: contact.tags || [],
      interestsFromContext,
      interestsPersisted,
      socialChannelsTop: socialTop,
      socialChannelsMeta: socialMeta,
      preferredChannels: preferred,
    });

    // Auto-persist interests if they differ
    const normalizedContext = Array.from(new Set(interestsFromContext.map(i => i.trim()))).filter(Boolean).sort();
    const normalizedPersisted = Array.from(new Set(interestsPersisted.map(i => i.trim()))).filter(Boolean).sort();
    
    if (JSON.stringify(normalizedContext) !== JSON.stringify(normalizedPersisted)) {
      console.log('[Contact] Interests changed, persisting:', normalizedContext);
      const timeoutId = setTimeout(async () => {
        try {
          const res = await apiFetch(`/api/v1/contacts/${contact.id}`, {
            method: 'PATCH',
            requireAuth: true,
            body: JSON.stringify({
              metadata: {
                ...c?.metadata,
                interests: normalizedContext,
              },
            }),
          });
          if (res.ok) {
            console.log('[Contact] Interests persisted successfully');
          } else {
            console.error('[Contact] Failed to persist interests:', res.status);
          }
        } catch (error) {
          console.error('[Contact] Error persisting interests:', error);
        }
      }, 1000); // 1s debounce
      return () => clearTimeout(timeoutId);
    }
  }, [contact, contextSummary]);

  const handleStageChange = async (stageId: string) => {
    if (updatingPipeline) return;
    
    try {
      setUpdatingPipeline(true);
      console.log('[ContactDetail] Changing stage to:', stageId);
      
      const response = await apiFetch(`/api/v1/contacts/${id}/pipeline/move`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ stage_id: stageId }),
      });

      if (response.ok) {
        console.log('[ContactDetail] Stage changed successfully');
        await loadPipelineState();
      } else {
        const errorText = await response.text();
        console.error('[ContactDetail] Failed to change stage:', response.status, errorText);
        alert('Failed to change stage. Please try again.');
      }
    } catch (error) {
      console.error('[ContactDetail] Error changing stage:', error);
      alert('Failed to change stage. Please try again.');
    } finally {
      setUpdatingPipeline(false);
    }
  };

  const handleAddNote = async () => {
    if (noteInput.trim() && !saving) {
      try {
        setSaving(true);
        
        const response = await apiFetch(`/api/v1/contacts/${id}/notes`, {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            content: noteInput.trim(),
          }),
        });

        if (response.ok) {
          // Track quick note added
          const currentWarmth = getWarmth(id as string);
          screenAnalytics.track('quick_note_added', {
            contactId: id,
            noteLength: noteInput.trim().length,
            warmthScore: currentWarmth.score,
          });
          
          setNoteInput("");
          noteInputRef.current?.blur();
          Keyboard.dismiss();
          await refetchAll();
        } else {
          console.error('Failed to save note:', response.status);
          analytics.errors.occurred(new Error(`Failed to save note: ${response.status}`), 'ContactDetail');
          alert('Failed to save note. Please try again.');
        }
      } catch (error) {
        console.error('Error saving note:', error);
        analytics.errors.occurred(error as Error, 'ContactDetail');
        alert('Failed to save note. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    const confirmDelete = Platform.OS === 'web' 
      ? confirm(`Are you sure you want to delete ${contact?.display_name}?`)
      : true;

    if (confirmDelete) {
      try {
        console.log('[ContactDetail] Deleting contact:', id);
        
        // Track deletion attempt
        const currentWarmth = getWarmth(id as string);
        screenAnalytics.track('contact_delete_initiated', {
          contactId: id,
          warmthScore: currentWarmth.score,
        });
        
        const response = await apiFetch(`/api/v1/contacts/${id}`, {
          method: 'DELETE',
          requireAuth: true,
        });

        if (response.ok) {
          console.log('[ContactDetail] Contact deleted from backend, updating local state');
          
          // Track successful deletion
          screenAnalytics.track('contact_deleted', {
            contactId: id,
          });
          
          await deletePerson(id as string);
          console.log('[ContactDetail] Local state updated, navigating back');
          go.back();
        } else {
          console.error('[ContactDetail] Failed to delete contact:', response.status);
          analytics.errors.occurred(new Error(`Failed to delete contact: ${response.status}`), 'ContactDetail');
          alert('Failed to delete contact. Please try again.');
        }
      } catch (error) {
        console.error('[ContactDetail] Error deleting contact:', error);
        analytics.errors.occurred(error as Error, 'ContactDetail');
        alert('Failed to delete contact. Please try again.');
      }
    }
  };

  const handleUploadAvatar = async () => {
    try {
      setUploadingAvatar(true);
      
      // Step 1: Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],  // Square crop
        quality: 0.8,
      });

      if (result.canceled) {
        setUploadingAvatar(false);
        return;
      }

      const asset = result.assets[0];
      
      // Step 2: Upload via simplified endpoint
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then(r => r.blob());
        formData.append('avatar', blob, asset.fileName || 'avatar.jpg');
      } else {
        formData.append('avatar', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: asset.fileName || 'avatar.jpg',
        } as any);
      }

      const uploadResponse = await apiFetch(`/api/v1/contacts/${id}/avatar`, {
        method: 'POST',
        requireAuth: true,
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[ContactDetail] Avatar upload failed:', uploadResponse.status, errorText);
        throw new Error('Failed to upload avatar');
      }

      const { photo_url } = await uploadResponse.json();
      console.log('[ContactDetail] Avatar uploaded:', photo_url);

      // Step 3: Refresh data to show new avatar
      await refetchAll();
      
      Alert.alert('Success', 'Profile picture updated!');
      
      // Track analytics
      screenAnalytics.track('contact_avatar_uploaded', {
        contactId: id,
        hasAvatar: true,
      });

    } catch (error) {
      console.error('[ContactDetail] Avatar upload error:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
      analytics.errors.occurred(error as Error, 'ContactDetail');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Contact Not Found</Text>
          {error && <Text style={styles.errorText}>{String(error)}</Text>}
          <Text style={styles.errorHint}>Contact ID: {id as string}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => go.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const themeKey = (pipelineState?.pipeline_key as 'networking' | 'personal' | 'business') || 'networking';
  const themeColors = ThemeColors[themeKey];
  const stages = PipelineStages[themeKey];
  const currentStageKey = pipelineState?.stage_key;
  const warmth = getWarmth(id as string);
  const lastContactDays = contextSummary?.last_contact_delta_days;



  const getWarmthDescription = (status: string) => {
    switch (status) {
      case 'hot': return 'Strong relationship - frequent contact';
      case 'warm': return 'Good relationship - regular contact';
      case 'cool': return 'Moderate relationship - occasional contact';
      case 'cold': return 'Weak relationship - infrequent contact';
      default: return 'No recent interactions';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(120, insets.bottom + 32) }]}
            onScroll={Animated.event([
              { nativeEvent: { contentOffset: { y: scrollY } } }
            ], { useNativeDriver: true })}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
      <View style={[styles.header, { borderBottomColor: themeColors.primary }]}>
        <TouchableOpacity style={styles.backNav} onPress={() => go.back()}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Avatar 
          name={contact.display_name}
          photoUrl={contact.photo_url}
          avatarUrl={contact.avatar_url}
          size={80}
          warmthColor={warmth.color}
          borderWidth={4}
        />
        <Text style={styles.name}>{contact.display_name}</Text>
        {contact.company && (
          <Text style={styles.subtitle}>
            {contact.company}
          </Text>
        )}
        
        {/* Warmth Indicator */}
        <View style={styles.warmthContainer}>
          <View style={[styles.warmthBadge, { backgroundColor: warmth.color }]}>
            <Text style={styles.warmthText}>{warmth.label}</Text>
          </View>
          <View style={styles.warmthDetails}>
            <Text style={styles.warmthScore}>Score: {warmth.score}/100</Text>
            {lastContactDays !== null && lastContactDays !== undefined && (
              <Text style={styles.warmthLastContact}>
                {lastContactDays === 0 ? 'Contacted today' : 
                 lastContactDays === 1 ? 'Last contact: 1 day ago' :
                 `Last contact: ${lastContactDays} days ago`}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Communication Channels with Social Media */}
      <ContactChannels
        contactId={contact.id}
        emails={contact.emails}
        phones={contact.phones}
        socialChannels={(() => {
          const channels = contact.social_channels || (contact as any)?.metadata?.social_channels || [];
          console.log('[ContactDetail] Passing socialChannels to ContactChannels:', channels.length, 'channels');
          console.log('[ContactDetail] Social channels data:', JSON.stringify(channels, null, 2));
          return channels;
        })()}
        preferredChannels={(() => {
          const c = contact as any;
          return (
            (c?.metadata?.comms?.channelsPreferred as string[] | undefined) ||
            (c?.comms?.channelsPreferred as string[] | undefined) ||
            []
          );
        })()}
        onUpdateSocialChannels={async (channels: SocialMediaChannel[]) => {
          try {
            console.log('[ContactDetail] Updating social channels:', JSON.stringify(channels, null, 2));
            
            // Validate each channel has required fields
            const validChannels = channels.filter(ch => {
              const isValid = ch.platform && ch.platform.length >= 2 && 
                             ch.handle && ch.handle.length >= 1 && 
                             ch.url && ch.url.startsWith('http');
              if (!isValid) {
                console.warn('[ContactDetail] Invalid channel filtered out:', ch);
              }
              return isValid;
            });
            
            console.log('[ContactDetail] Valid channels after filtering:', validChannels.length, 'of', channels.length);
            
            // Build payload - always include at least one other field to satisfy backend validation
            // The backend requires "at least one field must be provided" and might strip empty arrays
            const updatePayload: any = {};
            
            // Always include social_channels if we have valid data (top-level)
            updatePayload.social_channels = validChannels;

            // Also mirror into metadata for backend deployments that read from metadata
            const currentMeta = (contact as any)?.metadata || {};
            updatePayload.metadata = {
              ...currentMeta,
              social_channels: validChannels,
            };
            
            // Always include tags as a safety - ensures payload isn't empty
            // Backend won't change tags if they're the same
            if (contact.tags && contact.tags.length > 0) {
              updatePayload.tags = contact.tags;
            } else {
              // Fallback: include empty tags array to ensure we have a field
              updatePayload.tags = [];
            }
            
            // Final safety: Ensure we always have at least one field
            // NOTE: Never write warmth — it is computed server-side by EWMA
            if (Object.keys(updatePayload).length === 0) {
              console.warn('[ContactDetail] Empty payload — skipping PATCH (no changes)');
              return;
            }
            
            console.log('[ContactDetail] Update payload:', JSON.stringify(updatePayload, null, 2));
            console.log('[ContactDetail] Payload has fields:', Object.keys(updatePayload).length);
            
            const response = await apiFetch(`/api/v1/contacts/${contact.id}`, {
              method: 'PATCH',
              requireAuth: true,
              body: JSON.stringify(updatePayload),
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              // Log response details for debugging
              console.error('[ContactDetail] Response not OK:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
              });
              
              // Try to get error details from response
              let errorData: any = null;
              const contentType = response.headers.get('content-type');
              
              try {
                if (contentType?.includes('application/json')) {
                  errorData = await response.json();
                  console.error('[ContactDetail] Backend JSON error:', errorData);
                } else {
                  const text = await response.text();
                  console.error('[ContactDetail] Backend text error:', text);
                  errorData = { error: text };
                }
              } catch (parseError) {
                console.error('[ContactDetail] Error parsing response:', parseError);
              }
              
              // Throw error with details if available
              const errorMsg = errorData?.error || `Failed to update social channels (${response.status})`;
              const error: any = new Error(errorMsg);
              error.status = response.status;
              if (errorData?.details) {
                error.details = errorData.details;
                console.error('[ContactDetail] Validation details:', JSON.stringify(errorData.details, null, 2));
              }
              throw error;
            }
            
            console.log('[ContactDetail] Data refreshed successfully');
          } catch (error) {
            console.error('[ContactDetail] Error updating social channels:', error);
            alert('Failed to update social channels. Please try again.');
          }
        }}
        onSetPreferredChannel={async (platform: string) => {
          try {
            const c: any = contact;
            const current: string[] =
              (c?.metadata?.comms?.channelsPreferred as string[] | undefined) ||
              (c?.comms?.channelsPreferred as string[] | undefined) ||
              [];
            const socialPlatforms = ['instagram','twitter','linkedin','facebook','whatsapp','telegram','tiktok','snapchat','youtube','threads','pinterest','twitch','discord','custom'];
            const nonSocial = current.filter((p) => !socialPlatforms.includes(p));
            const next = Array.from(new Set([...nonSocial, platform]));

            const existingMeta = c?.metadata || {};
            const nextMeta = {
              ...existingMeta,
              comms: {
                ...(existingMeta.comms || {}),
                channelsPreferred: next,
              },
            };

            const res = await apiFetch(`/api/v1/contacts/${contact.id}`, {
              method: 'PATCH',
              requireAuth: true,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metadata: nextMeta }),
            });
            if (!res.ok) throw new Error(`Set preferred channel failed: ${res.status}`);
            await refetchAll();
          } catch (e: any) {
            console.error('[ContactDetail] Set preferred failed:', e?.message || e);
            alert('Failed to set preferred channel. Please try again.');
          }
        }}
      />

      {/* Social media rows are rendered inside ContactChannels; no separate section */}

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => {
            screenAnalytics.track('action_button_pressed', {
              contactId: contact.id,
              action: 'voice_note',
              warmthScore: warmth.score,
            });
            router.push(`/voice-note?personId=${contact.id}&personName=${encodeURIComponent(contact.display_name)}`);
          }}
        >
          <View style={[styles.quickActionIconContainer, { backgroundColor: '#8B5CF6' }]}>
            <Mic size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Voice Note</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => {
            screenAnalytics.track('action_button_pressed', {
              contactId: contact.id,
              action: 'screenshot',
              warmthScore: warmth.score,
            });
            router.push(`/screenshot-analysis?personId=${contact.id}`);
          }}
        >
          <View style={[styles.quickActionIconContainer, { backgroundColor: '#EC4899' }]}>
            <Camera size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Screenshot</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => {
            screenAnalytics.track('action_button_pressed', {
              contactId: contact.id,
              action: 'ask_ai',
              warmthScore: warmth.score,
            });
            router.push(`/chat?prompt=${encodeURIComponent(`Tell me more about ${contact.display_name}`)}}`);
          }}
        >
          <View style={[styles.quickActionIconContainer, { backgroundColor: '#3B82F6' }]}>
            <MessageCircle size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.quickActionLabel}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* Theme & Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pipeline Theme</Text>
        <View style={styles.themeRow}>
          {PipelineThemes.map((t) => (
            <TouchableOpacity
              key={t}
              testID={`theme-${t}`}
              style={[styles.themeChip, themeKey === t && { backgroundColor: ThemeColors[t].primary }]}
              onPress={() => handlePipelineChange(t)}
              disabled={updatingPipeline}
            >
              <Text style={[styles.themeChipText, themeKey === t && { color: '#FFFFFF' }]}>
                {PipelineLabels[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          {pipelineState?.allowed_moves && pipelineState.allowed_moves.length > 0 ? (
            pipelineState.allowed_moves.map((move) => {
              const selected = currentStageKey === move.stage_key;
              return (
                <TouchableOpacity
                  key={move.stage_id}
                  testID={`status-${move.stage_key}`}
                  style={[styles.statusChip, selected && { backgroundColor: themeColors.primary }]}
                  onPress={() => handleStageChange(move.stage_id)}
                  disabled={updatingPipeline}
                >
                  <Text style={[styles.statusChipText, selected && { color: '#FFFFFF' }]}>{move.stage_name}</Text>
                </TouchableOpacity>
              );
            })
          ) : (
            stages.map((stage) => (
              <View key={stage} style={styles.statusChip}>
                <Text style={styles.statusChipText}>{stage}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Craft Message Button */}
      <View style={styles.craftMessageSection}>
        <TouchableOpacity 
          style={[styles.craftMessageButton, { backgroundColor: themeColors.primary }]}
          onPress={() => router.push(`/goal-picker?personId=${contact.id}&channel=sms`)}
        >
          <Zap size={20} color="#FFFFFF" />
          <Text style={styles.craftMessageButtonText}>Craft Message</Text>
        </TouchableOpacity>
      </View>

      {/* AI Goal Suggestions */}
      <GoalSuggestionsCard
        suggestions={goalSuggestions}
        contactId={contact.id}
        loading={isLoadingGoals}
        onRefresh={refetchAll}
      />

      {/* Context Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context Summary</Text>
        <TouchableOpacity 
          style={styles.contextSummary}
          onPress={() => router.push(`/contact-context/${contact.id}`)}
        >
          <View style={styles.warmthStatusRow}>
            <Text style={styles.warmthStatusLabel}>Relationship Status:</Text>
            <Text style={styles.warmthStatusValue}>{getWarmthDescription(warmth.band)}</Text>
          </View>
          
          {contextSummary?.last_topics && contextSummary.last_topics.length > 0 && (
            <View style={styles.contextSection}>
              <Text style={styles.contextSubtitle}>Recent Topics:</Text>
              {contextSummary.last_topics.map((topic, index) => (
                <Text key={index} style={styles.contextBullet}>• {topic}</Text>
              ))}
            </View>
          )}
          
          {(() => {
            const c: any = contact as any;
            const interests: string[] = (contextSummary?.interests || c?.metadata?.interests || []) as string[];
            return interests.length > 0 ? (
              <View style={styles.contextSection}>
                <Text style={styles.contextSubtitle}>Interests & Tags:</Text>
                <View style={styles.contextChips}>
                  {interests.map((interest: string) => (
                    <View key={`interest-${interest}`} style={styles.contextChip}>
                      <Text style={styles.contextChipText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null;
          })()}
          
          <View style={styles.contextBullets}>
            <Text style={styles.contextBullet}>• Tap to view full context</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Recent Interactions Timeline */}
      {interactions.length > 0 && (
        <InteractionsTimeline
          interactions={interactions}
          contactId={contact.id}
          maxItems={10}
        />
      )}

      {/* Notes skeleton */}
      {isLoadingNotes && (
        <View style={styles.section}>
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '70%' }]} />
        </View>
      )}

      {/* Add Note */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Note</Text>
        <View style={styles.noteInputContainer}>
          <CrossPlatformTextInput
            ref={noteInputRef}
            style={styles.noteInput}
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder="Add a note about this contact..."
            placeholderTextColor="#999999"
            multiline
            returnKeyType="done"
            blurOnSubmit={true}
            autoCapitalize="sentences"
            autoCorrect={true}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleAddNote();
            }}
          />
          <TouchableOpacity 
            style={[styles.addNoteButton, (!noteInput.trim() || saving) && { opacity: 0.5 }]}
            onPress={handleAddNote}
            disabled={!noteInput.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.addNoteButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Pipeline History removed */}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagContainer}>
            {contact.tags.map((tag) => (
              <View key={`tag-${tag}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Interests */}
      {(() => {
        const c: any = contact as any;
        const interestsToShow: string[] = (contextSummary?.interests || c?.metadata?.interests || []) as string[];
        return interestsToShow.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.contextChips}>
              {Array.from(new Set(interestsToShow)).map((interest: string) => (
                <View key={`interest-${interest}`} style={styles.contextChip}>
                  <Text style={styles.contextChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null;
      })()}

      {/* Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            console.log('[ContactDetail] Edit button pressed for contact:', contact.id);
            try {
              screenAnalytics.track('contact_edit_initiated', {
                contactId: contact.id,
                warmthScore: warmth.score,
              });
            } catch (error) {
              console.warn('[ContactDetail] Analytics error:', error);
            }
            console.log('[ContactDetail] Navigating to edit screen');
            router.push(`/add-contact?editId=${contact.id}`);
          }}
          activeOpacity={0.7}
        >
          <Edit size={20} color="#000000" />
          <Text style={styles.editButtonText}>Edit Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={20} color="#FF6B6B" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
          </Animated.ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Sticky collapsed header with back + compact info + CTA */}
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            opacity: collapsedOpacity,
            transform: [{ translateY: collapsedTranslateY }],
          },
        ]}
      >
        <View style={styles.stickyRow}>
          <TouchableOpacity style={styles.stickyBack} onPress={() => go.back()}>
            <ChevronLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.stickyAvatarWrap}>
            <Avatar
              name={contact.display_name}
              photoUrl={contact.photo_url}
              avatarUrl={contact.avatar_url}
              size={28}
              warmthColor={warmth.color}
              borderWidth={2}
            />
          </View>

          <View style={styles.stickyInfo}>
            <Text numberOfLines={1} style={[styles.stickyTitle, { color: theme.colors.text }]}>
              {contact.display_name}
            </Text>
            <Text numberOfLines={1} style={[styles.stickySub, { color: theme.colors.textSecondary }]}>
              Score: {warmth.score}/100{currentStageKey ? ` • ${currentStageKey}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.stickyCTA, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push(`/goal-picker?personId=${contact.id}&channel=sms`)}
            activeOpacity={0.9}
          >
            <Text style={[styles.stickyCTAText, { color: theme.colors.surface }]}>Craft</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  stickyBack: {
    padding: 6,
  },
  stickyAvatarWrap: {
    marginRight: 6,
  },
  stickyInfo: {
    flex: 1,
  },
  stickyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stickySub: {
    fontSize: 12,
    fontWeight: '500',
  },
  stickyCTA: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  stickyCTAText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
  },
  backNav: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 5,
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.8)'
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  warmthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  warmthDetails: {
    flexDirection: 'column',
    gap: 4,
  },
  warmthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warmthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warmthScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  warmthLastContact: {
    fontSize: 12,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  craftMessageSection: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionsSection: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    marginHorizontal: 16,
    gap: 12,
    justifyContent: 'space-around',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  themeChipText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  statusRow: {
    gap: 8,
    paddingVertical: 4,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  statusChipText: {
    fontSize: 13,
    color: '#000000',
  },
  craftMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  craftMessageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contextSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  warmthStatusRow: {
    marginBottom: 12,
  },
  warmthStatusLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  warmthStatusValue: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  contextSection: {
    marginBottom: 12,
  },
  contextSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
    fontWeight: '500',
  },
  contextBullets: {
    marginBottom: 12,
  },
  contextBullet: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 20,
  },
  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contextChip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contextChipText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  fileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileMeta: {
    flexDirection: 'column',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  fileSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  skeletonRow: {
    height: 16,
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonText: {
    height: 12,
    backgroundColor: '#EEF2F7',
    borderRadius: 6,
    marginBottom: 8,
    width: '90%',
  },
  noteRow: {
    paddingVertical: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  noteSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontSize: 14,
    color: '#666666',
  },
  noteInputContainer: {
    gap: 12,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addNoteButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

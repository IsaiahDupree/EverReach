/**
 * sun-profile.tsx
 *
 * User sun profile settings screen.
 * Allows configuration of:
 * - Goal mode (Balanced, Circadian, Vitamin D, Tanning-Aware)
 * - Skin sensitivity (Very Fair, Fair, Medium, Olive, Dark)
 * - Default modifiers (shade, skin exposure, sunscreen)
 * - Morning window hours
 * - Daily target dose
 * - Notifications enabled
 *
 * Saves to user_sun_profile table.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActionSheetIOS,
  Alert,
  Dimensions,
} from 'react-native';
import { ChevronDown, Save, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { useAuth } from '@/providers/AuthProviderV2';
import {
  SHADE_FACTORS,
  EXPOSURE_FACTORS,
  PROTECTION_FACTORS,
  ShadeFactor,
  ExposureFactor,
  ProtectionFactor,
} from '@/services/sunDoseCalculator';

interface UserSunProfile {
  user_id: string;
  goal_mode: 'balanced' | 'circadian' | 'vitamin_d' | 'tanning_aware';
  skin_sensitivity: 'very_fair' | 'fair' | 'medium' | 'olive' | 'dark';
  default_shade: ShadeFactor;
  default_exposure: ExposureFactor;
  default_protection: ProtectionFactor;
  morning_window_hours: number;
  daily_target_dose: number;
  notifications_enabled: boolean;
  updated_at: string;
}

const GOAL_MODE_OPTIONS = [
  { label: 'Balanced', value: 'balanced', description: 'Mix of UV, morning light, and risk' },
  { label: 'Circadian', value: 'circadian', description: 'Prioritize morning light exposure' },
  { label: 'Vitamin D', value: 'vitamin_d', description: 'Optimize for vitamin D synthesis' },
  { label: 'Tanning-Aware', value: 'tanning_aware', description: 'Track cumulative skin burden' },
];

const SKIN_SENSITIVITY_OPTIONS = [
  { label: 'Very Fair', value: 'very_fair', description: 'Very light skin, always burns' },
  { label: 'Fair', value: 'fair', description: 'Light skin, burns easily' },
  { label: 'Medium', value: 'medium', description: 'Medium skin, typical tanning' },
  { label: 'Olive', value: 'olive', description: 'Olive/tan skin, tans easily' },
  { label: 'Dark', value: 'dark', description: 'Dark skin, rarely burns' },
];

const SHADE_OPTIONS = [
  { label: 'Full Sun', value: 'full_sun' as ShadeFactor },
  { label: 'Partial Sun', value: 'partial_sun' as ShadeFactor },
  { label: 'Open Shade', value: 'open_shade' as ShadeFactor },
  { label: 'Deep Shade', value: 'deep_shade' as ShadeFactor },
];

const EXPOSURE_OPTIONS = [
  { label: 'Face & Hands', value: 'face_hands' as ExposureFactor },
  { label: 'Face & Forearms', value: 'face_forearms' as ExposureFactor },
  { label: 'Arms & Legs', value: 'arms_legs' as ExposureFactor },
  { label: 'Shorts & Tee', value: 'shorts_tshirt' as ExposureFactor },
  { label: 'Swimwear', value: 'swimwear' as ExposureFactor },
];

const PROTECTION_OPTIONS = [
  { label: 'None', value: 'none' as ProtectionFactor },
  { label: 'SPF 15', value: 'spf_15' as ProtectionFactor },
  { label: 'SPF 30', value: 'spf_30' as ProtectionFactor },
  { label: 'SPF 50+', value: 'spf_50' as ProtectionFactor },
  { label: 'Covered', value: 'covered' as ProtectionFactor },
];

export default function SunProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserSunProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('user_sun_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (err && err.code !== 'PGRST116') {
        throw err;
      }

      if (data) {
        setProfile(data as UserSunProfile);
      } else {
        // Create default profile if it doesn't exist
        const defaultProfile: UserSunProfile = {
          user_id: user.id,
          goal_mode: 'balanced',
          skin_sensitivity: 'medium',
          default_shade: 'full_sun',
          default_exposure: 'shorts_tshirt',
          default_protection: 'none',
          morning_window_hours: 3,
          daily_target_dose: 100,
          notifications_enabled: true,
          updated_at: new Date().toISOString(),
        };

        const { data: created, error: createErr } = await supabase
          .from('user_sun_profile')
          .insert([defaultProfile])
          .select()
          .single();

        if (createErr) throw createErr;
        setProfile(created as UserSunProfile);
      }
    } catch (err) {
      console.error('[SunProfile] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(async () => {
    if (!profile || !user?.id) return;

    try {
      setSaving(true);
      setError(null);

      const { error: err } = await supabase
        .from('user_sun_profile')
        .upsert({
          ...profile,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (err) throw err;

      Alert.alert('Success', 'Profile saved successfully');
    } catch (err) {
      console.error('[SunProfile] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [profile, user?.id]);

  const showGoalModePicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', ...GOAL_MODE_OPTIONS.map(opt => opt.label)],
        cancelButtonIndex: 0,
        title: 'Select Goal Mode',
      },
      (index) => {
        if (index > 0 && profile) {
          setProfile({
            ...profile,
            goal_mode: GOAL_MODE_OPTIONS[index - 1].value as any,
          });
        }
      }
    );
  };

  const showSkinSensitivityPicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', ...SKIN_SENSITIVITY_OPTIONS.map(opt => opt.label)],
        cancelButtonIndex: 0,
        title: 'Select Skin Sensitivity',
      },
      (index) => {
        if (index > 0 && profile) {
          setProfile({
            ...profile,
            skin_sensitivity: SKIN_SENSITIVITY_OPTIONS[index - 1].value as any,
          });
        }
      }
    );
  };

  const showShadePicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', ...SHADE_OPTIONS.map(opt => opt.label)],
        cancelButtonIndex: 0,
        title: 'Default Shade Level',
      },
      (index) => {
        if (index > 0 && profile) {
          setProfile({
            ...profile,
            default_shade: SHADE_OPTIONS[index - 1].value,
          });
        }
      }
    );
  };

  const showExposurePicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', ...EXPOSURE_OPTIONS.map(opt => opt.label)],
        cancelButtonIndex: 0,
        title: 'Default Skin Exposure',
      },
      (index) => {
        if (index > 0 && profile) {
          setProfile({
            ...profile,
            default_exposure: EXPOSURE_OPTIONS[index - 1].value,
          });
        }
      }
    );
  };

  const showProtectionPicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', ...PROTECTION_OPTIONS.map(opt => opt.label)],
        cancelButtonIndex: 0,
        title: 'Default Sunscreen Protection',
      },
      (index) => {
        if (index > 0 && profile) {
          setProfile({
            ...profile,
            default_protection: PROTECTION_OPTIONS[index - 1].value,
          });
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sun Profile</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sun Profile</Text>
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </View>
    );
  }

  const goalModeOption = GOAL_MODE_OPTIONS.find(opt => opt.value === profile.goal_mode);
  const skinSensitivityOption = SKIN_SENSITIVITY_OPTIONS.find(opt => opt.value === profile.skin_sensitivity);
  const shadeOption = SHADE_OPTIONS.find(opt => opt.value === profile.default_shade);
  const exposureOption = EXPOSURE_OPTIONS.find(opt => opt.value === profile.default_exposure);
  const protectionOption = PROTECTION_OPTIONS.find(opt => opt.value === profile.default_protection);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sun Profile</Text>

      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Goal Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goal Mode</Text>
        <Text style={styles.sectionDescription}>
          How should your dose engine prioritize daily metrics?
        </Text>
        <TouchableOpacity style={styles.picker} onPress={showGoalModePicker}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerLabel}>{goalModeOption?.label}</Text>
            <Text style={styles.pickerDescription}>{goalModeOption?.description}</Text>
          </View>
          <ChevronDown size={20} color={SUNTRACE_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Skin Sensitivity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skin Sensitivity</Text>
        <Text style={styles.sectionDescription}>
          Used to adjust overexposure thresholds and burn risk estimates.
        </Text>
        <TouchableOpacity style={styles.picker} onPress={showSkinSensitivityPicker}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerLabel}>{skinSensitivityOption?.label}</Text>
            <Text style={styles.pickerDescription}>{skinSensitivityOption?.description}</Text>
          </View>
          <ChevronDown size={20} color={SUNTRACE_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Default Modifiers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Modifiers</Text>
        <Text style={styles.sectionDescription}>
          Default values for new sessions when you don't manually adjust them.
        </Text>

        {/* Default Shade */}
        <TouchableOpacity style={styles.picker} onPress={showShadePicker}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerLabel}>Shade: {shadeOption?.label}</Text>
          </View>
          <ChevronDown size={20} color={SUNTRACE_COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Default Exposure */}
        <TouchableOpacity style={[styles.picker, styles.pickerSpaced]} onPress={showExposurePicker}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerLabel}>Exposure: {exposureOption?.label}</Text>
          </View>
          <ChevronDown size={20} color={SUNTRACE_COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Default Protection */}
        <TouchableOpacity style={[styles.picker, styles.pickerSpaced]} onPress={showProtectionPicker}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerLabel}>Protection: {protectionOption?.label}</Text>
          </View>
          <ChevronDown size={20} color={SUNTRACE_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Morning Window Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Morning Light Window</Text>
        <Text style={styles.sectionDescription}>
          How many hours after sunrise counts as "morning light"?
        </Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => {
              if (profile.morning_window_hours > 1) {
                setProfile({
                  ...profile,
                  morning_window_hours: profile.morning_window_hours - 1,
                });
              }
            }}
          >
            <Text style={styles.adjustButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{profile.morning_window_hours} hours</Text>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => {
              if (profile.morning_window_hours < 12) {
                setProfile({
                  ...profile,
                  morning_window_hours: profile.morning_window_hours + 1,
                });
              }
            }}
          >
            <Text style={styles.adjustButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily Target Dose */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Target Dose</Text>
        <Text style={styles.sectionDescription}>
          Your goal UV dose score per day (in IU equivalent units).
        </Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => {
              if (profile.daily_target_dose > 25) {
                setProfile({
                  ...profile,
                  daily_target_dose: profile.daily_target_dose - 25,
                });
              }
            }}
          >
            <Text style={styles.adjustButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{profile.daily_target_dose} IU</Text>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => {
              if (profile.daily_target_dose < 400) {
                setProfile({
                  ...profile,
                  daily_target_dose: profile.daily_target_dose + 25,
                });
              }
            }}
          >
            <Text style={styles.adjustButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Toggle */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Text style={styles.sectionDescription}>
              Receive alerts about UV windows and dose progress.
            </Text>
          </View>
          <Switch
            value={profile.notifications_enabled}
            onValueChange={(value) => {
              setProfile({
                ...profile,
                notifications_enabled: value,
              });
            }}
            trackColor={{ false: '#404855', true: SUNTRACE_COLORS.primary + '40' }}
            thumbColor={profile.notifications_enabled ? SUNTRACE_COLORS.primary : '#64748B'}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveProfile}
        disabled={saving}
      >
        <Save size={20} color="#000" />
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: SUNTRACE_COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#ef4444',
    flex: 1,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: SUNTRACE_COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerSpaced: {
    marginTop: 10,
  },
  pickerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
  },
  pickerDescription: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  adjustButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: SUNTRACE_COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: SUNTRACE_COLORS.primary,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SUNTRACE_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

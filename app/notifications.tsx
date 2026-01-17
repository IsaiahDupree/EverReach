import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Bell, 
  Clock,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Volume2,
  VolumeX,
  X,
  Check
} from 'lucide-react-native';
import { useAppSettings, type Theme } from '@/providers/AppSettingsProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';

type NotificationFrequency = 'daily' | 'weekly' | 'monthly';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('Notifications');
  
  const [pushNotifications, setPushNotifications] = React.useState<boolean>(true);
  const [coldContactAlerts, setColdContactAlerts] = React.useState<boolean>(true);
  const [reminderFrequency, setReminderFrequency] = React.useState<NotificationFrequency>('weekly');
  const [quietHours, setQuietHours] = React.useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState<boolean>(true);
  const [showFrequencyModal, setShowFrequencyModal] = React.useState<boolean>(false);

  const handleFrequencyChange = () => {
    setShowFrequencyModal(true);
  };

  const handleFrequencySelect = (frequency: NotificationFrequency) => {
    if (!frequency || !frequency.trim()) return;
    if (frequency.length > 20) return;
    const sanitizedFrequency = frequency.trim() as NotificationFrequency;
    
    screenAnalytics.track('notifications_frequency_changed', {
      frequency: sanitizedFrequency,
      previousFrequency: reminderFrequency,
    });
    
    setReminderFrequency(sanitizedFrequency);
    setShowFrequencyModal(false);
  };


  const getFrequencyDisplayText = () => {
    switch (reminderFrequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return 'Weekly';
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.sectionContent}>
            <View style={[styles.settingItem, styles.settingItemBorder]}>
              <View style={styles.settingLeft}>
                <Bell size={20} color={theme.colors.text} />
                <View>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive notifications on this device</Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={(value) => {
                  screenAnalytics.track('notifications_push_toggled', {
                    enabled: value,
                  });
                  setPushNotifications(value);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Moon size={20} color={theme.colors.text} />
                <View>
                  <Text style={styles.settingLabel}>Cold Contact Alerts</Text>
                  <Text style={styles.settingSubtitle}>Get notified when connections are cooling down</Text>
                </View>
              </View>
              <Switch
                value={coldContactAlerts}
                onValueChange={(value) => {
                  screenAnalytics.track('notifications_cold_alerts_toggled', {
                    enabled: value,
                  });
                  setColdContactAlerts(value);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Reminder Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.settingItemBorder]}
              onPress={handleFrequencyChange}
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Clock size={20} color={theme.colors.text} />
                <View>
                  <Text style={styles.settingLabel}>Frequency</Text>
                  <Text style={styles.settingSubtitle}>{getFrequencyDisplayText()}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.settingItem, styles.settingItemBorder]}>
              <View style={styles.settingLeft}>
                <Sun size={20} color={theme.colors.text} />
                <View>
                  <Text style={styles.settingLabel}>Quiet Hours</Text>
                  <Text style={styles.settingSubtitle}>No notifications 10 PM - 8 AM</Text>
                </View>
              </View>
              <Switch
                value={quietHours}
                onValueChange={(value) => {
                  screenAnalytics.track('notifications_quiet_hours_toggled', {
                    enabled: value,
                  });
                  setQuietHours(value);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            
            <View style={[styles.settingItem, styles.settingItemBorder]}>
              <View style={styles.settingLeft}>
                {soundEnabled ? (
                  <Volume2 size={20} color={theme.colors.text} />
                ) : (
                  <VolumeX size={20} color={theme.colors.text} />
                )}
                <View>
                  <Text style={styles.settingLabel}>Sound</Text>
                  <Text style={styles.settingSubtitle}>Play sound for notifications</Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={(value) => {
                  screenAnalytics.track('notifications_sound_toggled', {
                    enabled: value,
                  });
                  setSoundEnabled(value);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Smartphone size={20} color={theme.colors.text} />
                <View>
                  <Text style={styles.settingLabel}>Vibration</Text>
                  <Text style={styles.settingSubtitle}>Vibrate for notifications</Text>
                </View>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={(value) => {
                  screenAnalytics.track('notifications_vibration_toggled', {
                    enabled: value,
                  });
                  setVibrationEnabled(value);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Notifications help you maintain warm relationships by reminding you to stay connected.
          </Text>
        </View>
      </ScrollView>

      {/* Frequency Selection Modal */}
      <Modal
        visible={showFrequencyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFrequencyModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFrequencyModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>When do you want reminders?</Text>
              <TouchableOpacity 
                onPress={() => setShowFrequencyModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity 
                style={[
                  styles.modalOption,
                  reminderFrequency === 'daily' && styles.modalOptionSelected
                ]}
                onPress={() => handleFrequencySelect('daily')}
              >
                <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionTitle,
                    reminderFrequency === 'daily' && styles.modalOptionTitleSelected
                  ]}>Daily</Text>
                  <Text style={[
                    styles.modalOptionSubtitle,
                    reminderFrequency === 'daily' && styles.modalOptionSubtitleSelected
                  ]}>Get reminded every day</Text>
                </View>
                {reminderFrequency === 'daily' && (
                  <Check size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalOption,
                  reminderFrequency === 'weekly' && styles.modalOptionSelected
                ]}
                onPress={() => handleFrequencySelect('weekly')}
              >
                <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionTitle,
                    reminderFrequency === 'weekly' && styles.modalOptionTitleSelected
                  ]}>Weekly</Text>
                  <Text style={[
                    styles.modalOptionSubtitle,
                    reminderFrequency === 'weekly' && styles.modalOptionSubtitleSelected
                  ]}>Get reminded once a week</Text>
                </View>
                {reminderFrequency === 'weekly' && (
                  <Check size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalOption,
                  reminderFrequency === 'monthly' && styles.modalOptionSelected
                ]}
                onPress={() => handleFrequencySelect('monthly')}
              >
                <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionTitle,
                    reminderFrequency === 'monthly' && styles.modalOptionTitleSelected
                  ]}>Monthly</Text>
                  <Text style={[
                    styles.modalOptionSubtitle,
                    reminderFrequency === 'monthly' && styles.modalOptionSubtitleSelected
                  ]}>Get reminded once a month</Text>
                </View>
                {reminderFrequency === 'monthly' && (
                  <Check size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowFrequencyModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalOptions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  modalOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalOptionTitleSelected: {
    color: theme.colors.primary,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modalOptionSubtitleSelected: {
    color: theme.colors.primary + 'CC',
  },
  cancelButton: {
    padding: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
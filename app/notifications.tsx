import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Bell, 
  Clock,
  Calendar,
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

type NotificationFrequency = 'daily' | 'weekly' | 'custom';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  
  const [pushNotifications, setPushNotifications] = React.useState<boolean>(true);
  const [coldContactAlerts, setColdContactAlerts] = React.useState<boolean>(true);
  const [reminderFrequency, setReminderFrequency] = React.useState<NotificationFrequency>('weekly');
  const [quietHours, setQuietHours] = React.useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState<boolean>(true);
  const [weeklyGoal, setWeeklyGoal] = React.useState<number>(2);
  const [goldGoal, setGoldGoal] = React.useState<number>(5);
  const [showFrequencyModal, setShowFrequencyModal] = React.useState<boolean>(false);

  const handleFrequencyChange = () => {
    setShowFrequencyModal(true);
  };

  const handleFrequencySelect = (frequency: NotificationFrequency) => {
    if (!frequency || !frequency.trim()) return;
    if (frequency.length > 20) return;
    const sanitizedFrequency = frequency.trim() as NotificationFrequency;
    setReminderFrequency(sanitizedFrequency);
    setShowFrequencyModal(false);
  };

  const handleGoalChange = (type: 'weekly' | 'gold') => {
    const title = type === 'weekly' ? 'Weekly Goal' : 'Gold Streak Goal';
    const message = type === 'weekly' 
      ? 'How many people do you want to stay connected with weekly?'
      : 'How many people for a gold streak?';
    
    const options = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => ({
      text: `${num} ${num === 1 ? 'person' : 'people'}`,
      onPress: () => type === 'weekly' ? setWeeklyGoal(num) : setGoldGoal(num),
    }));

    const buttons = [
      { text: 'Cancel', style: 'cancel' as const },
      ...options,
    ];
    
    if (Platform.OS !== 'web') {
      Alert.alert(title, message, buttons);
    } else {
      console.log(`Goal change requested: ${type}`);
    }
  };

  const getFrequencyDisplayText = () => {
    switch (reminderFrequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'custom': return 'Custom';
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
                onValueChange={setPushNotifications}
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
                onValueChange={setColdContactAlerts}
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
                onValueChange={setQuietHours}
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
                onValueChange={setSoundEnabled}
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
                onValueChange={setVibrationEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Goals & Streaks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals & Streaks</Text>
          <View style={styles.sectionContent}>
            <View style={styles.goalExplanation}>
              <Text style={styles.goalExplanationText}>
                Keep a {weeklyGoal}-person streak weekly to stay green.
              </Text>
              <Text style={styles.goalExplanationText}>
                {goldGoal}-person streak unlocks gold.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.settingItem, styles.settingItemBorder]}
              onPress={() => handleGoalChange('weekly')}
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Calendar size={20} color={theme.colors.success} />
                <View>
                  <Text style={styles.settingLabel}>Weekly Goal</Text>
                  <Text style={styles.settingSubtitle}>{weeklyGoal} {weeklyGoal === 1 ? 'person' : 'people'} per week</Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => handleGoalChange('gold')}
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Calendar size={20} color="#FFD700" />
                <View>
                  <Text style={styles.settingLabel}>Gold Streak Goal</Text>
                  <Text style={styles.settingSubtitle}>{goldGoal} {goldGoal === 1 ? 'person' : 'people'} for gold</Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
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
                  reminderFrequency === 'custom' && styles.modalOptionSelected
                ]}
                onPress={() => handleFrequencySelect('custom')}
              >
                <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionTitle,
                    reminderFrequency === 'custom' && styles.modalOptionTitleSelected
                  ]}>Custom</Text>
                  <Text style={[
                    styles.modalOptionSubtitle,
                    reminderFrequency === 'custom' && styles.modalOptionSubtitleSelected
                  ]}>Set your own schedule</Text>
                </View>
                {reminderFrequency === 'custom' && (
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
  goalExplanation: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  goalExplanationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
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
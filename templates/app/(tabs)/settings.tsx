/**
 * APP-KIT: Settings Screen
 * 
 * ✅ KEEP: Account, subscription, logout sections
 * 🔧 CUSTOMIZE: Add/remove settings for your app
 */
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { User, CreditCard, Bell, Moon, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { APP_CONFIG } from '@/constants/config';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPro, tier } = useSubscription();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Dev Mode Hint */}
      {APP_CONFIG.DEV_MODE && (
        <View style={styles.devHint}>
          <Text style={styles.devHintText}>🔧 APP-KIT: Customize settings options</Text>
          <Text style={styles.devHintFile}>File: app/(tabs)/settings.tsx</Text>
        </View>
      )}

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.row} onPress={() => router.push('/profile')}>
          <View style={styles.rowLeft}>
            <User color="#6B7280" size={20} />
            <Text style={styles.rowText}>Profile</Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/paywall')}>
          <View style={styles.rowLeft}>
            <CreditCard color="#6B7280" size={20} />
            <Text style={styles.rowText}>Subscription</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{isPro ? 'PRO' : 'FREE'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Preferences Section - CUSTOMIZE THIS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Bell color="#6B7280" size={20} />
            <Text style={styles.rowText}>Notifications</Text>
          </View>
          <Switch value={true} />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Moon color="#6B7280" size={20} />
            <Text style={styles.rowText}>Dark Mode</Text>
          </View>
          <Switch value={false} />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.row} onPress={() => router.push('/privacy')}>
          <View style={styles.rowLeft}>
            <Shield color="#6B7280" size={20} />
            <Text style={styles.rowText}>Privacy Policy</Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/help')}>
          <View style={styles.rowLeft}>
            <HelpCircle color="#6B7280" size={20} />
            <Text style={styles.rowText}>Help & FAQ</Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#EF4444" size={20} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>
        {APP_CONFIG.APP_NAME} v{APP_CONFIG.APP_VERSION}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  devHint: { backgroundColor: '#8B5CF6', padding: 12 },
  devHintText: { color: 'white', fontSize: 14, fontWeight: '600' },
  devHintFile: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'monospace', marginTop: 4 },
  section: { backgroundColor: 'white', marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600', paddingVertical: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 16, color: '#111827' },
  badge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, padding: 16 },
  logoutText: { fontSize: 16, color: '#EF4444', fontWeight: '600' },
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 8, marginBottom: 40 },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Sun, Clock, Shield } from 'lucide-react-native';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { getUVCategory } from '@/services/uvCalculations';

export default function SessionSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    duration: string;
    uv: string;
    d_earned: string;
    risk: string;
  }>();

  const duration = parseFloat(params.duration ?? '0');
  const uv = parseFloat(params.uv ?? '0');
  const dEarned = parseInt(params.d_earned ?? '0', 10);
  const risk = params.risk ?? 'low';
  const uvCat = getUVCategory(uv);

  return (
    <View style={styles.container}>
      <View style={styles.checkIcon}>
        <CheckCircle size={64} color={SUNTRACE_COLORS.accent} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Session Complete!</Text>
      <Text style={styles.subtitle}>Great work building your vitamin D today.</Text>

      <View style={styles.statsGrid}>
        <StatBlock icon={<Clock size={24} color={SUNTRACE_COLORS.primary} />}
          label="Duration" value={`${duration.toFixed(0)} min`} />
        <StatBlock icon={<Sun size={24} color={uvCat.color} />}
          label="Avg UV" value={`${uv.toFixed(1)} — ${uvCat.label}`} valueColor={uvCat.color} />
        <StatBlock icon={<Sun size={24} color={SUNTRACE_COLORS.primary} />}
          label="Vitamin D" value={`+${dEarned.toLocaleString()} IU`} valueColor={SUNTRACE_COLORS.primary} />
        <StatBlock icon={<Shield size={24} color={getRiskColor(risk)} />}
          label="Burn Risk" value={risk.replace('_', ' ')} valueColor={getRiskColor(risk)} />
      </View>

      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/sun-home')}>
        <Text style={styles.homeBtnText}>Back to Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logBtn} onPress={() => router.replace('/(tabs)/logbook')}>
        <Text style={styles.logBtnText}>View Logbook</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatBlock({ icon, label, value, valueColor }: {
  icon: React.ReactNode; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.statBlock}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low': return SUNTRACE_COLORS.burnLow;
    case 'moderate': return SUNTRACE_COLORS.burnModerate;
    case 'high': return SUNTRACE_COLORS.burnHigh;
    default: return SUNTRACE_COLORS.burnVeryHigh;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgDark,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  checkIcon: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: SUNTRACE_COLORS.textSecondary, textAlign: 'center', marginBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 40, alignSelf: 'stretch' },
  statBlock: { flex: 1, minWidth: 140, backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 12, color: SUNTRACE_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary, textAlign: 'center', textTransform: 'capitalize' },
  homeBtn: { backgroundColor: SUNTRACE_COLORS.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48, marginBottom: 12, alignSelf: 'stretch' },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  logBtn: { paddingVertical: 12, alignSelf: 'stretch' },
  logBtnText: { color: SUNTRACE_COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
});

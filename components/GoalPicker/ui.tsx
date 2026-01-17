import React, { PropsWithChildren } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

export const Bubble = ({ children, muted, testID }: PropsWithChildren<{ muted?: boolean; testID?: string }>) => {
  const { theme } = useAppSettings();
  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: '#000',
        },
        muted ? { backgroundColor: theme.colors.background } : null,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
};

export const Pill = ({ label, active }: { label: string; active?: boolean }) => {
  const { theme } = useAppSettings();
  return (
    <View
      style={[
        styles.pill,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
        active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : null,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: theme.colors.text },
          active ? { color: theme.colors.surface, fontWeight: '600' } : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const SectionTitle = ({ children }: PropsWithChildren) => {
  const { theme } = useAppSettings();
  return <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{children}</Text>;
};

export const OrDivider = () => {
  const { theme } = useAppSettings();
  return (
    <View style={styles.orWrap}>
      <View style={[styles.hr, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.or, { color: theme.colors.textSecondary }]}>OR</Text>
      <View style={[styles.hr, { backgroundColor: theme.colors.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8ee',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 12,
  },
  bubbleMuted: { backgroundColor: '#fafbff' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9dbe3',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#1e66f5',
    borderColor: '#1e66f5',
  },
  pillText: { fontSize: 14, color: '#222' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#0f1223' },
  orWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  or: { marginHorizontal: 10, fontWeight: '700', color: '#7a7f8f', letterSpacing: 1 },
  hr: { flex: 1, height: 1, backgroundColor: '#ececf3' },
});

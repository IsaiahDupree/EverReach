import React from 'react';
import BottomNav from '@/components/BottomNav';
import type { BottomNavAction } from '@/components/BottomNav';
import { Home, Users, MessageCircle, Settings as SettingsIcon } from 'lucide-react-native';
import { go } from '@/lib/navigation';
import { useAppSettings } from '@/providers/AppSettingsProvider';

export type DashboardBottomNavProps = {
  personId?: string;
  includeSettings?: boolean;
  variant?: 'default' | 'elevated';
};

export default function DashboardBottomNav({ personId, includeSettings = true, variant = 'elevated' }: DashboardBottomNavProps) {
  const { theme } = useAppSettings();
  const actions: BottomNavAction[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onPress: () => go.home(),
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
      onPress: () => go.people(),
    },
    {
      id: 'assistant',
      label: 'Message',
      icon: MessageCircle,
      onPress: () => {
        // Prefer opening chat; optionally deep-link to goal-picker if a personId is present
        if (personId && typeof personId === 'string' && personId.length > 0) {
          go.goalPicker(personId, 'sms');
          return;
        }
        go.chat();
      },
      disabled: false,
    },
  ];

  if (includeSettings) {
    actions.push({
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      onPress: () => go.to('/(tabs)/settings'),
    });
  }

  return <BottomNav actions={actions} variant={variant} iconColor={theme.colors.textSecondary} />;
}

/**
 * Auth Provider Button Component
 * Reusable button for OAuth providers
 */

import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { AUTH_PROVIDERS, type AuthProviderId } from '@/constants/authProviders';
import * as Icons from 'lucide-react-native';

interface AuthProviderButtonProps {
  provider: AuthProviderId;
  onPress: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function AuthProviderButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = true,
}: AuthProviderButtonProps) {
  const config = AUTH_PROVIDERS[provider];
  
  if (!config || !config.enabled) {
    return null;
  }

  // Get icon component dynamically
  const IconComponent = (Icons as any)[config.icon.charAt(0).toUpperCase() + config.icon.slice(1)];

  const handlePress = async () => {
    if (loading || disabled) return;
    try {
      await onPress();
    } catch (error) {
      console.error(`[AuthButton] ${config.name} error:`, error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.color,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
      ]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={config.textColor} />
        ) : (
          IconComponent && <IconComponent size={20} color={config.textColor} />
        )}
        
        <Text style={[styles.text, { color: config.textColor }]}>
          {loading ? 'Signing in...' : `Continue with ${config.name}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { SUNTRACE_COLORS } from '@/constants/suntrace';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export default function ErrorState({
  title = 'Oops, something went wrong',
  message,
  onRetry,
  showRetryButton = true,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle
        size={48}
        color={SUNTRACE_COLORS.burnVeryHigh}
        strokeWidth={1.5}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {showRetryButton && onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: SUNTRACE_COLORS.primary,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});

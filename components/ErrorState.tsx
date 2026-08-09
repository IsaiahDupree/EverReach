import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionLabel?: string;
  icon?: React.ReactNode;
  primaryColor?: string;
  backgroundColor?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Unable to load this content. Please try again.',
  onRetry,
  actionLabel = 'Try again',
  icon,
  primaryColor = '#007AFF',
  backgroundColor = '#FFFFFF',
}: ErrorStateProps) {
  const styles = createStyles(primaryColor, backgroundColor);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {icon || <AlertCircle size={48} color={primaryColor} />}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.button} onPress={onRetry}>
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (primaryColor: string, backgroundColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor,
      padding: 24,
    },
    content: {
      alignItems: 'center',
      gap: 16,
    },
    iconContainer: {
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1A1A1A',
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: '#8E8E93',
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: primaryColor,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
      marginTop: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
  });

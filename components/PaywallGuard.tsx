import React from 'react';
import { usePathname } from 'expo-router';
import { usePaywall } from '@/providers/PaywallProvider';
import { shouldBlockPath } from '@/config/navigation';
import UpgradeOnboarding from '@/app/upgrade-onboarding';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useOnboarding } from '@/providers/OnboardingProvider';

interface PaywallGuardProps {
    children: React.ReactNode;
}

export function PaywallGuard({ children }: PaywallGuardProps) {
    const pathname = usePathname();
    const { userState, isLoading: paywallLoading } = usePaywall();
    const { loading: onboardingLoading } = useOnboarding();

    // Combine loading states if needed, but usually we want to show content ASAP
    // For paywall checks, we need userState to be ready
    const isLoading = onboardingLoading;

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // Check if current path should be blocked
    const path = pathname || '/';
    const shouldBlock = shouldBlockPath(path, {
        isTrialExpired: userState.isTrialExpired,
        isPaid: userState.isPremium
    });

    // Log for debugging
    // console.log('🛡️ [PaywallGuard] Checking access:', {
    //   path,
    //   isPremium: userState.isPremium,
    //   isTrialExpired: userState.isTrialExpired,
    //   shouldBlock
    // });

    if (shouldBlock) {
        return <UpgradeOnboarding />;
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
});

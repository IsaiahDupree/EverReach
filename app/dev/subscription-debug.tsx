/**
 * Subscription Debug Dashboard Screen
 * 
 * Real-time subscription state viewer and testing interface.
 * Shows current entitlements, event log, and test actions.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    SafeAreaView,
    Alert,
    Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useEntitlements } from '@/providers/EntitlementsProviderV3';
import subscriptionManager from '@/lib/subscriptionManager';
import subscriptionLogger from '@/lib/subscriptionLogger';
import { formatEntitlementsForDisplay, TEST_PRODUCTS } from '@/lib/subscriptionTesting';

export default function SubscriptionDebugScreen() {
    const { entitlements, loading, refreshEntitlements } = useEntitlements();
    const [refreshing, setRefreshing] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [eventLog, setEventLog] = useState<string[]>([]);

    // Load logs
    useEffect(() => {
        const logData = subscriptionLogger.getLogs();
        setLogs(logData);
    }, [refreshing]);

    // Subscribe to subscription events
    useEffect(() => {
        const unsubscribe = subscriptionManager.addEventListener((event) => {
            setEventLog(prev => [
                `${new Date().toLocaleTimeString()} - ${event.event}`,
                ...prev.slice(0, 19), // Keep last 20 events
            ]);
        });

        return unsubscribe;
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshEntitlements();
        setRefreshing(false);
    };

    const handleTestPurchase = async (productId: string) => {
        Alert.alert(
            'Test Purchase',
            `Initiate purchase for ${productId}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Purchase',
                    onPress: async () => {
                        const result = await subscriptionManager.purchaseSubscription(productId);

                        if (result.success) {
                            Alert.alert('Success', 'Purchase completed!');
                            await handleRefresh();
                        } else {
                            Alert.alert('Failed', result.error || 'Purchase failed');
                        }
                    },
                },
            ]
        );
    };

    const handleRestore = async () => {
        Alert.alert(
            'Restore Purchases',
            'Restore previous purchases?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        const result = await subscriptionManager.restorePurchases();

                        if (result.success) {
                            const message = result.restored
                                ? `Restored: ${result.tier}`
                                : 'No purchases to restore';
                            Alert.alert('Success', message);
                            await handleRefresh();
                        } else {
                            Alert.alert('Failed', result.error || 'Restore failed');
                        }
                    },
                },
            ]
        );
    };

    const handleExportLogs = () => {
        const logsJson = subscriptionLogger.exportLogs();
        console.log('SUBSCRIPTION LOGS:\n', logsJson);
        Alert.alert('Logs Exported', 'Check console for full logs');
    };

    const logSummary = subscriptionLogger.getSummary();

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Subscription Debug',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft size={24} color="#111827" />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* Dev Warning */}
                <View style={styles.warningBanner}>
                    <AlertCircle size={20} color="#F59E0B" />
                    <Text style={styles.warningText}>
                        Development Only - Not available in production
                    </Text>
                </View>

                {/* Current State */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Entitlements</Text>
                    <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>
                            {formatEntitlementsForDisplay(entitlements)}
                        </Text>
                    </View>
                </View>

                {/* Test Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Test Actions</Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleTestPurchase(TEST_PRODUCTS.monthly)}
                    >
                        <Text style={styles.actionButtonText}>Test Purchase (Monthly)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleTestPurchase(TEST_PRODUCTS.annual)}
                    >
                        <Text style={styles.actionButtonText}>Test Purchase (Annual)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonSecondary]}
                        onPress={handleRestore}
                    >
                        <Text style={styles.actionButtonText}>Restore Purchases</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonSecondary]}
                        onPress={handleRefresh}
                    >
                        <Text style={styles.actionButtonText}>
                            <RefreshCw size={16} /> Refresh Entitlements
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Event Log */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Event Log ({eventLog.length})
                    </Text>
                    <View style={styles.logContainer}>
                        {eventLog.length === 0 ? (
                            <Text style={styles.emptyText}>No events yet</Text>
                        ) : (
                            eventLog.map((event, index) => (
                                <Text key={index} style={styles.logText}>
                                    {event}
                                </Text>
                            ))
                        )}
                    </View>
                </View>

                {/* Log Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Log Summary</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{logSummary.total}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{logSummary.byLevel.error}</Text>
                            <Text style={styles.statLabel}>Errors</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{logSummary.byLevel.warn}</Text>
                            <Text style={styles.statLabel}>Warnings</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{logSummary.byLevel.info}</Text>
                            <Text style={styles.statLabel}>Info</Text>
                        </View>
                    </View>

                    {logSummary.lastError && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                Last Error: {logSummary.lastError.message}
                            </Text>
                            <Text style={styles.errorTime}>
                                {new Date(logSummary.lastError.timestamp).toLocaleString()}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonSecondary]}
                        onPress={handleExportLogs}
                    >
                        <Text style={styles.actionButtonText}>Export Logs to Console</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.spacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    backButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 12,
        gap: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginTop: 16,
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    codeBlock: {
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    codeText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12,
        color: '#374151',
        lineHeight: 18,
    },
    actionButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 8,
    },
    actionButtonSecondary: {
        backgroundColor: '#6B7280',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    logContainer: {
        backgroundColor: '#1F2937',
        padding: 12,
        borderRadius: 8,
        maxHeight: 300,
    },
    logText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 11,
        color: '#10B981',
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        paddingVertical: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 13,
        color: '#DC2626',
        fontWeight: '600',
    },
    errorTime: {
        fontSize: 11,
        color: '#991B1B',
        marginTop: 4,
    },
    spacer: {
        height: 40,
    },
});

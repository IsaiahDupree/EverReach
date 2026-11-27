import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react-native';

interface HealthResponse {
  status: string;
  message: string;
  time: string;
}

interface VersionResponse {
  ok: boolean;
  ts: number;
  commit: string;
  buildId: string | null;
  branch: string;
}

interface HealthStatusProps {
  showVersion?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const HealthStatus: React.FC<HealthStatusProps> = ({
  showVersion = true,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [versionData, setVersionData] = useState<VersionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
  const bypassKey = 'fesg4t346dgd534g3456rg43t43542gr';

  const fetchHealthStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[HealthStatus] Fetching from:', baseUrl);
      
      // Prepare headers with bypass key for preview URLs
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://everreach.app'
      };
      
      // Add bypass header if using preview URL
      if (baseUrl.includes('vercel.app') && !baseUrl.includes('ever-reach-be.vercel.app')) {
        headers['x-vercel-protection-bypass'] = bypassKey;
      }

      // Fetch health status
      const healthResponse = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers
      });

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }

      const healthJson = await healthResponse.json();
      setHealthData(healthJson);

      // Fetch version info if requested
      if (showVersion) {
        const versionResponse = await fetch(`${baseUrl}/api/version`, {
          method: 'GET',
          headers
        });

        if (versionResponse.ok) {
          const versionJson = await versionResponse.json();
          setVersionData(versionJson);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[HealthStatus] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, showVersion]);

  useEffect(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchHealthStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchHealthStatus]);

  const getStatusColor = () => {
    if (error) return '#ef4444';
    if (healthData?.status === 'ok') return '#22c55e';
    return '#f59e0b';
  };

  const getStatusIcon = () => {
    if (loading) return <ActivityIndicator size="small" color="#6b7280" />;
    if (error) return <XCircle size={20} color="#ef4444" />;
    if (healthData?.status === 'ok') return <CheckCircle size={20} color="#22c55e" />;
    return <Clock size={20} color="#f59e0b" />;
  };

  const formatTimestamp = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {error ? 'Error' : healthData?.status || 'Unknown'}
          </Text>
          <TouchableOpacity 
            onPress={fetchHealthStatus} 
            style={styles.refreshButton}
            disabled={loading}
          >
            <RefreshCw 
              size={16} 
              color="#6b7280" 
              style={loading ? styles.spinning : undefined}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.baseUrl}>{baseUrl}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {healthData && !error && (
        <View style={styles.dataContainer}>
          <Text style={styles.message}>{healthData.message}</Text>
          <Text style={styles.timestamp}>
            Server Time: {formatTimestamp(healthData.time)}
          </Text>
        </View>
      )}

      {versionData && showVersion && !error && (
        <View style={styles.versionContainer}>
          <Text style={styles.versionTitle}>Version Info</Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Branch:</Text>
            <Text style={styles.versionValue}>{versionData.branch}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Commit:</Text>
            <Text style={styles.versionValue}>{versionData.commit.substring(0, 8)}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Build Time:</Text>
            <Text style={styles.versionValue}>{formatTimestamp(versionData.ts)}</Text>
          </View>
        </View>
      )}

      {lastUpdated && (
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    textTransform: 'capitalize',
  },
  refreshButton: {
    padding: 4,
  },
  spinning: {
    transform: [{ rotate: '180deg' }],
  },
  baseUrl: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  dataContainer: {
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  versionContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  versionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  versionValue: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
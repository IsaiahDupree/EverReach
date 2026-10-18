import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Switch } from 'react-native';
import { RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Globe, Home } from 'lucide-react-native';
import { API_ENDPOINTS, getBackendBase } from '@/constants/endpoints';
import { apiFetch } from '@/lib/api';

// Environment URLs
const ENVIRONMENTS = {
  local: 'http://localhost:3000',
  production: 'https://ever-reach-be.vercel.app',
};

interface HealthResponse {
  status: string;
  message: string;
  time: string;
}

interface VersionResponse {
  ok: boolean;
  ts: number;
  commit: string | null;
  buildId: string | null;
  branch: string;
}

type EndpointStatus = {
  key: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  requiresAuth: boolean;
  statusCode: number | null;
  ok: boolean | null;
  reachable: boolean | null; // true if endpoint responds (even with 400)
  durationMs: number | null;
  errorText?: string;
  responseBody?: string;
};

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
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>([]);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [testContactId, setTestContactId] = useState<string | null>(null);
  const [useProduction, setUseProduction] = useState<boolean>(true); // Default to production

  // Use selected environment URL
  const baseUrl = useProduction ? ENVIRONMENTS.production : ENVIRONMENTS.local;
  const bypassKey = 'fesg4t346dgd534g3456rg43t43542gr';

  // Build endpoint list dynamically based on whether we have a test contact
  const endpointList = useMemo(() => {
    const items: EndpointStatus[] = [
      // ═══════════════════════════════════════════════════════════════════
      // SECTION 1: HEALTH & VERSION (No Auth) - 2 endpoints
      // ═══════════════════════════════════════════════════════════════════
      { key: 'HEALTH', path: '/api/health', method: 'GET', requiresAuth: false, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'VERSION', path: '/api/version', method: 'GET', requiresAuth: false, statusCode: null, ok: null, reachable: null, durationMs: null },
      
      // ═══════════════════════════════════════════════════════════════════
      // SECTION 2: USER & AUTH (/me endpoints) - 6 endpoints
      // ═══════════════════════════════════════════════════════════════════
      { key: 'ME', path: '/api/v1/me', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'ME_ENTITLEMENTS', path: '/api/v1/me/entitlements', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'ME_COMPOSE_SETTINGS', path: '/api/v1/me/compose-settings', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'ME_ONBOARDING', path: '/api/v1/me/onboarding-status', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'ME_PERSONA_NOTES', path: '/api/v1/me/persona-notes', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      // ME_SUBSCRIPTION removed - endpoint only supports DELETE/POST, use ME_ENTITLEMENTS for subscription info
      
      // ═══════════════════════════════════════════════════════════════════
      // SECTION 3: CONTACTS LIST & IMPORT - 3 endpoints
      // ═══════════════════════════════════════════════════════════════════
      { key: 'CONTACTS', path: '/api/v1/contacts', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'CONTACTS_IMPORT_HEALTH', path: '/api/v1/contacts/import/health', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'CONTACTS_IMPORT_LIST', path: '/api/v1/contacts/import/list', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      
      // ═══════════════════════════════════════════════════════════════════
      // SECTION 4: PIPELINES, TEMPLATES, INTERACTIONS, GOALS - 4 endpoints
      // ═══════════════════════════════════════════════════════════════════
      { key: 'PIPELINES', path: '/api/v1/pipelines', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'TEMPLATES', path: '/api/v1/templates', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'INTERACTIONS', path: '/api/v1/interactions', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'GOALS', path: '/api/v1/goals', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      
      // ═══════════════════════════════════════════════════════════════════
      // SECTION 5: CONFIG & BILLING - 4 endpoints
      // ═══════════════════════════════════════════════════════════════════
      { key: 'CONFIG_PAYWALL_LIVE', path: '/api/v1/config/paywall-live', method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'CONFIG_PAYWALL_STRATEGY', path: '/api/v1/config/paywall-strategy', method: 'GET', requiresAuth: false, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'WARMTH_MODES', path: '/api/v1/warmth/modes', method: 'GET', requiresAuth: false, statusCode: null, ok: null, reachable: null, durationMs: null },
      // SUBSCRIPTIONS_SYNC removed - requires RevenueCat customer_info and modifies DB state
      
      // ═══════════════════════════════════════════════════════════════════
      // SECTION 6: POST ENDPOINTS (generic, no specific IDs) - 6 endpoints
      // ═══════════════════════════════════════════════════════════════════
      { key: 'BILLING_RESTORE', path: '/api/v1/billing/restore', method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'FILES', path: '/api/v1/files', method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'SEARCH', path: '/api/v1/search', method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'EVENTS_TRACK', path: '/api/v1/events/track', method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'FEATURE_REQUESTS', path: '/api/v1/feature-requests', method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      { key: 'AGENT_CHAT', path: '/api/v1/agent/chat', method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
    ];
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION 7: CONTACT-SPECIFIC ENDPOINTS (require real contact ID) - 10 endpoints
    // ═══════════════════════════════════════════════════════════════════
    if (testContactId) {
      items.push(
        { key: 'CONTACT_DETAIL', path: `/api/v1/contacts/${testContactId}`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_NOTES', path: `/api/v1/contacts/${testContactId}/notes`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_MESSAGES', path: `/api/v1/contacts/${testContactId}/messages`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_PIPELINE', path: `/api/v1/contacts/${testContactId}/pipeline`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_CONTEXT', path: `/api/v1/contacts/${testContactId}/context-summary`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_GOALS', path: `/api/v1/contacts/${testContactId}/goal-suggestions`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_WARMTH_MODE', path: `/api/v1/contacts/${testContactId}/warmth/mode`, method: 'GET', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        // POST endpoints for contact
        { key: 'CONTACT_WARMTH_RECOMPUTE', path: `/api/v1/contacts/${testContactId}/warmth/recompute`, method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_PIPELINE_MOVE', path: `/api/v1/contacts/${testContactId}/pipeline/move`, method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
        { key: 'CONTACT_FILES', path: `/api/v1/contacts/${testContactId}/files`, method: 'POST', requiresAuth: true, statusCode: null, ok: null, reachable: null, durationMs: null },
      );
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // Skipped endpoints (cannot health check):
    // - /api/v1/compose (needs contact_id + channel in body)
    // - /api/v1/messages (needs contact_id in body) 
    // - /api/v1/screenshots (needs multipart/form-data file)
    // - /api/v1/transcribe (needs multipart/form-data audio)
    // - /api/v1/ops/* (admin endpoints, need service key)
    // - /api/v1/webhooks/* (external callbacks)
    // ═══════════════════════════════════════════════════════════════════
    
    return items;
  }, [testContactId]);

  const toggleExpanded = (key: string) => {
    setExpandedEndpoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const fetchHealthStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[HealthStatus] Fetching from:', baseUrl);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://everreach.app',
      };
      if (baseUrl.includes('vercel.app') && !baseUrl.includes('ever-reach-be.vercel.app')) {
        headers['x-vercel-protection-bypass'] = bypassKey;
      }
      const healthResponse = await fetch(`${baseUrl}/api/health`, { method: 'GET', headers });
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      }
      const healthJson = (await healthResponse.json()) as HealthResponse;
      setHealthData(healthJson);
      if (showVersion) {
        const versionResponse = await fetch(`${baseUrl}/api/version`, { method: 'GET', headers });
        if (versionResponse.ok) {
          const versionJson = (await versionResponse.json()) as VersionResponse;
          setVersionData(versionJson);
        } else {
          setVersionData(null);
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

  const probeEndpoints = useCallback(async () => {
    console.log('[HealthStatus] Probing endpoints against:', baseUrl);
    const results: EndpointStatus[] = await Promise.all(
      endpointList.map(async (e) => {
        const start = Date.now();
        try {
          // Build request options based on method
          // Use baseOverride to force using the selected environment URL
          const options: any = { 
            method: e.method, 
            requireAuth: e.requiresAuth,
            baseOverride: baseUrl, // Force use selected environment
          };
          
          // For POST endpoints, send minimal body to test reachability
          if (e.method === 'POST') {
            if (e.key === 'SEARCH') {
              options.body = JSON.stringify({ query: 'test' });
            } else if (e.key === 'FILES') {
              options.body = JSON.stringify({ path: 'health-check/test.txt', contentType: 'text/plain' });
            } else if (e.key === 'EVENTS_TRACK') {
              options.body = JSON.stringify({ event_type: 'health_check', timestamp: new Date().toISOString() });
            } else if (e.key === 'FEATURE_REQUESTS') {
              options.body = JSON.stringify({ type: 'feature', title: 'Health Check', description: 'Automated endpoint test - ignore' });
            } else if (e.key === 'AGENT_CHAT') {
              options.body = JSON.stringify({ message: 'ping' });
            } else {
              options.body = JSON.stringify({});
            }
          }
          
          const res = await apiFetch(e.path, options);
          const duration = Date.now() - start;
          
          // Endpoint is "reachable" if we got ANY HTTP response (even 400/401/403)
          // Only 5xx errors and network failures indicate the endpoint is DOWN
          const isReachable = res.status < 500;
          const isSuccess = res.ok; // 2xx status
          
          // Try to get response body for non-2xx responses
          let responseBody: string | undefined;
          if (!res.ok) {
            try {
              const text = await res.text();
              responseBody = text.substring(0, 500); // Limit size
            } catch {
              responseBody = 'Could not read response body';
            }
          }
          
          return { 
            ...e, 
            statusCode: res.status, 
            ok: isSuccess, 
            reachable: isReachable,
            durationMs: duration, 
            responseBody 
          };
        } catch (err) {
          const duration = Date.now() - start;
          const msg = err instanceof Error ? err.message : String(err);
          return { 
            ...e, 
            statusCode: null, 
            ok: false, 
            reachable: false, // Network error = not reachable
            durationMs: duration, 
            errorText: msg 
          };
        }
      })
    );
    setEndpointStatuses(results);
  }, [endpointList, baseUrl]);

  useEffect(() => {
    fetchHealthStatus();
    probeEndpoints();
  }, [fetchHealthStatus, probeEndpoints]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchHealthStatus();
        probeEndpoints();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchHealthStatus, probeEndpoints]);

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

  const getStatusDescription = (status: number | null): string => {
    if (status === null) return 'Network Error';
    switch (status) {
      case 200: return 'OK';
      case 201: return 'Created';
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 405: return 'Method Not Allowed';
      case 500: return 'Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Unavailable';
      default: return `HTTP ${status}`;
    }
  };

  const renderEndpoint = ({ item }: { item: EndpointStatus }) => {
    // Color logic:
    // - Green: 2xx success
    // - Yellow/Orange: 4xx validation error (endpoint IS reachable, just invalid request)
    // - Red: 5xx server error or network failure
    let color = '#6b7280'; // gray default
    if (item.statusCode !== null) {
      if (item.ok) {
        color = '#16a34a'; // green - success
      } else if (item.reachable) {
        color = '#d97706'; // amber - reachable but validation/auth error
      } else {
        color = '#dc2626'; // red - server error or unreachable
      }
    }
    
    const statusText = item.statusCode?.toString() ?? 'ERR';
    const isExpanded = expandedEndpoints.has(item.key);
    const hasDetails = !item.ok && (item.errorText || item.responseBody);
    
    return (
      <View testID={`endpoint-row-${item.key.toLowerCase()}`}>
        <TouchableOpacity 
          style={styles.endpointRow} 
          onPress={() => hasDetails && toggleExpanded(item.key)}
          disabled={!hasDetails}
        >
          <View style={styles.endpointMain}>
            <View style={[styles.methodBadge, { backgroundColor: item.method === 'GET' ? '#dbeafe' : '#fef3c7' }]}>
              <Text style={[styles.methodText, { color: item.method === 'GET' ? '#1d4ed8' : '#b45309' }]}>
                {item.method}
              </Text>
            </View>
            <Text style={[styles.endpointPath, { color: '#111827' }]} numberOfLines={1}>
              {item.path}
            </Text>
          </View>
          <View style={styles.endpointRight}>
            <Text style={[styles.endpointMeta, { color }]}>{statusText}</Text>
            <Text style={styles.endpointTime}>{item.durationMs !== null ? `${item.durationMs}ms` : '—'}</Text>
            {hasDetails && (
              isExpanded ? 
                <ChevronUp size={14} color="#6b7280" /> : 
                <ChevronDown size={14} color="#6b7280" />
            )}
          </View>
        </TouchableOpacity>
        
        {/* Expandable Details */}
        {isExpanded && hasDetails && (
          <View style={[
            styles.errorDetails, 
            item.reachable && styles.warningDetails
          ]}>
            <View style={styles.errorHeader}>
              <Text style={[
                styles.errorTitle,
                item.reachable && styles.warningTitle
              ]}>
                {item.statusCode ? `${item.statusCode} - ${getStatusDescription(item.statusCode)}` : 'Request Failed'}
                {item.reachable && ' (Endpoint Reachable)'}
              </Text>
            </View>
            {item.errorText && (
              <View style={styles.errorSection}>
                <Text style={styles.errorLabel}>Error:</Text>
                <Text style={styles.errorValue}>{item.errorText}</Text>
              </View>
            )}
            {item.responseBody && (
              <View style={styles.errorSection}>
                <Text style={styles.errorLabel}>Response:</Text>
                <Text style={styles.errorValue} numberOfLines={10}>
                  {item.responseBody}
                </Text>
              </View>
            )}
            <View style={styles.errorSection}>
              <Text style={styles.errorLabel}>Expected:</Text>
              <Text style={styles.errorValue}>
                {item.method} {item.path} {item.requiresAuth ? '(auth required)' : '(no auth)'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container} testID="health-status">
      {/* Environment Toggle */}
      <View style={styles.envToggleContainer}>
        <View style={styles.envToggleRow}>
          <Home size={16} color={!useProduction ? '#2563eb' : '#9ca3af'} />
          <Text style={[styles.envLabel, !useProduction && styles.envLabelActive]}>Local</Text>
          <Switch
            value={useProduction}
            onValueChange={(value) => {
              setUseProduction(value);
              // Clear results when switching
              setHealthData(null);
              setVersionData(null);
              setEndpointStatuses([]);
              setError(null);
            }}
            trackColor={{ false: '#93c5fd', true: '#86efac' }}
            thumbColor={useProduction ? '#22c55e' : '#2563eb'}
          />
          <Text style={[styles.envLabel, useProduction && styles.envLabelActive]}>Production</Text>
          <Globe size={16} color={useProduction ? '#22c55e' : '#9ca3af'} />
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.statusRow}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {error ? 'Error' : healthData?.status || 'Unknown'}
          </Text>
          <TouchableOpacity onPress={() => { fetchHealthStatus(); probeEndpoints(); }} style={styles.refreshButton} disabled={loading}>
            <RefreshCw size={16} color="#6b7280" style={loading ? styles.spinning : undefined} />
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
          <Text style={styles.timestamp}>Server Time: {formatTimestamp(healthData.time)}</Text>
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
            <Text style={styles.versionValue}>{versionData.commit ? versionData.commit.substring(0, 8) : 'N/A'}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Build Time:</Text>
            <Text style={styles.versionValue}>{formatTimestamp(versionData.ts)}</Text>
          </View>
        </View>
      )}

      <View style={styles.endpointContainer}>
        <View style={styles.endpointHeader}>
          <Text style={styles.endpointTitle}>API Endpoints</Text>
          {endpointStatuses.length > 0 && (
            <View style={styles.summaryBadges}>
              <View style={[styles.badge, styles.badgeSuccess]}>
                <Text style={styles.badgeText}>
                  ✓ {endpointStatuses.filter(e => e.ok === true).length}
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeWarning]}>
                <Text style={styles.badgeText}>
                  ⚠ {endpointStatuses.filter(e => !e.ok && e.reachable).length}
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeFail]}>
                <Text style={styles.badgeText}>
                  ✗ {endpointStatuses.filter(e => !e.reachable && e.statusCode !== null || e.statusCode === null).length}
                </Text>
              </View>
            </View>
          )}
        </View>
        <Text style={styles.tapHint}>Tap failed endpoints to see details</Text>
        <FlatList
          data={endpointStatuses}
          keyExtractor={(i) => i.key}
          renderItem={renderEndpoint}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          scrollEnabled={false}
        />
      </View>

      {lastUpdated && (
        <Text style={styles.lastUpdated}>Last updated: {lastUpdated.toLocaleTimeString()}</Text>
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
  envToggleContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  envToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  envLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  envLabelActive: {
    color: '#111827',
    fontWeight: '600',
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
  endpointContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  endpointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  endpointTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  summaryBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeFail: {
    backgroundColor: '#fee2e2',
  },
  badgePending: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  tapHint: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  endpointMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  methodBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  methodText: {
    fontSize: 8,
    fontWeight: '700',
  },
  endpointPath: {
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
  endpointRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  endpointMeta: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  endpointTime: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    minWidth: 45,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#eef2f7',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Error/Warning details styles
  errorDetails: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  warningDetails: {
    backgroundColor: '#fffbeb',
    borderLeftColor: '#d97706',
  },
  errorHeader: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  warningTitle: {
    color: '#d97706',
  },
  errorSection: {
    marginBottom: 6,
  },
  errorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  errorValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#374151',
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 4,
  },
});

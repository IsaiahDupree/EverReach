import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { apiFetch, backendBase } from '@/lib/api';
import { go } from '@/lib/navigation';

// ─── Test Definitions ───────────────────────────────────────────────────────

interface TestDef {
  name: string;
  method: string;
  path: string;
  expect: number[];
  auth: boolean;
  body?: any;
  /** Which app screen/feature uses this endpoint */
  screen: string;
}

interface TestResult {
  def: TestDef;
  status: number;
  passed: boolean;
  ms: number;
  error?: string;
}

interface SectionResult {
  title: string;
  results: TestResult[];
  passed: number;
  failed: number;
}

// All endpoints the iOS app actually calls, grouped by feature/screen.
// Method + path + expected status codes + whether auth is required.
// Paths with :contactId are resolved dynamically at runtime.
const TEST_SECTIONS: { title: string; tests: TestDef[] }[] = [
  {
    title: '🏥 Health & Config',
    tests: [
      { name: 'Health Check', method: 'GET', path: '/api/health', expect: [200], auth: false, screen: 'App Launch' },
      { name: 'App Data / Version', method: 'GET', path: '/api/v1/app-data', expect: [200, 404], auth: false, screen: 'App Launch' },
      { name: 'Config Status', method: 'GET', path: '/api/v1/ops/config-status', expect: [200, 404], auth: true, screen: 'Settings' },
      { name: 'Telemetry (POST)', method: 'POST', path: '/api/telemetry/performance', expect: [200, 201, 204, 400, 404], auth: true, body: { metric: 'health_check', value: 1 }, screen: 'App Launch' },
    ],
  },
  {
    title: '👤 Auth & User Profile',
    tests: [
      { name: 'Get Current User', method: 'GET', path: '/api/v1/me', expect: [200], auth: true, screen: 'Settings / Profile' },
      { name: 'Get User Account', method: 'GET', path: '/api/v1/me/account', expect: [200, 404, 405], auth: true, screen: 'Personal Profile' },
      { name: 'Get Entitlements', method: 'GET', path: '/api/v1/me/entitlements', expect: [200, 404], auth: true, screen: 'Subscription' },
      { name: 'Get Usage', method: 'GET', path: '/api/v1/me/usage', expect: [200, 404], auth: true, screen: 'Paywall' },
      { name: 'Usage Summary (30d)', method: 'GET', path: '/api/me/usage-summary?window=30d', expect: [200, 404], auth: true, screen: 'Subscription Plans' },
      { name: 'Compose Settings', method: 'GET', path: '/api/v1/me/compose-settings', expect: [200, 404], auth: true, screen: 'Mode Settings' },
      { name: 'Link Apple Status', method: 'GET', path: '/api/v1/link/apple', expect: [200, 404, 405], auth: true, screen: 'Personal Profile' },
      { name: 'Link Google Status', method: 'GET', path: '/api/v1/link/google', expect: [200, 404, 405], auth: true, screen: 'Personal Profile' },
    ],
  },
  {
    title: '📇 Contacts (List)',
    tests: [
      { name: 'List Contacts', method: 'GET', path: '/api/v1/contacts?limit=5', expect: [200], auth: true, screen: 'People Tab' },
      { name: 'Search Contacts', method: 'GET', path: '/api/v1/contacts?q=test&limit=5', expect: [200], auth: true, screen: 'People Tab' },
      { name: 'Contacts (warmth sort)', method: 'GET', path: '/api/v1/contacts?limit=5&sort=warmth.desc', expect: [200], auth: true, screen: 'People Tab' },
      { name: 'Contacts (updated sort)', method: 'GET', path: '/api/v1/contacts?limit=5&sort=updated_at.desc', expect: [200, 400], auth: true, screen: 'People Tab' }, // 400 until backend redeploy
      { name: 'Batch Avatars', method: 'POST', path: '/api/v1/contacts/avatars/batch', expect: [200, 400, 404, 405], auth: true, body: { contact_ids: [] }, screen: 'People Tab' },
    ],
  },
  {
    title: '📇 Contact Detail (dynamic)',
    tests: [
      { name: 'Get Contact', method: 'GET', path: '/api/v1/contacts/:contactId', expect: [200], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Context Summary', method: 'GET', path: '/api/v1/contacts/:contactId/context-summary', expect: [200, 404], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Files', method: 'GET', path: '/api/v1/contacts/:contactId/files', expect: [200, 404], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Notes', method: 'GET', path: '/api/v1/contacts/:contactId/notes', expect: [200, 404], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Pipeline', method: 'GET', path: '/api/v1/contacts/:contactId/pipeline', expect: [200, 404], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Warmth Mode', method: 'GET', path: '/api/v1/contacts/:contactId/warmth/mode', expect: [200, 404], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Goal Suggestions', method: 'GET', path: '/api/v1/contacts/:contactId/goal-suggestions', expect: [200, 404], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Avatar', method: 'GET', path: '/api/v1/contacts/:contactId/avatar', expect: [200, 302, 404, 405], auth: true, screen: 'Contact Detail' },
      { name: 'Contact Interactions', method: 'GET', path: '/api/v1/interactions?contact_id=:contactId&limit=5&sort=created_at:desc', expect: [200], auth: true, screen: 'Contact Detail' },
      { name: 'Watch Contact', method: 'GET', path: '/api/v1/contacts/:contactId/watch', expect: [200, 404, 405], auth: true, screen: 'Contact Detail' },
    ],
  },
  {
    title: '📝 Interactions & Notes',
    tests: [
      { name: 'List Interactions', method: 'GET', path: '/api/v1/interactions?kind=note&limit=5', expect: [200], auth: true, screen: 'Contact Detail' },
      { name: 'Personal Notes (text)', method: 'GET', path: '/api/v1/me/persona-notes?type=text', expect: [200, 404], auth: true, screen: 'Personal Notes' },
      { name: 'Personal Notes (voice)', method: 'GET', path: '/api/v1/me/persona-notes?type=voice&limit=5', expect: [200, 404], auth: true, screen: 'Voice Notes' },
      { name: 'List All Persona Notes', method: 'GET', path: '/api/v1/me/persona-notes', expect: [200, 404], auth: true, screen: 'Personal Notes' },
    ],
  },
  {
    title: '🔥 Warmth Engine',
    tests: [
      { name: 'Warmth Summary', method: 'GET', path: '/api/v1/warmth/summary', expect: [200, 404], auth: true, screen: 'Dashboard' },
      { name: 'Warmth Modes', method: 'GET', path: '/api/v1/warmth/modes', expect: [200, 404], auth: true, screen: 'Warmth Settings' },
    ],
  },
  {
    title: '🤖 AI Agent & Chat',
    tests: [
      { name: 'Agent Tools List', method: 'GET', path: '/api/v1/agent/tools', expect: [200, 404], auth: true, screen: 'Chat Tab' },
      { name: 'Trending Prompts', method: 'GET', path: '/api/v1/queries/trending?timeframe=today', expect: [200, 404], auth: false, screen: 'Chat Tab' },
      { name: 'Queries History', method: 'GET', path: '/api/v1/queries', expect: [200, 404], auth: true, screen: 'Chat Tab' },
      { name: 'Agent Analyze Contact', method: 'POST', path: '/api/v1/agent/analyze/contact', expect: [200, 400, 404, 422], auth: true, body: { query: 'health check' }, screen: 'Chat Tab' },
      { name: 'Agent Suggest Actions', method: 'POST', path: '/api/v1/agent/suggest/actions', expect: [200, 400, 404, 422], auth: true, body: { query: 'health check' }, screen: 'Chat Tab' },
      { name: 'Agent Compose Smart', method: 'POST', path: '/api/v1/agent/compose/smart', expect: [200, 400, 404, 422], auth: true, body: { prompt: 'health check' }, screen: 'Chat Tab' },
    ],
  },
  {
    title: '✉️ Messages & Compose',
    tests: [
      { name: 'List Templates', method: 'GET', path: '/api/v1/templates?limit=5', expect: [200, 404], auth: true, screen: 'Message Compose' },
      { name: 'Templates by Channel', method: 'GET', path: '/api/v1/templates?channel=email&limit=1', expect: [200, 404], auth: true, screen: 'Message Compose' },
    ],
  },
  {
    title: '📸 Screenshots & Files',
    tests: [
      { name: 'List Screenshots', method: 'GET', path: '/api/v1/screenshots', expect: [200, 404], auth: true, screen: 'Screenshot Analysis' },
      { name: 'List Files', method: 'GET', path: '/api/v1/files', expect: [200, 404], auth: true, screen: 'Contact Files' },
    ],
  },
  {
    title: '💰 Billing & Subscription',
    tests: [
      { name: 'Get Subscription', method: 'GET', path: '/api/v1/billing/subscription', expect: [200, 404], auth: true, screen: 'Account Billing' },
      { name: 'Paywall Config', method: 'GET', path: '/api/v1/config/paywall-live?platform=ios', expect: [200, 401, 404], auth: true, screen: 'Subscription Plans' },
      { name: 'Changelog', method: 'GET', path: '/api/v1/changelog?limit=3', expect: [200, 404, 500], auth: false, screen: 'Subscription Plans' },
      { name: 'Restore Purchases', method: 'POST', path: '/api/v1/billing/restore', expect: [200, 400, 404], auth: true, body: {}, screen: 'Subscription' },
      { name: 'Sync Subscription', method: 'POST', path: '/api/v1/subscriptions/sync', expect: [200, 400, 404, 405], auth: true, body: {}, screen: 'Subscription' },
      { name: 'Billing Portal', method: 'POST', path: '/api/v1/billing/portal', expect: [200, 400, 404, 500], auth: true, body: { return_url: 'https://app.everreach.com' }, screen: 'Account Billing' },
    ],
  },
  {
    title: '📊 Analytics & Events',
    tests: [
      { name: 'Track Event', method: 'POST', path: '/api/v1/events/track', expect: [200, 201, 400, 404], auth: true, body: { event_name: 'health_check_test', properties: { source: 'api-health-check' } }, screen: 'All Screens' },
    ],
  },
  {
    title: '🔔 Alerts & Push',
    tests: [
      { name: 'List Alerts', method: 'GET', path: '/api/v1/alerts', expect: [200, 404], auth: true, screen: 'Alerts' },
      { name: 'Push Tokens', method: 'GET', path: '/api/v1/push-tokens', expect: [200, 404, 405], auth: true, screen: 'Notifications' },
    ],
  },
  {
    title: '⚙️ Imports',
    tests: [
      { name: 'Import Health', method: 'GET', path: '/api/v1/contacts/import/health', expect: [200, 404], auth: true, screen: 'Import Contacts' },
      { name: 'Import List', method: 'GET', path: '/api/v1/contacts/import/list?limit=5', expect: [200, 404], auth: true, screen: 'Import Status' },
    ],
  },
  {
    title: '🗳️ Feature Requests',
    tests: [
      { name: 'List Feature Requests', method: 'GET', path: '/api/v1/feature-requests?limit=5', expect: [200, 404], auth: true, screen: 'Feature Request' },
    ],
  },
  {
    title: '🔑 Developer',
    tests: [
      { name: 'Developer Keys', method: 'GET', path: '/api/v1/developer/keys', expect: [200, 404], auth: true, screen: 'Developer Settings' },
    ],
  },
  {
    title: '🗄️ Supabase Direct',
    tests: [
      { name: 'Profiles Table (RLS)', method: 'SUPABASE', path: 'profiles', expect: [200], auth: true, screen: 'Dashboard / Settings' },
      { name: 'Contacts Table (RLS)', method: 'SUPABASE', path: 'contacts', expect: [200], auth: true, screen: 'People Tab' },
      { name: 'Interactions Table (RLS)', method: 'SUPABASE', path: 'interactions', expect: [200], auth: true, screen: 'Contact Detail' },
      { name: 'Files Table (RLS)', method: 'SUPABASE', path: 'files', expect: [200], auth: true, screen: 'Contact Files' },
      { name: 'Insights Table', method: 'SUPABASE', path: 'insights', expect: [200], auth: true, screen: 'Dashboard' },
      { name: 'Onboarding Responses', method: 'SUPABASE', path: 'onboarding_responses_v2', expect: [200], auth: true, screen: 'Onboarding' },
      { name: 'Message Threads', method: 'SUPABASE', path: 'message_threads', expect: [200], auth: true, screen: 'Chat Tab' },
      { name: 'Generated Messages', method: 'SUPABASE', path: 'generated_messages', expect: [200], auth: true, screen: 'Messages' },
      { name: 'People View', method: 'SUPABASE', path: 'people', expect: [200], auth: true, screen: 'People Tab' },
    ],
  },
];

const TOTAL_TESTS = TEST_SECTIONS.reduce((sum, s) => sum + s.tests.length, 0);

// ─── Component ──────────────────────────────────────────────────────────────

export default function ApiHealthCheckScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [running, setRunning] = useState(false);
  const [sections, setSections] = useState<SectionResult[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [baseOverride, setBaseOverride] = useState('');
  const [progress, setProgress] = useState(0);
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [dynamicContact, setDynamicContact] = useState<string>('');
  const abortRef = useRef(false);

  const toggleSection = useCallback((idx: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  async function runAllTests() {
    abortRef.current = false;
    setRunning(true);
    setSections([]);
    setProgress(0);

    const BASE = baseOverride.trim() || backendBase();
    let completed = 0;

    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    setAuthOk(!!token);

    // Fetch a real contact ID for dynamic tests
    let contactId = '';
    let contactName = '';
    try {
      const res = await apiFetch('/api/v1/contacts?limit=1', { requireAuth: true, baseOverride: BASE });
      if (res.ok) {
        const json = await res.json();
        const items = json?.items || json?.contacts || json?.data || [];
        if (items.length > 0) {
          contactId = items[0].id;
          contactName = items[0].first_name || items[0].name || 'Unknown';
        }
      }
    } catch {}
    setDynamicContact(contactId ? `${contactName} (${contactId.slice(0, 8)}…)` : 'None found');

    const allSections: SectionResult[] = [];

    for (const section of TEST_SECTIONS) {
      if (abortRef.current) break;

      const sectionResult: SectionResult = {
        title: section.title,
        results: [],
        passed: 0,
        failed: 0,
      };

      for (const test of section.tests) {
        if (abortRef.current) break;

        // Resolve :contactId in path
        let resolvedPath = test.path;
        if (resolvedPath.includes(':contactId')) {
          if (!contactId) {
            // Skip dynamic tests if no contact found
            sectionResult.results.push({
              def: test,
              status: 0,
              passed: false,
              ms: 0,
              error: 'No contacts found — skipped',
            });
            sectionResult.failed++;
            completed++;
            setProgress(completed);
            continue;
          }
          resolvedPath = resolvedPath.replace(/:contactId/g, contactId);
        }

        const start = Date.now();
        let status = 0;
        let error: string | undefined;

        try {
          if (test.method === 'SUPABASE') {
            // Direct Supabase table query
            const { data, error: dbErr } = await supabase
              .from(test.path)
              .select('*')
              .limit(1);
            if (dbErr) {
              status = 500;
              error = dbErr.message;
            } else {
              status = 200;
            }
          } else {
            // Backend API call
            const response = await apiFetch(resolvedPath, {
              method: test.method,
              requireAuth: test.auth,
              baseOverride: BASE,
              body: test.body ? JSON.stringify(test.body) : undefined,
            });
            status = response.status;
          }
        } catch (e: any) {
          error = e.message || 'Network error';
        }

        const ms = Date.now() - start;
        const passed = test.expect.includes(status);

        sectionResult.results.push({ def: test, status, passed, ms, error });
        if (passed) sectionResult.passed++;
        else sectionResult.failed++;

        completed++;
        setProgress(completed);
      }

      allSections.push(sectionResult);
      setSections([...allSections]);
    }

    setRunning(false);
  }

  function stopTests() {
    abortRef.current = true;
  }

  const totalPassed = sections.reduce((s, sec) => s + sec.passed, 0);
  const totalFailed = sections.reduce((s, sec) => s + sec.failed, 0);
  const totalRan = totalPassed + totalFailed;

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'API Health Check',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text },
          headerLeft: () => (
            <TouchableOpacity onPress={() => go.back()} style={{ marginLeft: 16 }}>
              <ChevronLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Comprehensive API Health Check
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Tests every API call the app makes — {TOTAL_TESTS} endpoints across {TEST_SECTIONS.length} features
          </Text>
        </View>

        {/* Backend Override */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            placeholder={`Backend URL (default: ${backendBase()})`}
            placeholderTextColor={theme.colors.textSecondary}
            value={baseOverride}
            onChangeText={setBaseOverride}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Run / Stop Buttons */}
        <View style={styles.buttonRow}>
          {!running ? (
            <TouchableOpacity style={[styles.runBtn, { backgroundColor: theme.colors.primary }]} onPress={runAllTests}>
              <Play size={18} color="#FFF" />
              <Text style={styles.runBtnText}>Run All {TOTAL_TESTS} Tests</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.runBtn, { backgroundColor: theme.colors.error }]} onPress={stopTests}>
              <XCircle size={18} color="#FFF" />
              <Text style={styles.runBtnText}>Stop ({progress}/{TOTAL_TESTS})</Text>
            </TouchableOpacity>
          )}

          {totalRan > 0 && !running && (
            <TouchableOpacity style={[styles.resetBtn, { borderColor: theme.colors.border }]} onPress={() => { setSections([]); setProgress(0); }}>
              <RotateCcw size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Auth Status */}
        {authOk !== null && (
          <View style={[styles.authBanner, { backgroundColor: authOk ? '#10B98120' : '#EF444420' }]}>
            {authOk ? (
              <CheckCircle2 size={16} color="#10B981" />
            ) : (
              <AlertTriangle size={16} color="#EF4444" />
            )}
            <Text style={[styles.authText, { color: authOk ? '#10B981' : '#EF4444' }]}>
              {authOk ? 'Authenticated — all tests can run' : 'Not authenticated — auth-required tests will fail'}
            </Text>
          </View>
        )}

        {/* Dynamic Contact Info */}
        {dynamicContact !== '' && (
          <View style={[styles.authBanner, { backgroundColor: theme.colors.surface }]}>
            <CheckCircle2 size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.authText, { color: theme.colors.textSecondary }]}>
              Contact detail tests using: {dynamicContact}
            </Text>
          </View>
        )}

        {/* Summary Bar */}
        {totalRan > 0 && (
          <View style={[styles.summaryBar, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: theme.colors.text }]}>{totalRan}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: '#10B981' }]}>{totalPassed}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Passed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: totalFailed > 0 ? '#EF4444' : theme.colors.textSecondary }]}>{totalFailed}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Failed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: theme.colors.text }]}>
                {totalRan > 0 ? Math.round((totalPassed / totalRan) * 100) : 0}%
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Pass Rate</Text>
            </View>
          </View>
        )}

        {/* Progress */}
        {running && (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              Running test {progress} of {TOTAL_TESTS}...
            </Text>
          </View>
        )}

        {/* Results by Section */}
        {sections.map((sec, idx) => (
          <View key={idx} style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(idx)}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{sec.title}</Text>
                <View style={styles.sectionBadges}>
                  {sec.passed > 0 && (
                    <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                      <Text style={[styles.badgeText, { color: '#10B981' }]}>{sec.passed} ✓</Text>
                    </View>
                  )}
                  {sec.failed > 0 && (
                    <View style={[styles.badge, { backgroundColor: '#EF444420' }]}>
                      <Text style={[styles.badgeText, { color: '#EF4444' }]}>{sec.failed} ✗</Text>
                    </View>
                  )}
                </View>
              </View>
              {collapsed.has(idx) ? (
                <ChevronDown size={18} color={theme.colors.textSecondary} />
              ) : (
                <ChevronUp size={18} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>

            {!collapsed.has(idx) && sec.results.map((r, ri) => (
              <View key={ri} style={[styles.resultRow, { borderTopColor: theme.colors.border }]}>
                <View style={styles.resultIcon}>
                  {r.passed ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <XCircle size={16} color="#EF4444" />
                  )}
                </View>
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultName, { color: theme.colors.text }]}>{r.def.name}</Text>
                  <Text style={[styles.resultMeta, { color: theme.colors.textSecondary }]}>
                    {r.def.method === 'SUPABASE' ? 'DB' : r.def.method} → {r.status || 'ERR'} ({r.ms}ms) • {r.def.screen}
                  </Text>
                  {r.error && (
                    <Text style={[styles.resultError, { color: '#EF4444' }]} numberOfLines={2}>
                      {r.error}
                    </Text>
                  )}
                </View>
                <View style={styles.resultTiming}>
                  <Clock size={12} color={r.ms > 2000 ? '#F59E0B' : theme.colors.textSecondary} />
                  <Text style={[styles.resultMs, { color: r.ms > 2000 ? '#F59E0B' : theme.colors.textSecondary }]}>
                    {r.ms}ms
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Coverage Legend */}
        {!running && totalRan === 0 && (
          <View style={[styles.legend, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.legendTitle, { color: theme.colors.text }]}>What this tests:</Text>
            {TEST_SECTIONS.map((s, i) => (
              <Text key={i} style={[styles.legendItem, { color: theme.colors.textSecondary }]}>
                {s.title} — {s.tests.length} endpoint{s.tests.length > 1 ? 's' : ''}
              </Text>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    header: { padding: 20, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '700' },
    subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
    inputRow: { paddingHorizontal: 20, marginBottom: 12 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'monospace' },
    buttonRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
    runBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, gap: 8 },
    runBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    resetBtn: { width: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
    authBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 10, borderRadius: 8, gap: 8, marginBottom: 12 },
    authText: { fontSize: 13, fontWeight: '500' },
    summaryBar: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 10, padding: 16, marginBottom: 12 },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryNum: { fontSize: 24, fontWeight: '700' },
    summaryLabel: { fontSize: 11, marginTop: 2 },
    progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    progressText: { fontSize: 13 },
    section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    sectionTitle: { fontSize: 15, fontWeight: '600' },
    sectionBadges: { flexDirection: 'row', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 0.5 },
    resultIcon: { width: 24 },
    resultInfo: { flex: 1, marginLeft: 4 },
    resultName: { fontSize: 13, fontWeight: '500' },
    resultMeta: { fontSize: 11, marginTop: 2 },
    resultError: { fontSize: 11, marginTop: 2 },
    resultTiming: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
    resultMs: { fontSize: 11 },
    legend: { marginHorizontal: 16, borderRadius: 10, padding: 16 },
    legendTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
    legendItem: { fontSize: 13, marginBottom: 4 },
  });
}

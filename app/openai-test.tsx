import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView, Image } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { backendBase, apiFetch } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, XCircle, CheckCircle2, Zap, Server, ShieldCheck, Image as ImageIcon, Camera, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { sendAgentMessage } from '@/lib/agent-api';
import { trpc } from '@/lib/trpc';
import * as ImagePicker from 'expo-image-picker';

interface TestResult {
  success: boolean;
  result?: any;
  error?: {
    message: string;
    code: string;
    type: string;
  };
  responseTime: number;
  model?: string;
  usage?: any;
}

export default function OpenAITestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, cloudModeEnabled } = useAppSettings();
  const [prompt, setPrompt] = useState<string>('Write a short, friendly message to check in with a colleague about their recent project.');
  const [model, setModel] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo'>('gpt-4o-mini');
  const [maxTokens, setMaxTokens] = useState<number>(150);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [testType, setTestType] = useState<'completion' | 'structured' | 'embedding' | 'screenshot'>('completion');

  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<any>(null);
  const [analyzingScreenshot, setAnalyzingScreenshot] = useState<boolean>(false);
  const [agentChatResult, setAgentChatResult] = useState<any>(null);
  const [testingAgent, setTestingAgent] = useState<boolean>(false);
  const [testSuiteResults, setTestSuiteResults] = useState<Record<string, any>>({});
  const [runningTestSuite, setRunningTestSuite] = useState<boolean>(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [pinging, setPinging] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<{ reachable: boolean; status?: number; message?: string; responseTime?: number; baseUrl: string; hasAuth: boolean; userEmail?: string }>({ reachable: false, baseUrl: backendBase(), hasAuth: false });

  const styles = useMemo(() => createStyles(theme), [theme]);

  const testMutation = trpc.openai.test.useMutation();

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        const userEmail = data?.session?.user?.email;
        setBackendStatus(prev => ({ 
          ...prev, 
          hasAuth: Boolean(token),
          userEmail: userEmail || undefined
        }));
        
        // Auto-ping if we have auth
        if (token) {
          console.log('[OpenAI Test] Auth found, auto-pinging backend...');
          setPinging(true);
          try {
            const start = Date.now();
            const res = await fetch(`${backendBase()}/api/health`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            const rt = Date.now() - start;
            let msg: string | undefined = undefined;
            try {
              const json = await res.json();
              msg = typeof json?.message === 'string' ? json.message : JSON.stringify(json);
            } catch {
              msg = 'Non-JSON response';
            }
            setBackendStatus({ 
              reachable: res.ok, 
              status: res.status, 
              message: msg, 
              responseTime: rt, 
              baseUrl: backendBase(), 
              hasAuth: true,
              userEmail 
            });
          } catch (e: any) {
            setBackendStatus({ 
              reachable: false, 
              message: String(e?.message ?? e), 
              baseUrl: backendBase(), 
              hasAuth: true,
              userEmail 
            });
          } finally {
            setPinging(false);
          }
        }
      } catch (e) {
        console.error('[OpenAI Test] Auth check failed:', e);
      }
    };
    checkAuth();
  }, []);

  const onRun = useCallback(async () => {
    if (!prompt.trim()) {
      console.log('Error: Please enter a prompt');
      return;
    }

    if (testType === 'screenshot') {
      alert('For screenshot tests, use the "Analyze" buttons in the Screenshot Analysis section above.');
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      console.log('[OpenAI Test] Starting test with:', { prompt, model, maxTokens, temperature, testType });
      console.log('[OpenAI Test] tRPC endpoint:', `${backendBase()}/api/trpc`);
      
      const startTime = Date.now();
      const response = await testMutation.mutateAsync({
        prompt,
        model,
        maxTokens,
        temperature,
        testType: testType as 'completion' | 'structured' | 'embedding'
      });
      const responseTime = Date.now() - startTime;
      
      console.log('[OpenAI Test] Response received:', response);
      
      if (response.success) {
        setResult({
          success: true,
          result: response.result,
          responseTime,
          model: response.model,
          usage: response.usage
        });
      } else {
        setResult({
          success: false,
          error: response.error || {
            message: 'Unknown error',
            code: 'unknown',
            type: 'unknown'
          },
          responseTime
        });
      }
    } catch (e: any) {
      console.error('[OpenAI Test] Error:', e);
      console.error('[OpenAI Test] Error details:', {
        message: e?.message,
        cause: e?.cause,
        stack: e?.stack,
        name: e?.name
      });
      
      setResult({
        success: false,
        error: {
          message: String(e?.message ?? e),
          code: 'client_error',
          type: 'client_error'
        },
        responseTime: 0
      });
    } finally {
      setRunning(false);
    }
  }, [prompt, model, maxTokens, temperature, testType, testMutation]);



  const onPingBackend = useCallback(async () => {
    setPinging(true);
    try {
      const start = Date.now();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const userEmail = data?.session?.user?.email;
      const res = await fetch(`${backendBase()}/api/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const rt = Date.now() - start;
      let msg: string | undefined = undefined;
      try {
        const json = await res.json();
        msg = typeof json?.message === 'string' ? json.message : JSON.stringify(json);
      } catch {
        msg = 'Non-JSON response';
      }
      setBackendStatus({ reachable: res.ok, status: res.status, message: msg, responseTime: rt, baseUrl: backendBase(), hasAuth: Boolean(token), userEmail });
    } catch (e: any) {
      setBackendStatus({ reachable: false, status: undefined, message: String(e?.message ?? e), responseTime: 0, baseUrl: backendBase(), hasAuth: false });
    } finally {
      setPinging(false);
    }
  }, []);

  const listModelsQuery = trpc.openai.listModels.useQuery(undefined, {
    enabled: false,
  });

  const onCheckStatus = useCallback(async () => {
    try {
      const models = await listModelsQuery.refetch();
      console.log('OpenAI Models:', models.data);
      if (models.data?.success) {
        alert(`OpenAI Status: Configured\nModels available: ${models.data.models?.length || 0}`);
      } else {
        alert(`OpenAI Status: Error\n${models.data?.error}`);
      }
    } catch (e: any) {
      console.error('Status check error:', e);
      alert(`Status check failed: ${e.message}`);
    }
  }, [listModelsQuery]);

  const onTestAgentChat = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    
    setTestingAgent(true);
    setAgentChatResult(null);
    
    try {
      const startTime = Date.now();
      const response = await sendAgentMessage({
        message: prompt,
        context: { use_tools: true }
      });
      const responseTime = Date.now() - startTime;
      
      console.log('[Agent Chat] Response:', response);
      setAgentChatResult({
        success: true,
        message: response.message,
        tools_used: response.tools_used || [],
        conversation_id: response.conversation_id,
        usage: response.usage,
        responseTime
      });
    } catch (e: any) {
      console.error('[Agent Chat] Error:', e);
      setAgentChatResult({
        success: false,
        error: String(e?.message ?? e),
        responseTime: 0
      });
    } finally {
      setTestingAgent(false);
    }
  }, [prompt]);

  const onPickScreenshot = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshotUri(result.assets[0].uri);
        setScreenshotBase64(result.assets[0].base64 || null);
        setScreenshotAnalysis(null);
      }
    } catch (e: any) {
      console.error('Image picker error:', e);
      alert(`Failed to pick image: ${e.message}`);
    }
  }, []);

  const onAnalyzeScreenshot = useCallback(async () => {
    if (!screenshotBase64 || !screenshotUri) {
      alert('Please select a screenshot first');
      return;
    }

    setAnalyzingScreenshot(true);
    setScreenshotAnalysis(null);

    try {
      const startTime = Date.now();

      console.log('[Screenshot Analysis] Starting upload...');

      const fileName = `screenshot-${Date.now()}.jpg`;
      const filePath = `screenshots/${fileName}`;

      const uploadResponse = await apiFetch('/api/v1/files', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          path: filePath,
          contentType: 'image/jpeg',
        }),
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || 'Failed to get upload URL');
      }

      const { url: uploadUrl, path } = await uploadResponse.json();
      console.log('[Screenshot Analysis] Got upload URL, path:', path);

      const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const uploadFileResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: binaryData,
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      console.log('[Screenshot Analysis] File uploaded successfully');

      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);

      console.log('[Screenshot Analysis] Public URL:', publicUrl);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      const requestBody = {
        file_url: publicUrl,
      };

      console.log('[Screenshot Analysis] Sending analysis request:', JSON.stringify(requestBody, null, 2));

      const response = await apiFetch('/api/v1/analysis/screenshot', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;
      const data2 = await response.json();

      console.log('[Screenshot Analysis] Response:', JSON.stringify(data2, null, 2));

      if (!response.ok) {
        throw new Error(data2.error || `HTTP ${response.status}`);
      }

      setScreenshotAnalysis({
        ...data2,
        responseTime,
      });
    } catch (e: any) {
      console.error('Screenshot analysis error:', e);
      setScreenshotAnalysis({
        error: String(e?.message ?? e),
        responseTime: 0,
      });
    } finally {
      setAnalyzingScreenshot(false);
    }
  }, [screenshotBase64, screenshotUri]);

  const runTestSuite = useCallback(async () => {
    setRunningTestSuite(true);
    setTestSuiteResults({});
    const results: Record<string, any> = {};

    const tests = [
      {
        name: 'Health Check',
        endpoint: '/api/health',
        method: 'GET' as const,
        requireAuth: false,
      },
      {
        name: 'Version Check',
        endpoint: '/api/version',
        method: 'GET' as const,
        requireAuth: false,
      },
      {
        name: 'Get Contacts',
        endpoint: '/api/v1/contacts',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Get Messages',
        endpoint: '/api/v1/messages',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Get Interactions',
        endpoint: '/api/v1/interactions',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Get Templates',
        endpoint: '/api/v1/templates',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Get Pipelines',
        endpoint: '/api/v1/pipelines',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Get User Profile',
        endpoint: '/api/v1/me',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Get Entitlements',
        endpoint: '/api/v1/me/entitlements',
        method: 'GET' as const,
        requireAuth: true,
      },
      {
        name: 'Agent Tools List',
        endpoint: '/api/v1/agent/tools',
        method: 'GET' as const,
        requireAuth: true,
      },
    ];

    for (const test of tests) {
      setCurrentTest(test.name);
      const startTime = Date.now();
      
      try {
        const response = await apiFetch(test.endpoint, {
          method: test.method,
          requireAuth: test.requireAuth,
        });
        
        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        results[test.name] = {
          success: response.ok,
          status: response.status,
          responseTime,
          data: response.ok ? data : undefined,
          error: !response.ok ? data : undefined,
        };
      } catch (e: any) {
        const responseTime = Date.now() - startTime;
        results[test.name] = {
          success: false,
          status: 0,
          responseTime,
          error: String(e?.message ?? e),
        };
      }
      
      setTestSuiteResults({ ...results });
    }

    setCurrentTest(null);
    setRunningTestSuite(false);
  }, []);

  const onTestVercelScreenshotAPI = useCallback(async () => {
    if (!screenshotBase64 || !screenshotUri) {
      alert('Please select a screenshot first');
      return;
    }

    setAnalyzingScreenshot(true);
    setScreenshotAnalysis(null);

    try {
      const startTime = Date.now();

      console.log('[Vercel Screenshot API] Starting upload...');

      const fileName = `screenshot-${Date.now()}.jpg`;
      const filePath = `screenshots/${fileName}`;

      const uploadResponse = await apiFetch('/api/v1/files', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          path: filePath,
          contentType: 'image/jpeg',
        }),
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || 'Failed to get upload URL');
      }

      const { url: uploadUrl, path } = await uploadResponse.json();
      console.log('[Vercel Screenshot API] Got upload URL, path:', path);

      const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const uploadFileResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: binaryData,
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      console.log('[Vercel Screenshot API] File uploaded successfully');

      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);

      console.log('[Vercel Screenshot API] Public URL:', publicUrl);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      const requestBody = {
        file_url: publicUrl,
      };

      console.log('[Vercel Screenshot API] Sending analysis request:', JSON.stringify(requestBody, null, 2));

      const response = await apiFetch('/api/v1/analysis/screenshot', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;
      const data2 = await response.json();

      console.log('[Vercel Screenshot API] Response:', JSON.stringify(data2, null, 2));

      if (!response.ok) {
        throw new Error(data2.error || `HTTP ${response.status}`);
      }

      setScreenshotAnalysis({
        ...data2,
        responseTime,
      });
    } catch (e: any) {
      console.error('Vercel screenshot API error:', e);
      setScreenshotAnalysis({
        error: String(e?.message ?? e),
        responseTime: 0,
      });
    } finally {
      setAnalyzingScreenshot(false);
    }
  }, [screenshotBase64, screenshotUri]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Sparkles size={24} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>OpenAI Test Suite</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            <Text style={{ fontWeight: '700' }}>Test OpenAI Local:</Text> Tests local tRPC endpoints{"\n"}
            <Text style={{ fontWeight: '700' }}>Test Agent:</Text> Tests backend Vercel agent API
          </Text>
        </View>

        <View style={[styles.statusCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={styles.statusRow}>
            <Server size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Base URL</Text>
            <Text selectable style={[styles.statusValue, { color: theme.colors.text }]}>{backendStatus.baseUrl}</Text>
          </View>
          <View style={styles.statusRow}>
            <ShieldCheck size={16} color={backendStatus.hasAuth ? theme.colors.success : theme.colors.error} />
            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Auth</Text>
            <Text style={[styles.statusValue, { color: backendStatus.hasAuth ? theme.colors.success : theme.colors.error }]} numberOfLines={1}>
              {backendStatus.hasAuth 
                ? (backendStatus.userEmail || 'Token present') 
                : 'No token - sign in required'}
            </Text>
          </View>
          <View style={styles.statusFooter}>
            <View style={[styles.statusPill, { backgroundColor: backendStatus.reachable ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
              <Text style={[styles.statusPillText, { color: backendStatus.reachable ? theme.colors.success : theme.colors.error }]}>{backendStatus.reachable ? `Reachable ${backendStatus.status ?? ''}` : 'Unreachable'}</Text>
            </View>
            {typeof backendStatus.responseTime === 'number' && backendStatus.responseTime > 0 && (
              <Text style={[styles.responseTime, { color: theme.colors.textSecondary }]}>{backendStatus.responseTime}ms</Text>
            )}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="ping-backend" style={[styles.runBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} onPress={onPingBackend} disabled={pinging} accessibilityRole="button">
              {pinging ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.runContent}>
                  <Server size={16} color="#fff" />
                  <Text style={styles.runText}>Ping Backend</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity testID="check-status" style={[styles.runBtn, { backgroundColor: '#0ea5e9', flex: 1 }]} onPress={onCheckStatus} accessibilityRole="button">
              <View style={styles.runContent}>
                <CheckCircle2 size={16} color="#fff" />
                <Text style={styles.runText}>Check Status</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderColor: cloudModeEnabled ? theme.colors.success : theme.colors.error }]}>
          {cloudModeEnabled ? (
            <View style={styles.bannerRow}>
              <CheckCircle2 size={18} color={theme.colors.success} />
              <Text style={[styles.bannerText, { color: theme.colors.textSecondary }]}>Cloud mode enabled. Using OpenAI when available; falls back locally if needed.</Text>
            </View>
          ) : (
            <View style={styles.bannerRow}>
              <XCircle size={18} color={theme.colors.error} />
              <Text style={[styles.bannerText, { color: theme.colors.textSecondary }]}>Cloud mode off. This will use local templates instead of OpenAI.</Text>
            </View>
          )}
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Prompt</Text>
          <TextInput
            testID="oa-prompt"
            placeholder="Enter your test prompt here..."
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.inputMultiline, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            value={prompt}
            onChangeText={setPrompt}
            accessibilityLabel="Test prompt"
            multiline
          />
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Model</Text>
          <View style={styles.inlineRow}>
            {(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] as const).map((m) => (
              <TouchableOpacity key={m} testID={`model-${m}`} style={[styles.pill, model === m ? { backgroundColor: theme.colors.primary } : { borderColor: theme.colors.border }]} onPress={() => setModel(m)}>
                <Text style={[styles.pillText, { color: model === m ? '#fff' : theme.colors.text }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Test Type</Text>
          <View style={styles.inlineRow}>
            {(['completion', 'structured', 'embedding', 'screenshot'] as const).map((t) => (
              <TouchableOpacity key={t} testID={`type-${t}`} style={[styles.pill, testType === t ? { backgroundColor: theme.colors.primary } : { borderColor: theme.colors.border }]} onPress={() => setTestType(t)}>
                <Text style={[styles.pillText, { color: testType === t ? '#fff' : theme.colors.text }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Max Tokens: {maxTokens}</Text>
          <View style={styles.sliderContainer}>
            <TouchableOpacity onPress={() => setMaxTokens(Math.max(1, maxTokens - 50))} style={styles.sliderButton}>
              <Text style={[styles.sliderButtonText, { color: theme.colors.primary }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.sliderValue, { color: theme.colors.text }]}>{maxTokens}</Text>
            <TouchableOpacity onPress={() => setMaxTokens(Math.min(4000, maxTokens + 50))} style={styles.sliderButton}>
              <Text style={[styles.sliderButtonText, { color: theme.colors.primary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Temperature: {temperature}</Text>
          <View style={styles.sliderContainer}>
            <TouchableOpacity onPress={() => setTemperature(Math.max(0, Math.round((temperature - 0.1) * 10) / 10))} style={styles.sliderButton}>
              <Text style={[styles.sliderButtonText, { color: theme.colors.primary }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.sliderValue, { color: theme.colors.text }]}>{temperature}</Text>
            <TouchableOpacity onPress={() => setTemperature(Math.min(2, Math.round((temperature + 0.1) * 10) / 10))} style={styles.sliderButton}>
              <Text style={[styles.sliderButtonText, { color: theme.colors.primary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {testType === 'screenshot' && (
          <View style={[styles.screenshotSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.screenshotHeader}>
              <Camera size={18} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Screenshot Analysis</Text>
            </View>
            
            <TouchableOpacity 
              testID="pick-screenshot" 
              style={[styles.screenshotPickerBtn, { borderColor: theme.colors.border }]} 
              onPress={onPickScreenshot}
            >
              {screenshotUri ? (
                <View style={styles.screenshotPreviewContainer}>
                  <Image source={{ uri: screenshotUri }} style={styles.screenshotPreview} />
                  <View style={styles.screenshotOverlay}>
                    <ImageIcon size={20} color="#fff" />
                    <Text style={styles.screenshotOverlayText}>Tap to change</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.screenshotPlaceholder}>
                  <ImageIcon size={32} color={theme.colors.textSecondary} />
                  <Text style={[styles.screenshotPlaceholderText, { color: theme.colors.textSecondary }]}>Tap to select screenshot</Text>
                </View>
              )}
            </TouchableOpacity>

            {screenshotUri && (
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  testID="analyze-screenshot-general" 
                  style={[styles.runBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} 
                  onPress={onAnalyzeScreenshot} 
                  disabled={analyzingScreenshot}
                >
                  {analyzingScreenshot ? <ActivityIndicator color="#fff" /> : (
                    <View style={styles.runContent}>
                      <Sparkles size={16} color="#fff" />
                      <Text style={styles.runText}>Analyze (General)</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  testID="analyze-screenshot-message-goal" 
                  style={[styles.runBtn, { backgroundColor: '#10b981', flex: 1 }]} 
                  onPress={onTestVercelScreenshotAPI} 
                  disabled={analyzingScreenshot}
                >
                  {analyzingScreenshot ? <ActivityIndicator color="#fff" /> : (
                    <View style={styles.runContent}>
                      <Server size={16} color="#fff" />
                      <Text style={styles.runText}>Message Goal</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {screenshotAnalysis && (
              <View style={[styles.analysisResults, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={styles.resultsHeader}>
                  {screenshotAnalysis.error ? (
                    <XCircle size={18} color={theme.colors.error} />
                  ) : (
                    <CheckCircle2 size={18} color={theme.colors.success} />
                  )}
                  <Text style={[styles.resultsTitle, { color: theme.colors.textSecondary }]}>Analysis Results</Text>
                  {screenshotAnalysis.responseTime && (
                    <Text style={[styles.responseTime, { color: theme.colors.textSecondary }]}>({screenshotAnalysis.responseTime}ms)</Text>
                  )}
                </View>

                {screenshotAnalysis.error ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>{screenshotAnalysis.error}</Text>
                ) : (
                  <View style={styles.analysisContent}>
                    {screenshotAnalysis.analysis?.summary && (
                      <View style={styles.analysisItem}>
                        <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Summary:</Text>
                        <Text style={[styles.analysisValue, { color: theme.colors.text }]}>{screenshotAnalysis.analysis.summary}</Text>
                      </View>
                    )}
                    
                    {screenshotAnalysis.analysis?.keyPoints && screenshotAnalysis.analysis.keyPoints.length > 0 && (
                      <View style={styles.analysisItem}>
                        <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Key Points:</Text>
                        {screenshotAnalysis.analysis.keyPoints.map((point: string, i: number) => (
                          <Text key={i} style={[styles.analysisListItem, { color: theme.colors.text }]}>• {point}</Text>
                        ))}
                      </View>
                    )}
                    
                    {screenshotAnalysis.analysis?.suggestedGoals && screenshotAnalysis.analysis.suggestedGoals.length > 0 && (
                      <View style={styles.analysisItem}>
                        <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Suggested Goals:</Text>
                        {screenshotAnalysis.analysis.suggestedGoals.map((goal: string, i: number) => (
                          <Text key={i} style={[styles.analysisListItem, { color: theme.colors.text }]}>• {goal}</Text>
                        ))}
                      </View>
                    )}
                    
                    {screenshotAnalysis.analysis?.entities && (
                      <View style={styles.analysisItem}>
                        <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Entities:</Text>
                        <Text style={[styles.analysisValue, { color: theme.colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }]}>
                          {JSON.stringify(screenshotAnalysis.analysis.entities, null, 2)}
                        </Text>
                      </View>
                    )}
                    
                    {screenshotAnalysis.analysis?.sentiment && (
                      <View style={styles.analysisItem}>
                        <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Sentiment:</Text>
                        <Text style={[styles.analysisValue, { color: theme.colors.text }]}>{screenshotAnalysis.analysis.sentiment}</Text>
                      </View>
                    )}
                    
                    {screenshotAnalysis.metadata && (
                      <View style={styles.analysisItem}>
                        <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Metadata:</Text>
                        <Text style={[styles.analysisValue, { color: theme.colors.text, fontSize: 11 }]}>
                          Model: {screenshotAnalysis.metadata.model || 'N/A'}
                          {screenshotAnalysis.metadata.tokensUsed && ` | Tokens: ${screenshotAnalysis.metadata.tokensUsed}`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.spacer} />

        <View style={styles.buttonRow}>
          <TouchableOpacity testID="run-test" style={[styles.runBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} onPress={onRun} disabled={running} accessibilityRole="button">
            {running ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.runContent}>
                <Zap size={16} color="#fff" />
                <Text style={styles.runText}>Test OpenAI Local</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity testID="test-agent" style={[styles.runBtn, { backgroundColor: '#6366f1', flex: 1 }]} onPress={onTestAgentChat} disabled={testingAgent} accessibilityRole="button">
            {testingAgent ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.runContent}>
                <Sparkles size={16} color="#fff" />
                <Text style={styles.runText}>Test Agent (Vercel)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              {result.success ? (
                <CheckCircle2 size={18} color={theme.colors.success} />
              ) : (
                <XCircle size={18} color={theme.colors.error} />
              )}
              <Text style={[styles.resultsTitle, { color: theme.colors.textSecondary }]}>Local OpenAI Results</Text>
              <Text style={[styles.responseTime, { color: theme.colors.textSecondary }]}>({result.responseTime}ms)</Text>
            </View>

            {result.success ? (
              <View style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {result.model && (
                  <Text style={[styles.resultMeta, { color: theme.colors.textSecondary }]}>Model: {result.model}</Text>
                )}
                {result.usage && (
                  <Text style={[styles.resultMeta, { color: theme.colors.textSecondary }]}>Tokens: {result.usage.prompt_tokens || 0} → {result.usage.completion_tokens || 0}</Text>
                )}
                
                {result.result?.content && (
                  <Text style={[styles.resultText, { color: theme.colors.text }]}>{result.result.content}</Text>
                )}
              </View>
            ) : (
              <View style={[styles.errorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
                <Text style={[styles.errorTitle, { color: theme.colors.error }]}>{result.error?.code || 'Error'}</Text>
                <Text style={[styles.errorText, { color: theme.colors.text }]}>{result.error?.message || 'Unknown error'}</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.testSuiteSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.screenshotHeader}>
            <CheckCircle2 size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>API Test Suite</Text>
          </View>
          
          <Text style={[styles.infoText, { color: theme.colors.textSecondary, marginBottom: 12 }]}>Test all backend Vercel endpoints</Text>
          
          <TouchableOpacity 
            testID="run-test-suite" 
            style={[styles.runBtn, { backgroundColor: theme.colors.primary }]} 
            onPress={runTestSuite} 
            disabled={runningTestSuite}
          >
            {runningTestSuite ? (
              <View style={styles.runContent}>
                <ActivityIndicator color="#fff" />
                {currentTest && <Text style={styles.runText}>Testing: {currentTest}</Text>}
              </View>
            ) : (
              <View style={styles.runContent}>
                <Zap size={16} color="#fff" />
                <Text style={styles.runText}>Run Full Test Suite</Text>
              </View>
            )}
          </TouchableOpacity>

          {Object.keys(testSuiteResults).length > 0 && (
            <View style={[styles.testSuiteResults, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary, marginBottom: 8 }]}>Test Results:</Text>
              
              {Object.entries(testSuiteResults).map(([testName, result]: [string, any]) => (
                <View key={testName} style={[styles.testResultItem, { borderColor: theme.colors.border }]}>
                  <View style={styles.testResultHeader}>
                    {result.success ? (
                      <CheckCircle2 size={14} color={theme.colors.success} />
                    ) : (
                      <XCircle size={14} color={theme.colors.error} />
                    )}
                    <Text style={[styles.testResultName, { color: theme.colors.text }]}>{testName}</Text>
                    <Text style={[styles.testResultStatus, { color: result.success ? theme.colors.success : theme.colors.error }]}>
                      {result.status}
                    </Text>
                    <Text style={[styles.responseTime, { color: theme.colors.textSecondary }]}>
                      {result.responseTime}ms
                    </Text>
                  </View>
                  
                  {result.error && (
                    <Text style={[styles.testResultError, { color: theme.colors.error }]}>
                      {typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}
                    </Text>
                  )}
                  
                  {result.data && (
                    <Text style={[styles.testResultData, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data).substring(0, 100)}...
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {agentChatResult && (
          <View style={[styles.agentResultsSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.resultsHeader}>
              {agentChatResult.success ? (
                <CheckCircle2 size={18} color={theme.colors.success} />
              ) : (
                <XCircle size={18} color={theme.colors.error} />
              )}
              <Text style={[styles.resultsTitle, { color: theme.colors.textSecondary }]}>Agent Results (Backend Vercel)</Text>
              <Text style={[styles.responseTime, { color: theme.colors.textSecondary }]}>({agentChatResult.responseTime}ms)</Text>
            </View>

            {agentChatResult.success ? (
              <View style={styles.agentResultContent}>
                <View style={styles.analysisItem}>
                  <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Response:</Text>
                  <Text style={[styles.analysisValue, { color: theme.colors.text }]}>{agentChatResult.message}</Text>
                </View>
                
                {agentChatResult.tools_used && agentChatResult.tools_used.length > 0 && (
                  <View style={styles.analysisItem}>
                    <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Tools Used:</Text>
                    <Text style={[styles.analysisValue, { color: theme.colors.text }]}>{agentChatResult.tools_used.join(', ')}</Text>
                  </View>
                )}
                
                {agentChatResult.conversation_id && (
                  <View style={styles.analysisItem}>
                    <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Conversation ID:</Text>
                    <Text style={[styles.analysisValue, { color: theme.colors.text, fontSize: 11 }]}>{agentChatResult.conversation_id}</Text>
                  </View>
                )}
                
                {agentChatResult.usage && (
                  <View style={styles.analysisItem}>
                    <Text style={[styles.analysisLabel, { color: theme.colors.textSecondary }]}>Token Usage:</Text>
                    <Text style={[styles.analysisValue, { color: theme.colors.text }]}>
                      Prompt: {agentChatResult.usage.prompt_tokens || 0} | Completion: {agentChatResult.usage.completion_tokens || 0} | Total: {agentChatResult.usage.total_tokens || 0}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.agentErrorContent}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{agentChatResult.error}</Text>
              </View>
            )}
          </View>
        )}



        <View style={[styles.bottomSpacer, { height: insets.bottom + 16 }]} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backButton: { padding: 8, marginLeft: -8, marginRight: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 4 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText: { fontSize: 12 },
  formRow: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  inputMultiline: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' as const },
  inlineRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  runBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  runContent: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  runText: { color: '#fff', fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12 },
  errorText: { fontSize: 12 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  resultsTitle: { fontSize: 12, fontWeight: '600' },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 },
  sliderButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  sliderButtonText: { fontSize: 18, fontWeight: '600' },
  sliderValue: { fontSize: 16, fontWeight: '600', minWidth: 40, textAlign: 'center' },
  resultsContainer: { marginTop: 16 },
  responseTime: { fontSize: 12, marginLeft: 'auto' },
  resultCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 8 },
  resultMeta: { fontSize: 12, marginBottom: 8 },
  resultText: { fontSize: 14, lineHeight: 20 },
  jsonContainer: { marginTop: 8 },
  jsonText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  errorCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 8 },
  errorTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  modelsSection: { marginTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modelsContainer: { flexDirection: 'row' },
  modelChip: { borderWidth: 1, borderRadius: 8, padding: 8, marginRight: 8, minWidth: 120 },
  modelName: { fontSize: 12, fontWeight: '600' },
  modelOwner: { fontSize: 10, marginTop: 2 },
  spacer: { height: 12 },
  bottomSpacer: { width: '100%' },
  statusCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusValue: { fontSize: 12, flexShrink: 1 },
  statusFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  screenshotSection: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  screenshotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenshotPickerBtn: { borderWidth: 2, borderRadius: 12, borderStyle: 'dashed', overflow: 'hidden', minHeight: 200 },
  screenshotPreviewContainer: { position: 'relative', width: '100%', height: 200 },
  screenshotPreview: { width: '100%', height: '100%', resizeMode: 'contain' },
  screenshotOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  screenshotOverlayText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  screenshotPlaceholder: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  screenshotPlaceholderText: { fontSize: 14 },
  analysisResults: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  analysisContent: { gap: 12 },
  analysisItem: { gap: 4 },
  analysisLabel: { fontSize: 12, fontWeight: '600' },
  analysisValue: { fontSize: 13, lineHeight: 18 },
  analysisListItem: { fontSize: 13, lineHeight: 18, paddingLeft: 8 },
  agentResultsSection: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 16, gap: 12 },
  agentResultContent: { gap: 12 },
  agentErrorContent: { padding: 8 },
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  infoText: { fontSize: 12, lineHeight: 18 },
  testSuiteSection: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 16, gap: 12 },
  testSuiteResults: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginTop: 8 },
  testResultItem: { borderBottomWidth: 1, paddingVertical: 8, gap: 4 },
  testResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testResultName: { fontSize: 13, fontWeight: '600', flex: 1 },
  testResultStatus: { fontSize: 12, fontWeight: '700' },
  testResultError: { fontSize: 11, marginLeft: 20, marginTop: 2 },
  testResultData: { fontSize: 10, marginLeft: 20, marginTop: 2 },
});
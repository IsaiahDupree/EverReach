import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { apiFetch } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, XCircle, CheckCircle2, Cpu, Database, Zap } from 'lucide-react-native';

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
  const { theme, cloudModeEnabled } = useAppSettings();
  const [prompt, setPrompt] = useState<string>('Write a short, friendly message to check in with a colleague about their recent project.');
  const [model, setModel] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo'>('gpt-4o-mini');
  const [maxTokens, setMaxTokens] = useState<number>(150);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [testType, setTestType] = useState<'completion' | 'structured' | 'embedding'>('completion');

  const [running, setRunning] = useState<boolean>(false);
  const [runningAll, setRunningAll] = useState<boolean>(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [allResults, setAllResults] = useState<{ [key: string]: TestResult }>({});
  const [models, setModels] = useState<any[]>([]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const onRun = useCallback(async () => {
    if (!prompt.trim()) {
      console.log('Error: Please enter a prompt');
      return;
    }

    setRunning(true);
    setResult(null);

    const startTime = Date.now();

    try {
      // Call backend-vercel REST API
      const response = await apiFetch('/v1/openai/test', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          model,
          max_tokens: maxTokens,
          temperature,
          test_type: testType
        })
      });

      const responseTime = Date.now() - startTime;

      setResult({
        success: true,
        result: response,
        responseTime,
        model: response.model,
        usage: response.usage
      });
    } catch (e: any) {
      const responseTime = Date.now() - startTime;
      setResult({
        success: false,
        error: {
          message: e?.message || String(e),
          code: e?.code || 'client_error',
          type: e?.type || 'client_error'
        },
        responseTime
      });
    } finally {
      setRunning(false);
    }
  }, [prompt, model, maxTokens, temperature, testType]);

  const onRunAll = useCallback(async () => {
    if (!prompt.trim()) {
      console.log('Error: Please enter a prompt');
      return;
    }

    setRunningAll(true);
    setAllResults({});
    setResult(null);

    const testTypes: ('completion' | 'structured' | 'embedding')[] = ['completion', 'structured', 'embedding'];
    const results: { [key: string]: TestResult } = {};

    for (const type of testTypes) {
      const startTime = Date.now();
      try {
        console.log(`Running ${type} test...`);
        
        const response = await apiFetch('/v1/openai/test', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            model,
            max_tokens: maxTokens,
            temperature,
            test_type: type
          })
        });

        const responseTime = Date.now() - startTime;

        results[type] = {
          success: true,
          result: response,
          responseTime,
          model: response.model,
          usage: response.usage
        };
      } catch (e: any) {
        const responseTime = Date.now() - startTime;
        results[type] = {
          success: false,
          error: {
            message: e?.message || String(e),
            code: e?.code || 'client_error',
            type: e?.type || 'client_error'
          },
          responseTime
        };
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setAllResults(results);
    setRunningAll(false);
  }, [prompt, model, maxTokens, temperature]);

  // Load available models on mount
  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiFetch('/v1/openai/test', {
          method: 'GET'
        });
        if (response.configured) {
          // Models are available via OpenAI
          console.log('OpenAI configured:', response.model);
        }
      } catch (e) {
        console.error('Failed to check OpenAI status:', e);
      }
    };
    loadModels();
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Sparkles size={24} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>OpenAI Generation Test</Text>
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
            {(['completion', 'structured', 'embedding'] as const).map((t) => (
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



        <View style={styles.spacer} />

        <View style={styles.buttonRow}>
          <TouchableOpacity testID="run-test" style={[styles.runBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} onPress={onRun} disabled={running || runningAll} accessibilityRole="button">
            {running ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.runContent}>
                {testType === 'embedding' ? <Database size={16} color="#fff" /> : testType === 'structured' ? <Cpu size={16} color="#fff" /> : <Zap size={16} color="#fff" />}
                <Text style={styles.runText}>Test {testType}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity testID="run-all" style={[styles.runBtn, { backgroundColor: '#6366f1', flex: 1 }]} onPress={onRunAll} disabled={running || runningAll} accessibilityRole="button">
            {runningAll ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.runContent}>
                <Sparkles size={16} color="#fff" />
                <Text style={styles.runText}>Run All</Text>
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
              <Text style={[styles.resultsTitle, { color: theme.colors.textSecondary }]}>Results</Text>
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
                
                {testType === 'completion' && result.result?.content && (
                  <Text style={[styles.resultText, { color: theme.colors.text }]}>{result.result.content}</Text>
                )}
                
                {testType === 'structured' && (
                  <ScrollView horizontal style={styles.jsonContainer}>
                    <Text style={[styles.jsonText, { color: theme.colors.text }]}>{JSON.stringify(result.result, null, 2)}</Text>
                  </ScrollView>
                )}
                
                {testType === 'embedding' && result.result && (
                  <View>
                    <Text style={[styles.resultMeta, { color: theme.colors.textSecondary }]}>Dimensions: {result.result.dimensions}</Text>
                    <Text style={[styles.resultText, { color: theme.colors.text }]}>Preview: [{result.result.embedding.join(', ')}...]</Text>
                  </View>
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

        {models.length > 0 && (
          <View style={styles.modelsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Available Models</Text>
            <ScrollView horizontal style={styles.modelsContainer}>
              {models.slice(0, 10).map((model, i) => (
                <View key={model.id} style={[styles.modelChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.modelName, { color: theme.colors.text }]}>{model.id}</Text>
                  <Text style={[styles.modelOwner, { color: theme.colors.textSecondary }]}>{model.ownedBy}</Text>
                </View>
              ))}
            </ScrollView>
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
});
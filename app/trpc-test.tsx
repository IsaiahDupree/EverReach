import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { trpc, trpcClient } from '@/lib/trpc';

export default function TRPCTestScreen() {
  const [prompt, setPrompt] = useState('Hello, how are you?');
  const [model, setModel] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo'>('gpt-4o-mini');
  const [testType, setTestType] = useState<'completion' | 'structured' | 'embedding'>('completion');

  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelsResult, setModelsResult] = useState<any>(null);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Test using standalone client instead of hooks
  const testWithStandaloneClient = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      // Test basic connection first
      const result = await (trpcClient as any).example.hi.mutate({ name: 'Test User' });
      console.log('✅ tRPC Test Success:', result);
      setTestResult({ success: true, data: result });
    } catch (error: any) {
      console.error('❌ tRPC Test Error:', error);
      setTestResult({ success: false, error: error.message });
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModels = async () => {
    setModelsLoading(true);
    try {
      // Test basic connection
      const result = await (trpcClient as any).example.hi.mutate({ name: 'Connection Test' });
      setModelsResult({ success: true, message: 'Connection successful', data: result });
    } catch (error: any) {
      setModelsResult({ success: false, error: error.message });
    } finally {
      setModelsLoading(false);
    }
  };

  React.useEffect(() => {
    loadModels();
  }, []);

  const handleTest = () => {
    testWithStandaloneClient();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'tRPC API Test' }} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>tRPC API Test</Text>
        <Text style={styles.subtitle}>Test OpenAI integration via tRPC</Text>

        {/* Test Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          
          <Text style={styles.label}>Prompt:</Text>
          <TextInput
            style={styles.textInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Enter test prompt..."
            multiline
          />

          <Text style={styles.label}>Test Type:</Text>
          <View style={styles.buttonRow}>
            {(['completion', 'structured', 'embedding'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, testType === type && styles.typeButtonActive]}
                onPress={() => setTestType(type)}
              >
                <Text style={[styles.typeButtonText, testType === type && styles.typeButtonTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Model:</Text>
          <View style={styles.buttonRow}>
            {(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modelButton, model === m && styles.modelButtonActive]}
                onPress={() => setModel(m)}
              >
                <Text style={[styles.modelButtonText, model === m && styles.modelButtonTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Test Button */}
        <TouchableOpacity
          style={[styles.testButton, isLoading && styles.testButtonDisabled]}
          onPress={handleTest}
          disabled={isLoading}
        >
          <Text style={styles.testButtonText}>
            {isLoading ? 'Testing...' : 'Run Test'}
          </Text>
        </TouchableOpacity>

        {/* Results */}
        {testResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {testResult.success ? '✅ Success' : '❌ Error'}
            </Text>
            
            {testResult.success ? (
              <View>
                <Text style={styles.resultLabel}>Response Time: {testResult.data.responseTime}ms</Text>
                <Text style={styles.resultLabel}>Model: {testResult.data.model}</Text>
                
                <Text style={styles.resultLabel}>Result:</Text>
                <View style={styles.resultBox}>
                  <Text style={styles.resultText}>
                    {JSON.stringify(testResult.data.result, null, 2)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {testResult.error}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Connection Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Test</Text>
          {modelsLoading ? (
            <Text style={styles.loadingText}>Testing connection...</Text>
          ) : modelsResult?.success ? (
            <View>
              <Text style={styles.statusText}>✅ {modelsResult.message}</Text>
              <Text style={styles.resultText}>{JSON.stringify(modelsResult.data, null, 2)}</Text>
            </View>
          ) : modelsResult?.error ? (
            <Text style={styles.errorText}>Error: {modelsResult.error}</Text>
          ) : (
            <Text style={styles.errorText}>Connection not tested</Text>
          )}
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <Text style={styles.statusText}>
            tRPC Client: {trpc ? '✅ Initialized' : '❌ Not initialized'}
          </Text>
          <Text style={styles.statusText}>
            API Endpoint: /api/trpc
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  modelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modelButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  modelButtonText: {
    fontSize: 12,
    color: '#333',
  },
  modelButtonTextActive: {
    color: '#fff',
  },
  testButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonDisabled: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  resultBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  errorText: {
    fontSize: 12,
    color: '#e53e3e',
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modelId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modelOwner: {
    fontSize: 12,
    color: '#666',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});
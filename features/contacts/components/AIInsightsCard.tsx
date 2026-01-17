import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';

export interface AnalysisResponse {
  summary?: string;
  status?: string;
  best_time_contact?: string;
  risk_level?: 'low' | 'medium' | 'high';
}

export interface SuggestionItem {
  id?: string;
  title: string;
  reason?: string;
}

interface ContextFallback {
  last_contact_delta_days?: number | null;
  last_topics?: string[];
}

interface Props {
  loading: boolean;
  analysis: AnalysisResponse | null;
  suggestions: SuggestionItem[];
  contextFallback?: ContextFallback | null;
  onRefresh?: () => void;
}

export default function AIInsightsCard({ loading, analysis, suggestions, contextFallback, onRefresh }: Props) {
  const hasData = Boolean(analysis?.summary) || suggestions.length > 0 || (contextFallback && (contextFallback.last_topics?.length || contextFallback.last_contact_delta_days != null));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI Insights</Text>
        {!!onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Analyzing...</Text>
        </View>
      )}

      {!loading && hasData && (
        <>
          {analysis?.summary && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Summary</Text>
              <Text style={styles.blockText}>{analysis.summary}</Text>
              <View style={styles.metaRow}>
                {analysis.best_time_contact && (
                  <Text style={styles.metaBadge}>Best time: {analysis.best_time_contact}</Text>
                )}
                {analysis.status && (
                  <Text style={styles.metaBadge}>Status: {analysis.status}</Text>
                )}
                {analysis.risk_level && (
                  <Text style={styles.metaBadge}>Risk: {analysis.risk_level}</Text>
                )}
              </View>
            </View>
          )}

          {!analysis?.summary && contextFallback && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Recent Context</Text>
              {typeof contextFallback.last_contact_delta_days === 'number' && (
                <Text style={styles.blockText}>
                  {contextFallback.last_contact_delta_days === 0 ? 'Contacted today' : `Last contact: ${contextFallback.last_contact_delta_days} day(s) ago`}
                </Text>
              )}
              {contextFallback.last_topics && contextFallback.last_topics.length > 0 && (
                <Text style={styles.blockText}>Topics: {contextFallback.last_topics.join(', ')}</Text>
              )}
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Next Actions</Text>
              {suggestions.slice(0, 3).map((s, i) => (
                <View key={s.id || i} style={styles.suggestionRow}>
                  <Text style={styles.bullet}>•</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionTitle}>{s.title}</Text>
                    {!!s.reason && <Text style={styles.suggestionReason}>{s.reason}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {!loading && !hasData && (
        <Text style={styles.emptyText}>No insights yet. Try adding an interaction or asking the assistant.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  refreshBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  refreshText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  block: { marginTop: 8 },
  blockTitle: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  blockText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaBadge: { fontSize: 12, color: '#374151', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  bullet: { fontSize: 16, color: '#111827', lineHeight: 20 },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  suggestionReason: { fontSize: 12, color: '#6B7280' },
  emptyText: { fontSize: 14, color: '#6B7280' },
});

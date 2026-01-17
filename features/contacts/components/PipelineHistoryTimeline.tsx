import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingUp, Clock, CheckCircle } from 'lucide-react-native';

interface PipelineHistoryItem {
  id: string;
  from_stage_name: string | null;
  to_stage_name: string | null;
  moved_at: string;
  pipeline_name?: string;
  notes?: string;
}

interface PipelineHistoryTimelineProps {
  history: PipelineHistoryItem[];
  currentStage?: string;
}

export default function PipelineHistoryTimeline({ 
  history, 
  currentStage 
}: PipelineHistoryTimelineProps) {
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime()
  );

  const getTimeLabel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStageColor = (stageName: string | null | undefined) => {
    if (!stageName || typeof stageName !== 'string') return '#6B7280';
    const stage = stageName.toLowerCase();
    if (stage.includes('new') || stage.includes('added')) return '#9CA3AF';
    if (stage.includes('initial') || stage.includes('contact')) return '#60A5FA';
    if (stage.includes('engaged') || stage.includes('active')) return '#34D399';
    if (stage.includes('qualified') || stage.includes('opportunity')) return '#A78BFA';
    if (stage.includes('closed') || stage.includes('won')) return '#10B981';
    if (stage.includes('lost') || stage.includes('inactive')) return '#EF4444';
    return '#6B7280';
  };

  const isProgression = (fromStage: string | null, toStage: string | null): boolean => {
    if (!fromStage || !toStage || typeof toStage !== 'string') return true;
    
    const progressionOrder = [
      'new', 'added', 'initial', 'contact', 'engaged', 'active', 
      'qualified', 'opportunity', 'negotiation', 'closed', 'won'
    ];
    
    const fromIndex = progressionOrder.findIndex(s => fromStage.toLowerCase().includes(s));
    const toIndex = progressionOrder.findIndex(s => toStage.toLowerCase().includes(s));
    
    return toIndex > fromIndex;
  };

  if (history.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pipeline History</Text>
        <View style={styles.emptyState}>
          <TrendingUp size={32} color="#CCCCCC" />
          <Text style={styles.emptyText}>No pipeline history yet</Text>
          <Text style={styles.emptySubtext}>
            Changes to pipeline stages will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Pipeline History</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{history.length} changes</Text>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroll}
      >
        {sortedHistory.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === sortedHistory.length - 1;
          const isMovingUp = item.from_stage_name ? isProgression(item.from_stage_name, item.to_stage_name) : true;

          return (
            <View key={item.id} style={styles.timelineItem}>
              {!isLast && <View style={styles.timelineConnector} />}

              <View style={[
                styles.timelineNode,
                { backgroundColor: getStageColor(item.to_stage_name) }
              ]}>
                {isFirst ? (
                  <CheckCircle size={12} color="#FFFFFF" />
                ) : (
                  <View style={styles.timelineDot} />
                )}
              </View>

              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineStage}>{item.to_stage_name || 'Unknown Stage'}</Text>
                  {isMovingUp && !isLast && (
                    <View style={styles.progressionBadge}>
                      <TrendingUp size={10} color="#10B981" />
                    </View>
                  )}
                </View>

                {item.from_stage_name && (
                  <Text style={styles.timelineTransition}>
                    From: {item.from_stage_name}
                  </Text>
                )}

                {item.pipeline_name && (
                  <Text style={styles.timelinePipeline}>
                    {item.pipeline_name}
                  </Text>
                )}

                {item.notes && (
                  <Text style={styles.timelineNotes} numberOfLines={2}>
                    {item.notes}
                  </Text>
                )}

                <View style={styles.timelineFooter}>
                  <Clock size={10} color="#9CA3AF" />
                  <Text style={styles.timelineDate}>
                    {getTimeLabel(item.moved_at)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {currentStage && (
        <View style={styles.currentStageBar}>
          <View style={[
            styles.currentStageDot,
            { backgroundColor: getStageColor(currentStage) }
          ]} />
          <Text style={styles.currentStageText}>
            Currently in: <Text style={styles.currentStageBold}>{currentStage}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  timelineScroll: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  timelineItem: {
    position: 'relative',
    marginRight: 16,
  },
  timelineConnector: {
    position: 'absolute',
    left: 14,
    top: 28,
    bottom: -28,
    width: 2,
    backgroundColor: '#E5E7EB',
    zIndex: 0,
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 1,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timelineCard: {
    width: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineStage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  progressionBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineTransition: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  timelinePipeline: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timelineNotes: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 16,
  },
  timelineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  currentStageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  currentStageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  currentStageText: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentStageBold: {
    fontWeight: '600',
    color: '#000000',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center',
  },
});

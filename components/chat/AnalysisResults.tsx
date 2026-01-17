/**
 * Analysis Results Component
 * 
 * Shows AI analysis results with suggested actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ScreenshotAnalysisResult } from '@/hooks/useScreenshotAnalysis';

interface AnalysisResultsProps {
  result: ScreenshotAnalysisResult;
  onExecuteAction: (action: ScreenshotAnalysisResult['suggested_actions'][0]) => void;
}

export default function AnalysisResults({ result, onExecuteAction }: AnalysisResultsProps) {
  const { detected_entities, suggested_actions, vision_summary } = result;

  return (
    <View style={styles.container}>
      {/* AI Summary */}
      {vision_summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Summary</Text>
          <Text style={styles.summaryText}>{vision_summary}</Text>
        </View>
      )}

      {/* Detected Contacts */}
      {detected_entities.contacts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📇 Found {detected_entities.contacts.length} Contact{detected_entities.contacts.length > 1 ? 's' : ''}
          </Text>
          {detected_entities.contacts.map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              <Text style={styles.contactName}>{contact.name}</Text>
              {contact.company && (
                <Text style={styles.contactDetail}>🏢 {contact.company}</Text>
              )}
              {contact.email && (
                <Text style={styles.contactDetail}>✉️ {contact.email}</Text>
              )}
              {contact.phone && (
                <Text style={styles.contactDetail}>📱 {contact.phone}</Text>
              )}
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(contact.confidence * 100)}% confidence
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Items */}
      {detected_entities.action_items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ✅ Action Items ({detected_entities.action_items.length})
          </Text>
          {detected_entities.action_items.map((item, index) => (
            <View key={index} style={styles.actionItem}>
              <Text style={styles.actionItemText}>• {item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Detected Interactions */}
      {detected_entities.interactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            💬 Interactions ({detected_entities.interactions.length})
          </Text>
          {detected_entities.interactions.map((interaction, index) => (
            <View key={index} style={styles.interactionCard}>
              <Text style={styles.interactionType}>{interaction.type}</Text>
              <Text style={styles.interactionSummary}>{interaction.summary}</Text>
              {interaction.date && (
                <Text style={styles.interactionDate}>{interaction.date}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Suggested Actions */}
      {suggested_actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Suggested Actions</Text>
          <View style={styles.actionsContainer}>
            {suggested_actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => onExecuteAction(action)}
              >
                <Text style={styles.actionButtonText}>
                  {getActionLabel(action.type)}
                </Text>
                <Text style={styles.actionConfidence}>
                  {Math.round(action.confidence * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function getActionLabel(type: string): string {
  switch (type) {
    case 'create_contact':
      return '📇 Create Contact';
    case 'create_interaction':
      return '💬 Log Interaction';
    case 'add_note':
      return '📝 Add Note';
    default:
      return type.replace('_', ' ');
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#495057',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 6,
  },
  contactDetail: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  confidenceBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0c8599',
  },
  actionItem: {
    paddingVertical: 6,
  },
  actionItemText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  interactionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  interactionType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  interactionSummary: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 4,
  },
  interactionDate: {
    fontSize: 12,
    color: '#adb5bd',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionConfidence: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

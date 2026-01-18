/**
 * APP-KIT: Developer Mode Overlay
 * 
 * This component shows in-app hints for customization.
 * It only appears when APP_CONFIG.DEV_MODE is true.
 * 
 * ✅ KEEP: This helps you understand what to customize
 * 🗑️ REMOVE: Delete this file before production release
 */
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  StyleSheet 
} from 'react-native';
import { Info, X, ChevronRight } from 'lucide-react-native';

interface CustomizationItem {
  id: string;
  title: string;
  file: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const CUSTOMIZATION_CHECKLIST: CustomizationItem[] = [
  {
    id: '1',
    title: 'App Name & Branding',
    file: 'constants/config.ts',
    description: 'Change APP_NAME, APP_SLUG, and update app.json with your app identity.',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Color Theme',
    file: 'constants/colors.ts',
    description: 'Replace the color palette with your brand colors.',
    priority: 'high',
  },
  {
    id: '3',
    title: 'Business Logic - Data Models',
    file: 'types/models.ts',
    description: 'Replace Contact/Item types with your own data structures.',
    priority: 'high',
  },
  {
    id: '4',
    title: 'Business Logic - API Calls',
    file: 'services/api.ts',
    description: 'Replace CRUD operations with your own API endpoints.',
    priority: 'high',
  },
  {
    id: '5',
    title: 'Business Logic - Main Screen',
    file: 'app/(tabs)/index.tsx',
    description: 'Replace the item list with your core feature UI.',
    priority: 'high',
  },
  {
    id: '6',
    title: 'Subscription Tiers',
    file: 'constants/config.ts',
    description: 'Set your pricing and feature limits for each tier.',
    priority: 'medium',
  },
  {
    id: '7',
    title: 'Onboarding Screens',
    file: 'app/(auth)/onboarding.tsx',
    description: 'Customize welcome screens for your app.',
    priority: 'medium',
  },
  {
    id: '8',
    title: 'Settings Options',
    file: 'app/(tabs)/settings.tsx',
    description: 'Add/remove settings relevant to your app.',
    priority: 'low',
  },
  {
    id: '9',
    title: 'Push Notification Topics',
    file: 'services/notifications.ts',
    description: 'Configure notification types for your use case.',
    priority: 'low',
  },
  {
    id: '10',
    title: 'Remove Dev Mode',
    file: 'constants/config.ts',
    description: 'Set DEV_MODE to false before publishing.',
    priority: 'low',
  },
];

export function DevModeOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CustomizationItem | null>(null);

  const priorityColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981',
  };

  return (
    <>
      {/* Floating Dev Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsOpen(true)}
      >
        <Info color="white" size={24} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEV</Text>
        </View>
      </TouchableOpacity>

      {/* Customization Guide Modal */}
      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>🛠️ APP-KIT Dev Mode</Text>
                <Text style={styles.subtitle}>Customization Checklist</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            {/* Checklist */}
            <ScrollView style={styles.list}>
              {CUSTOMIZATION_CHECKLIST.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listItem}
                  onPress={() => setSelectedItem(item)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemFile}>{item.file}</Text>
                  </View>
                  <ChevronRight color="#9CA3AF" size={20} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Set <Text style={styles.code}>DEV_MODE: false</Text> in config.ts to hide this overlay
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedItem} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedItem(null)}
            >
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
            
            {selectedItem && (
              <>
                <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                <View style={styles.fileBox}>
                  <Text style={styles.fileLabel}>📁 File to edit:</Text>
                  <Text style={styles.fileName}>{selectedItem.file}</Text>
                </View>
                <Text style={styles.detailDesc}>{selectedItem.description}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColors[selectedItem.priority] + '20' }]}>
                  <Text style={[styles.priorityText, { color: priorityColors[selectedItem.priority] }]}>
                    {selectedItem.priority.toUpperCase()} PRIORITY
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  itemFile: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  detailContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  fileBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#111827',
    marginTop: 4,
  },
  detailDesc: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

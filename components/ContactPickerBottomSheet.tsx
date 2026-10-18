import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from 'react-native';
import { Search, X, ChevronDown, User } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import { useWarmth } from '@/providers/WarmthProvider';
import Avatar from './Avatar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% of screen

interface ContactPickerBottomSheetProps {
  selectedId?: string | null;
  onSelect: (contactId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ContactPickerBottomSheet({
  selectedId,
  onSelect,
  placeholder = 'Select Contact',
  disabled = false,
}: ContactPickerBottomSheetProps) {
  const { people } = usePeople();
  const { getWarmth } = useWarmth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Auto-focus search when sheet opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure sheet animation completes
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const selectedContact = people.find(p => p.id === selectedId);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    // Deduplicate by ID
    const uniqueMap = new Map<string, typeof people[0]>();
    people.forEach(person => {
      if (person.id && !uniqueMap.has(person.id)) {
        uniqueMap.set(person.id, person);
      }
    });
    const uniquePeople = Array.from(uniqueMap.values());
    
    // Filter by search
    const filtered = !searchQuery.trim()
      ? uniquePeople
      : uniquePeople.filter(person => {
          const query = searchQuery.toLowerCase();
          return (
            person.fullName.toLowerCase().includes(query) ||
            person.company?.toLowerCase().includes(query) ||
            person.tags?.some(tag => tag.toLowerCase().includes(query))
          );
        });
    
    // Sort alphabetically
    return filtered.sort((a, b) => 
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
    );
  }, [people, searchQuery]);

  const handleSelect = useCallback((contactId: string) => {
    onSelect(contactId);
    setIsOpen(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, [onSelect]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);

  const renderContactItem = useCallback(({ item }: { item: typeof people[0] }) => {
    const warmth = getWarmth(item.id);
    const isSelected = item.id === selectedId;

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && styles.contactItemSelected,
        ]}
        onPress={() => handleSelect(item.id)}
        activeOpacity={0.7}
      >
        <Avatar
          name={item.fullName}
          photoUrl={item.photo_url}
          avatarUrl={item.avatarUrl}
          size={44}
          warmthColor={warmth.color}
          borderWidth={2}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.fullName}
          </Text>
          {item.company && (
            <Text style={styles.contactCompany} numberOfLines={1}>
              {item.company}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: warmth.color }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedId, getWarmth, handleSelect]);

  const keyExtractor = useCallback((item: typeof people[0]) => item.id, []);

  return (
    <>
      {/* Compact Trigger Button */}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => setIsOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          {selectedContact ? (
            <>
              <Avatar
                name={selectedContact.fullName}
                photoUrl={selectedContact.photo_url}
                avatarUrl={selectedContact.avatarUrl}
                size={32}
                warmthColor={getWarmth(selectedContact.id).color}
                borderWidth={2}
              />
              <Text style={styles.triggerText} numberOfLines={1}>
                {selectedContact.fullName}
              </Text>
            </>
          ) : (
            <>
              <User size={20} color="#9CA3AF" />
              <Text style={styles.triggerPlaceholder}>{placeholder}</Text>
            </>
          )}
          <ChevronDown size={20} color="#9CA3AF" style={styles.chevron} />
        </View>
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          >
            {/* Empty - just for dismiss */}
          </TouchableOpacity>

          {/* Sheet Container */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheetContainer}
          >
            <View style={styles.sheet}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Contact</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Search Bar - Prominent */}
              <View style={styles.searchContainer}>
                <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search by name, company, or tag..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Results Count */}
              <Text style={styles.resultsCount}>
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
              </Text>

              {/* Contact List */}
              <FlatList
                data={filteredContacts}
                renderItem={renderContactItem}
                keyExtractor={keyExtractor}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <User size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </Text>
                    {searchQuery && (
                      <Text style={styles.emptyHint}>
                        Try a different search term
                      </Text>
                    )}
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger button
  trigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  triggerDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  triggerPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  chevron: {
    marginLeft: 'auto',
  },

  // Bottom Sheet
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: BOTTOM_SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },

  // Results count
  resultsCount: {
    fontSize: 13,
    color: '#6B7280',
    marginHorizontal: 20,
    marginBottom: 8,
  },

  // Contact List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  contactItemSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

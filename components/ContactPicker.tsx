import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Search, X, ChevronDown, User } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import { useWarmth } from '@/providers/WarmthProvider';
import CrossPlatformTextInput from './CrossPlatformTextInput';
import Avatar from './Avatar';

const { width } = Dimensions.get('window');

interface ContactPickerProps {
  selectedId?: string | null;
  onSelect?: (contactId: string) => void;
  // Multi-select support
  multiSelect?: boolean;
  selectedIds?: string[];
  onChangeSelected?: (contactIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ContactPicker({
  selectedId,
  onSelect,
  multiSelect = false,
  selectedIds = [],
  onChangeSelected,
  placeholder = 'Select Contact',
  disabled = false,
}: ContactPickerProps) {
  const { people } = usePeople();
  const { getWarmth } = useWarmth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Debug log when modal opens
  React.useEffect(() => {
    if (isOpen) {
      console.log('[ContactPicker] Modal opened. People count:', people.length);
      console.log('[ContactPicker] First 3 people:', people.slice(0, 3).map(p => ({ id: p.id, name: p.fullName })));
    }
  }, [isOpen, people]);

  const selectedContact = !multiSelect ? people.find(p => p.id === selectedId) : null;

  // Filter contacts based on search and deduplicate by ID
  const filteredContacts = useMemo(() => {
    // First, deduplicate contacts by ID using Map
    const uniqueMap = new Map<string, typeof people[0]>();
    people.forEach(person => {
      if (person.id && !uniqueMap.has(person.id)) {
        uniqueMap.set(person.id, person);
      }
    });
    const uniquePeople = Array.from(uniqueMap.values());
    
    // Then filter based on search
    const base = !searchQuery.trim()
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
    const sorted = [...base].sort((a, b) => 
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
    );
    
    // Debug: Log if we found duplicates
    if (people.length !== uniquePeople.length) {
      console.warn('[ContactPicker] Found duplicate contacts:', people.length - uniquePeople.length, 'duplicates removed');
    }
    
    return sorted;
  }, [people, searchQuery]);

  const handleSelect = (contactId: string) => {
    if (multiSelect) {
      const exists = selectedIds.includes(contactId);
      const next = exists ? selectedIds.filter(id => id !== contactId) : [...selectedIds, contactId];
      onChangeSelected?.(next);
      // Keep modal open for multi-select to allow multiple choices
    } else {
      onSelect?.(contactId);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const renderContactItem = ({ item }: { item: typeof people[0] }) => {
    const warmth = getWarmth(item.id);
    const isSelected = multiSelect ? selectedIds.includes(item.id) : item.id === selectedId;

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && styles.contactItemSelected,
        ]}
        onPress={() => handleSelect(item.id)}
      >
        <Avatar
          name={item.fullName}
          photoUrl={item.photo_url}
          avatarUrl={item.avatarUrl}
          size={40}
          warmthColor={warmth.color}
          borderWidth={2}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.fullName}</Text>
          {item.company && (
            <Text style={styles.contactCompany}>{item.company}</Text>
          )}
        </View>
        {isSelected && (
          <View style={[styles.selectedDot, { backgroundColor: warmth.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => setIsOpen(true)}
        disabled={disabled}
      >
        <View style={styles.triggerContent}>
          {multiSelect ? (
            selectedIds.length > 0 ? (
              <>
                <Avatar
                  name={people.find(p => p.id === selectedIds[0])?.fullName || 'Contact'}
                  photoUrl={people.find(p => p.id === selectedIds[0])?.photo_url}
                  avatarUrl={people.find(p => p.id === selectedIds[0])?.avatarUrl}
                  size={32}
                  warmthColor={getWarmth(selectedIds[0]).color}
                  borderWidth={2}
                />
                <View style={styles.selectedInfo}>
                  <Text style={styles.triggerText} numberOfLines={1}>
                    {people.find(p => p.id === selectedIds[0])?.fullName || 'Contact'}
                    {selectedIds.length > 1 ? ` +${selectedIds.length - 1}` : ''}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.placeholderIcon}>
                  <User size={20} color="#9CA3AF" />
                </View>
                <Text style={styles.placeholderText}>{placeholder}</Text>
              </>
            )
          ) : (
            selectedContact ? (
              <>
                <Avatar
                  name={selectedContact.fullName}
                  photoUrl={selectedContact.photo_url}
                  avatarUrl={selectedContact.avatarUrl}
                  size={32}
                  warmthColor={getWarmth(selectedContact.id).color}
                  borderWidth={2}
                />
                <View style={styles.selectedInfo}>
                  <Text style={styles.triggerText}>{selectedContact.fullName}</Text>
                  {selectedContact.company && (
                    <Text style={styles.triggerSubtext}>{selectedContact.company}</Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.placeholderIcon}>
                  <User size={20} color="#9CA3AF" />
                </View>
                <Text style={styles.placeholderText}>{placeholder}</Text>
              </>
            )
          )}
        </View>
        <ChevronDown size={20} color="#6B7280" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isOpen}
        animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setIsOpen(false);
          setSearchQuery('');
        }}
      >
        <TouchableWithoutFeedback 
          onPress={() => {
            if (Platform.OS === 'web') {
              setIsOpen(false);
              setSearchQuery('');
            } else {
              Keyboard.dismiss();
            }
          }}
        >
          <View style={[styles.modalOverlay, Platform.OS === 'web' && styles.modalOverlayWeb]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.keyboardAvoid, Platform.OS === 'web' && styles.keyboardAvoidWeb]}
              >
                <View style={[styles.modalContent, Platform.OS === 'web' && styles.modalContentWeb]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.headerContent}>
                    <Text style={styles.modalTitle}>Select Contact</Text>
                    {searchQuery ? (
                      <Text style={styles.searchResultText}>
                        {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''}
                      </Text>
                    ) : (
                      <Text style={styles.modalSubtitle}>
                        {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Search Input - More Prominent */}
                <View style={styles.searchSection}>
                  <View style={styles.searchContainer}>
                    <Search size={22} color="#6366F1" strokeWidth={2.5} />
                    <CrossPlatformTextInput
                      style={styles.searchInput}
                      placeholder="Search by name, company, or tag..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#9CA3AF"
                      autoFocus={Platform.OS !== 'web'}
                      returnKeyType="search"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setSearchQuery('')}
                        style={styles.clearButton}
                      >
                        <X size={20} color="#6B7280" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {searchQuery && (
                    <Text style={styles.searchHint}>
                      Filtering {people.length} contacts
                    </Text>
                  )}
                </View>

                {/* Contact List */}
                <FlatList
                    data={filteredContacts}
                    renderItem={renderContactItem}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    style={styles.contactList}
                    contentContainerStyle={styles.contactListContent}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={true}
                    initialNumToRender={Platform.OS === 'web' ? 20 : 15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={Platform.OS !== 'web'}
                    getItemLayout={(data, index) => ({
                      length: 76,
                      offset: 76 * index,
                      index,
                    })}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyState}>
                        <User size={48} color="#D1D5DB" />
                        <Text style={styles.emptyText}>
                          {searchQuery ? 'No contacts found' : 'No contacts yet'}
                        </Text>
                        {searchQuery ? (
                          <Text style={styles.emptySubtext}>
                            Try a different search term
                          </Text>
                        ) : (
                          <Text style={styles.emptySubtext}>
                            Add contacts to get started
                          </Text>
                        )}
                      </View>
                    )}
                  />
                {multiSelect && selectedIds.length > 0 && (
                  <View style={styles.doneButtonContainer}>
                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => {
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={styles.doneButtonText}>
                        Done ({selectedIds.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 56,
  },
  triggerDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedInfo: {
    flex: 1,
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  triggerSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    width: '100%',
  },
  keyboardAvoidWeb: {
    maxWidth: 600,
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    height: '90%',
    paddingBottom: 24,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      default: {},
    }),
  },
  modalContentWeb: {
    borderRadius: 24,
    maxHeight: '80%',
    height: 'auto',
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchResultText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  searchHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    marginLeft: 4,
  },
  contactList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contactListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#818CF8',
    borderWidth: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  doneButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  doneButton: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

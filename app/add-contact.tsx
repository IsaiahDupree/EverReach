import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  PanResponder,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { usePeople } from "@/providers/PeopleProvider";
import { X, Plus, Camera } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import AuthGate from "@/components/AuthGate";
import CrossPlatformTextInput from "@/components/CrossPlatformTextInput";
import { uploadContactAvatarToApi, getAvatarInitials, getAvatarColor } from "@/lib/imageUpload";
import { useAnalytics } from "@/hooks/useAnalytics";
import analytics from "@/lib/analytics";
import { WarmthModeSelector, type WarmthMode } from "@/components/WarmthModeSelector";

export default function AddContactScreen() {
  const { addPerson, updatePerson, people } = usePeople();
  const params = useLocalSearchParams();
  const { editId: rawEditId, name, email: emailParam, phone: phoneParam, company: companyParam, notes, tags: tagsParam } = params;
  const editId = Array.isArray(rawEditId) ? rawEditId[0] : rawEditId;
  const isEditing = !!editId;
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('AddContact', {
    screenProperties: {
      mode: isEditing ? 'edit' : 'create',
      contact_id: editId,
      prefilled: !!(name || emailParam || phoneParam || companyParam),
    },
  });
  const existingPerson = isEditing ? people.find(p => p.id === editId) : null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [customFields, setCustomFields] = useState<Array<{key: string; value: string}>>([]);
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [warmthMode, setWarmthMode] = useState<WarmthMode | null>(null);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        Keyboard.dismiss();
      }
    },
  });

  // Load existing person data when editing
  useEffect(() => {
    if (isEditing && existingPerson) {
      setFullName(existingPerson.fullName || "");
      setEmail(existingPerson.emails?.[0] || "");
      setPhone(existingPerson.phones?.[0] || "");
      setCompany(existingPerson.company || "");
      setTitle(existingPerson.title || "");
      setTags(existingPerson.tags || []);
      setInterests(existingPerson.interests || []);
      // Prioritize photo_url (new uploads) over avatarUrl (legacy)
      setAvatarUri(existingPerson.photo_url || existingPerson.avatarUrl);
      setCustomFields(existingPerson.customFields || []);
      setWarmthMode(existingPerson.warmth_mode ?? null);
    }
  }, [isEditing, existingPerson]);

  // Pre-populate form fields from URL parameters (e.g., from screenshot analysis)
  useEffect(() => {
    if (!isEditing) {
      if (name && typeof name === 'string') {
        setFullName(name);
        console.log('[AddContact] Pre-filled name:', name);
      }
      if (emailParam && typeof emailParam === 'string') {
        setEmail(emailParam);
        console.log('[AddContact] Pre-filled email:', emailParam);
      }
      if (phoneParam && typeof phoneParam === 'string') {
        setPhone(phoneParam);
        console.log('[AddContact] Pre-filled phone:', phoneParam);
      }
      if (companyParam && typeof companyParam === 'string') {
        setCompany(companyParam);
        console.log('[AddContact] Pre-filled company:', companyParam);
      }
      if (notes && typeof notes === 'string') {
        // Add notes as a tag for now
        setTags(prev => [...prev, `Note: ${notes}`]);
        console.log('[AddContact] Added notes as tag:', notes);
      }
      // Pre-fill tags if provided as comma-separated
      const rawTags = Array.isArray(tagsParam) ? tagsParam[0] : tagsParam;
      if (rawTags && typeof rawTags === 'string') {
        const parsed = rawTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        if (parsed.length > 0) {
          setTags(prev => Array.from(new Set([...
            prev,
            ...parsed,
          ])));
          console.log('[AddContact] Pre-filled tags:', parsed);
        }
      }
    }
  }, [isEditing, name, emailParam, phoneParam, companyParam, notes, tagsParam]);

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleAddInterest = () => {
    if (interestInput.trim()) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput("");
    }
  };

  const handleAddCustomField = () => {
    if (customFieldKey.trim() && customFieldValue.trim()) {
      setCustomFields([...customFields, { key: customFieldKey.trim(), value: customFieldValue.trim() }]);
      setCustomFieldKey("");
      setCustomFieldValue("");
    }
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const pickImage = async () => {
    screenAnalytics.track('avatar_upload_started', { source: 'library' });
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to add a photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take a photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    
    screenAnalytics.startTimer('save_contact');
    const hadAvatarSelected = Boolean(avatarUri);
    try {
      if (isEditing && editId) {
        // Edit flow: upload avatar first (if local), then update person with URL
        let finalAvatarUrl = avatarUri;
        if (avatarUri && avatarUri.startsWith('file://')) {
          setUploadingImage(true);
          try {
            const uploaded = await uploadContactAvatarToApi(avatarUri, editId as string);
            if (uploaded) finalAvatarUrl = uploaded.url; else finalAvatarUrl = undefined;
          } catch (e) {
            console.error('[AddContact] Avatar upload failed (edit):', e);
            Alert.alert('Warning', 'Failed to upload photo. Saving without it.');
            finalAvatarUrl = undefined;
          } finally {
            setUploadingImage(false);
          }
        }

        const personData: any = {
          name: fullName.trim(),
          fullName: fullName.trim(),
          emails: email ? [email.trim()] : [],
          phones: phone ? [phone.trim()] : [],
          company: company.trim() || undefined,
          title: title.trim() || undefined,
          tags,
          interests,
          customFields,
          // cadence handled server-side
          avatarUrl: finalAvatarUrl,
          createdAt: existingPerson?.createdAt || Date.now(),
        };

        if (warmthMode) personData.warmth_mode = warmthMode;

        await updatePerson(editId as string, personData);
        analytics.contacts.updated(editId as string, Object.keys(personData));
      } else {
        // Create flow: create contact first (no avatar URL), then upload avatar and patch
        const baseData: any = {
          name: fullName.trim(),
          fullName: fullName.trim(),
          emails: email ? [email.trim()] : [],
          phones: phone ? [phone.trim()] : [],
          company: company.trim() || undefined,
          title: title.trim() || undefined,
          tags,
          interests,
          customFields,
          // cadence handled server-side
          avatarUrl: undefined as string | undefined,
          createdAt: Date.now(),
        };

        if (warmthMode) baseData.warmth_mode = warmthMode;

        const newContact = await addPerson(baseData);
        const newId = newContact?.id;
        analytics.contacts.created(newId || 'unknown', 'manual');

        if (newId && avatarUri && avatarUri.startsWith('file://')) {
          setUploadingImage(true);
          try {
            const uploaded = await uploadContactAvatarToApi(avatarUri, newId);
            if (uploaded?.url) {
              await updatePerson(newId, { avatarUrl: uploaded.url });
            }
          } catch (e) {
            console.error('[AddContact] Avatar upload failed (create):', e);
            Alert.alert('Warning', 'Contact saved, but photo upload failed.');
          } finally {
            setUploadingImage(false);
          }
        }
      }
    } catch (e) {
      console.error('[AddContact] Save failed:', e);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
      screenAnalytics.endTimer('save_contact', { success: false });
      return;
    }
    
    // Track fields filled
    screenAnalytics.track('contact_saved', {
      has_email: !!email,
      has_phone: !!phone,
      has_company: !!company,
      has_avatar: hadAvatarSelected,
      tags_count: tags.length,
      interests_count: interests.length,
      mode: isEditing ? 'edit' : 'create',
    });
    
    screenAnalytics.endTimer('save_contact', { success: true });
    router.back();
  };

  return (
    <AuthGate requireAuth>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            {...panResponder.panHandlers}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{isEditing ? 'Edit Contact' : 'Basic Information'}</Text>
              
              <View style={styles.avatarSection}>
                <TouchableOpacity 
                  style={styles.avatarContainer} 
                  onPress={showImageOptions}
                  disabled={uploadingImage}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(fullName || 'User') }]}>
                      <Text style={styles.avatarInitials}>
                        {getAvatarInitials(fullName || 'User')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cameraButton}>
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Camera size={16} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <CrossPlatformTextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <CrossPlatformTextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="john@example.com"
                  placeholderTextColor="#999999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <CrossPlatformTextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor="#999999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company</Text>
                <CrossPlatformTextInput
                  style={styles.input}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Acme Inc."
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <CrossPlatformTextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Product Manager"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tags</Text>
                {tags.length > 0 && (
                  <View style={styles.tagContainer}>
                    {tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                        <TouchableOpacity onPress={() => setTags(tags.filter((_, i) => i !== index))}>
                          <X size={14} color="#666666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.addRow}>
                  <CrossPlatformTextInput
                    style={[styles.input, styles.addInput]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Add a tag"
                    placeholderTextColor="#999999"
                    onSubmitEditing={handleAddTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddTag}>
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Interests</Text>
                {interests.length > 0 && (
                  <View style={styles.tagContainer}>
                    {interests.map((interest, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{interest}</Text>
                        <TouchableOpacity onPress={() => setInterests(interests.filter((_, i) => i !== index))}>
                          <X size={14} color="#666666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.addRow}>
                  <CrossPlatformTextInput
                    style={[styles.input, styles.addInput]}
                    value={interestInput}
                    onChangeText={setInterestInput}
                    placeholder="Add an interest"
                    placeholderTextColor="#999999"
                    onSubmitEditing={handleAddInterest}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddInterest}>
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Custom Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Fields</Text>
                {customFields.length > 0 && (
                  <View style={styles.customFieldsContainer}>
                    {customFields.map((field, index) => (
                      <View key={index} style={styles.customFieldItem}>
                        <View style={styles.customFieldContent}>
                          <Text style={styles.customFieldKey}>{field.key}:</Text>
                          <Text style={styles.customFieldValue}>{field.value}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveCustomField(index)}>
                          <X size={18} color="#666666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.customFieldInputRow}>
                  <CrossPlatformTextInput
                    style={[styles.input, styles.customFieldKeyInput]}
                    value={customFieldKey}
                    onChangeText={setCustomFieldKey}
                    placeholder="Field name (e.g., Birthday)"
                    placeholderTextColor="#999999"
                  />
                  <CrossPlatformTextInput
                    style={[styles.input, styles.customFieldValueInput]}
                    value={customFieldValue}
                    onChangeText={setCustomFieldValue}
                    placeholder="Value"
                    placeholderTextColor="#999999"
                    onSubmitEditing={handleAddCustomField}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddCustomField}>
                    <Plus size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Warmth Mode Selector */}
              <View style={styles.inputGroup}>
                <WarmthModeSelector
                  contactId={isEditing ? (editId as string) : 'new'}
                  contactName={fullName || 'New Contact'}
                  currentMode={warmthMode}
                  currentScore={isEditing && existingPerson ? (existingPerson.warmth || 0) : 0}
                  onModeChange={(mode, newScore) => {
                    // Just update local state - the backend already updated via the selector
                    setWarmthMode(mode);
                    
                    screenAnalytics.track('warmth_mode_selected', {
                      mode,
                      isEditing,
                    });
                  }}
                />
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={uploadingImage}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, uploadingImage && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Uploading...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>{isEditing ? 'Update Contact' : 'Save Contact'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#666666',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5E5',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F8F9FA',
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999999',
  },
  customFieldsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  customFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customFieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customFieldKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  customFieldValue: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  customFieldInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customFieldKeyInput: {
    flex: 1,
  },
  customFieldValueInput: {
    flex: 1,
  },
});
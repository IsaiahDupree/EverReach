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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { usePeople } from "@/providers/PeopleProvider";
import { AnalyticsService } from "@/services/analytics";
import { X, Plus } from "lucide-react-native";

export default function AddContactScreen() {
  const { addPerson, updatePerson, people } = usePeople();
  const { editId } = useLocalSearchParams();
  const isEditing = !!editId;
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
  const [cadenceDays, setCadenceDays] = useState("30");

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

  // Track screen view
  useEffect(() => {
    AnalyticsService.trackScreenViewed({ 
      screenName: isEditing ? 'edit_contact' : 'add_contact'
    });
  }, [isEditing]);

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
      setCadenceDays((existingPerson.cadenceDays || 30).toString());
    }
  }, [isEditing, existingPerson]);

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

  const handleSave = () => {
    if (!fullName.trim()) {
      alert("Please enter a name");
      return;
    }

    const personData = {
      fullName: fullName.trim(),
      emails: email ? [email.trim()] : [],
      phones: phone ? [phone.trim()] : [],
      company: company.trim() || undefined,
      title: title.trim() || undefined,
      tags,
      interests,
      cadenceDays: parseInt(cadenceDays) || 30,
    };

    if (isEditing && editId) {
      updatePerson(editId as string, personData);
      // Contact updated - could add AnalyticsService.trackContactUpdated if needed
    } else {
      addPerson(personData);
      AnalyticsService.trackContactCreated({
        source: 'manual',
        hasCompany: !!company,
        hasPhoto: false
      });
    }

    router.back();
  };

  return (
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
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
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
            <TextInput
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
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
              placeholder="Acme Inc."
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Product Manager"
              placeholderTextColor="#999999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
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
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add a tag"
              placeholderTextColor="#999999"
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddTag}>
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
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
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={interestInput}
              onChangeText={setInterestInput}
              placeholder="Add an interest"
              placeholderTextColor="#999999"
              onSubmitEditing={handleAddInterest}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddInterest}>
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow-up Settings</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Check-in Frequency (days)</Text>
            <TextInput
              style={styles.input}
              value={cadenceDays}
              onChangeText={setCadenceDays}
              placeholder="30"
              placeholderTextColor="#999999"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{isEditing ? 'Update Contact' : 'Save Contact'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
});
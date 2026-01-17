import React from 'react';
import { TextInput, Text, Pressable, StyleSheet, Image, Platform, Keyboard } from 'react-native';
import { Bubble, SectionTitle } from './ui';
import * as ImagePicker from 'expo-image-picker';

export function CustomGoalBubble({
  value,
  onFocusSelect,
  onChange,
}: {
  value: string;
  onFocusSelect: () => void;
  onChange: (t: string) => void;
}) {
  return (
    <Bubble testID="customGoal">
      <SectionTitle><Text>Custom Goal</Text></SectionTitle>
      <Text style={styles.hint}>Type your own goal if the suggestions don’t fit</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder="Type your own goal…"
        placeholderTextColor="#999"
        onFocus={onFocusSelect}
        onChangeText={onChange}
        testID="customGoalInput"
        returnKeyType="done"
        blurOnSubmit={true}
        multiline={false}
        autoCapitalize="sentences"
        autoCorrect={true}
        onSubmitEditing={() => {
          Keyboard.dismiss();
        }}
      />
    </Bubble>
  );
}

export function ScreenshotResponseBubble({
  imageUri,
  onPick,
  onModeSelect,
  isProcessing = false,
}: {
  imageUri?: string | null;
  onPick: (uri: string) => void;
  onModeSelect: () => void;
  isProcessing?: boolean;
}) {
  const handlePick = async () => {
    onModeSelect();
    
    if (Platform.OS === 'web') {
      // Web file picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : undefined;
          if (result) onPick(result);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      // Native image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled) {
        onPick(result.assets[0].uri);
      }
    }
  };

  return (
    <Bubble testID="screenshotBubble">
      <SectionTitle><Text>Screenshot Response</Text></SectionTitle>
      <Text style={styles.hint}>Create a response to a screenshot</Text>
      <Pressable 
        onPress={handlePick} 
        style={[styles.uploadBtn, isProcessing && styles.uploadBtnDisabled]} 
        accessibilityRole="button" 
        testID="pickScreenshot"
        disabled={isProcessing}
      >
        <Text style={[styles.uploadText, isProcessing && styles.uploadTextDisabled]}>
          {isProcessing ? 'Processing Screenshot...' : 'Upload Screenshot →'}
        </Text>
      </Pressable>
      {imageUri && imageUri.trim() ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
    </Bubble>
  );
}

const styles = StyleSheet.create({
  hint: { color: '#616776', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#e1e3ec', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff',
  },
  uploadBtn: {
    marginTop: 4, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#0f62fe',
  },
  uploadBtnDisabled: {
    backgroundColor: '#c7cfec',
  },
  uploadText: { color: '#fff', fontWeight: '700' },
  uploadTextDisabled: { color: '#999' },
  preview: { marginTop: 10, height: 140, borderRadius: 10 },
});

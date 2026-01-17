import { Platform } from 'react-native';

/**
 * Cross-platform TextInput onChange handler
 * 
 * React Native Web has issues with TextInput not updating properly.
 * This utility ensures text input works on both native and web.
 * 
 * Usage:
 * <TextInput
 *   value={text}
 *   onChangeText={setText}
 *   onChange={handleWebInput(setText)}
 * />
 */
export const handleWebInput = (setter: (text: string) => void) => {
  return (e: any) => {
    if (Platform.OS === 'web' && e?.nativeEvent) {
      const value = e.nativeEvent.text || e.nativeEvent.target?.value || '';
      setter(value);
    }
  };
};

/**
 * Props for cross-platform TextInput
 * 
 * Usage:
 * <TextInput
 *   {...getCrossplatformTextInputProps(text, setText)}
 *   placeholder="Enter text..."
 * />
 */
export const getCrossplatformTextInputProps = (
  value: string,
  setter: (text: string) => void
) => ({
  value,
  onChangeText: setter,
  onChange: handleWebInput(setter),
});

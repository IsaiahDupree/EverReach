/**
 * Mock for React Native
 * Used in Jest tests to avoid importing actual React Native modules
 */

module.exports = {
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  ScrollView: 'ScrollView',
};

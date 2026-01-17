import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, Platform, Keyboard } from 'react-native';

/**
 * CrossPlatformTextInput - Smart TextInput that works perfectly on web and native
 * 
 * Automatically handles:
 * - Web: Fixes React Native Web bug where onChangeText doesn't fire + focus issues
 * - iOS: Proper keyboard behavior
 * - Android: Proper keyboard behavior
 * - Dismissable keyboard on submit
 * 
 * Usage: Just replace <TextInput /> with <CrossPlatformTextInput />
 * 
 * Example:
 * <CrossPlatformTextInput
 *   value={text}
 *   onChangeText={setText}
 *   placeholder="Type here..."
 * />
 */
const CrossPlatformTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const { onChangeText, onSubmitEditing, onFocus, ...restProps } = props;

  // Enhanced onChange handler that works on all platforms
  const handleChange = (e: any) => {
    if (Platform.OS === 'web') {
      // Web: Extract value from multiple possible locations
      let value = '';
      if (e?.nativeEvent) {
        value = e.nativeEvent.text || e.nativeEvent.target?.value || '';
      } else if (e?.target) {
        value = e.target.value || '';
      }
      onChangeText?.(value);
    }
    // Native: onChangeText already handles it
  };

  // Enhanced submit handler with keyboard dismissal
  const handleSubmit = (e: any) => {
    // Call user's onSubmitEditing if provided
    onSubmitEditing?.(e);
    
    // Auto-dismiss keyboard on submit (mobile best practice)
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  };

  // Enhanced focus handler for web
  const handleFocus = (e: any) => {
    // Call user's onFocus if provided
    onFocus?.(e);
  };

  // On web with multiline, use native textarea for better compatibility
  if (Platform.OS === 'web' && props.multiline) {
    // Flatten React Native style array/object to a plain object
    const flattenStyle = (style: any): any => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.map(flattenStyle));
      }
      return style;
    };
    
    const styleObj = flattenStyle(props.style);
    const textareaStyle: React.CSSProperties = {
      // Ensure proper text rendering
      fontFamily: styleObj?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontSize: typeof styleObj?.fontSize === 'number' ? `${styleObj.fontSize}px` : (styleObj?.fontSize || '16px'),
      lineHeight: typeof styleObj?.lineHeight === 'number' ? `${styleObj.lineHeight}px` : (styleObj?.lineHeight || '1.5'),
      color: styleObj?.color || '#000000',
      // Remove default browser styling
      border: 'none',
      borderRadius: '0',
      padding: '0',
      minHeight: typeof styleObj?.minHeight === 'number' ? `${styleObj.minHeight}px` : (styleObj?.minHeight || '20px'),
      maxHeight: typeof styleObj?.maxHeight === 'number' ? `${styleObj.maxHeight}px` : styleObj?.maxHeight,
      outline: 'none',
      resize: 'none',
      width: '100%',
      boxSizing: 'border-box',
      backgroundColor: 'transparent',
      flex: styleObj?.flex || 1,
    };

    return (
      <textarea
        ref={ref as any}
        value={props.value}
        onChange={(e) => {
          onChangeText?.(e.target.value);
        }}
        onKeyDown={(e) => {
          // Enter submits, Ctrl/Cmd+Enter creates new line
          if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            onSubmitEditing?.(e as any);
          }
          // Ctrl/Cmd+Enter or Shift+Enter creates new line (browser default)
        }}
        onFocus={handleFocus}
        placeholder={props.placeholder}
        rows={props.numberOfLines || 4}
        style={textareaStyle}
        disabled={props.editable === false}
      />
    );
  }

  return (
    <TextInput
      ref={ref}
      {...restProps}
      // On web, use BOTH onChange AND onChangeText for better compatibility
      // On native, only use onChangeText
      onChange={Platform.OS === 'web' ? handleChange : undefined}
      onChangeText={onChangeText}
      onSubmitEditing={handleSubmit}
      onFocus={handleFocus}
      // Smart defaults based on platform
      returnKeyType={props.returnKeyType || (props.multiline ? 'default' : 'done')}
      blurOnSubmit={props.blurOnSubmit !== undefined ? props.blurOnSubmit : !props.multiline}
      // Disable selection on mobile to prevent Copy/Look Up/Translate menu
      {...(Platform.OS !== 'web' && props.multiline && {
        textBreakStrategy: 'simple',
      })}
      // Note: contextMenuHidden removed - was preventing keyboard from showing
      // Additional iOS-specific props to reduce utility bar visibility (but not block keyboard)
      {...(Platform.OS === 'ios' && props.multiline && {
        selectionColor: 'transparent',
      })}
      // Web-specific improvements
      {...(Platform.OS === 'web' && {
        autoComplete: props.autoComplete || 'off',
        tabIndex: 0,
      })}
    />
  );
});

CrossPlatformTextInput.displayName = 'CrossPlatformTextInput';

export default CrossPlatformTextInput;

/**
 * Hook for managing cross-platform text input state
 * 
 * Provides helpful utilities for forms:
 * - Clear function
 * - isEmpty check
 * - Trim function
 * 
 * Example:
 * const email = useCrossPlatformInput('');
 * 
 * <CrossPlatformTextInput
 *   value={email.value}
 *   onChangeText={email.setValue}
 *   placeholder="Email"
 * />
 * <Button onPress={email.clear}>Clear</Button>
 */
export function useCrossPlatformInput(initialValue: string = '') {
  const [value, setValue] = React.useState(initialValue);

  return {
    value,
    setValue,
    clear: () => setValue(''),
    isEmpty: () => value.trim().length === 0,
    trimmed: () => value.trim(),
    reset: () => setValue(initialValue),
  };
}

/**
 * Props helper for quick TextInput setup
 * 
 * Example:
 * <CrossPlatformTextInput
 *   {...textInputProps(email, setEmail)}
 *   placeholder="Email"
 * />
 */
export function textInputProps(value: string, setValue: (text: string) => void) {
  return {
    value,
    onChangeText: setValue,
  };
}

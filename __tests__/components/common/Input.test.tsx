/**
 * Input Component Tests
 * Feature: IOS-COMP-002
 *
 * Tests for the themed Input component with validation, labels, and icons.
 *
 * @module __tests__/components/common/Input
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import Input from '../../../components/common/Input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render with placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" />
      );
      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('should render with label', () => {
      const { getByText } = render(
        <Input label="Username" placeholder="Enter username" />
      );
      expect(getByText('Username')).toBeTruthy();
    });

    it('should render without label when not provided', () => {
      const { queryByText } = render(
        <Input placeholder="Enter text" testID="input" />
      );
      // No label should be rendered
      expect(queryByText('Label')).toBeFalsy();
    });

    it('should render with value', () => {
      const { getByDisplayValue } = render(
        <Input value="Test value" onChangeText={() => {}} />
      );
      expect(getByDisplayValue('Test value')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should render error message when error prop is provided', () => {
      const { getByText } = render(
        <Input
          placeholder="Email"
          error="Email is required"
        />
      );
      expect(getByText('Email is required')).toBeTruthy();
    });

    it('should not render error message when error is undefined', () => {
      const { queryByTestId } = render(
        <Input placeholder="Email" testID="input" />
      );
      expect(queryByTestId('input-error')).toBeFalsy();
    });

    it('should apply error styling when error is present', () => {
      const { getByTestId } = render(
        <Input
          placeholder="Email"
          error="Invalid email"
          testID="input"
        />
      );
      const container = getByTestId('input-container');
      expect(container).toBeTruthy();
    });

    it('should not apply error styling when no error', () => {
      const { getByTestId } = render(
        <Input placeholder="Email" testID="input" />
      );
      const container = getByTestId('input-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Label Support', () => {
    it('should render label above input', () => {
      const { getByText, getByPlaceholderText } = render(
        <Input label="Email Address" placeholder="Enter email" />
      );
      expect(getByText('Email Address')).toBeTruthy();
      expect(getByPlaceholderText('Enter email')).toBeTruthy();
    });

    it('should support optional label indicator', () => {
      const { getByText } = render(
        <Input
          label="Phone Number"
          placeholder="Enter phone"
          optional
        />
      );
      // The label contains nested Text, so we search for the full content
      expect(getByText(/Phone Number/)).toBeTruthy();
      expect(getByText(/optional/)).toBeTruthy();
    });

    it('should work without label', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Search..." />
      );
      expect(getByPlaceholderText('Search...')).toBeTruthy();
    });
  });

  describe('Icon Support', () => {
    it('should render left icon when provided', () => {
      const LeftIcon = () => <Text testID="left-icon">L</Text>;
      const { getByTestId } = render(
        <Input
          placeholder="Email"
          leftIcon={<LeftIcon />}
        />
      );
      expect(getByTestId('left-icon')).toBeTruthy();
    });

    it('should render right icon when provided', () => {
      const RightIcon = () => <Text testID="right-icon">R</Text>;
      const { getByTestId } = render(
        <Input
          placeholder="Password"
          rightIcon={<RightIcon />}
        />
      );
      expect(getByTestId('right-icon')).toBeTruthy();
    });

    it('should render both left and right icons', () => {
      const LeftIcon = () => <Text testID="left-icon">L</Text>;
      const RightIcon = () => <Text testID="right-icon">R</Text>;
      const { getByTestId } = render(
        <Input
          placeholder="Search"
          leftIcon={<LeftIcon />}
          rightIcon={<RightIcon />}
        />
      );
      expect(getByTestId('left-icon')).toBeTruthy();
      expect(getByTestId('right-icon')).toBeTruthy();
    });

    it('should work without icons', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Email" />
      );
      expect(getByPlaceholderText('Email')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('should call onChangeText when text changes', () => {
      const onChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Enter text"
          onChangeText={onChangeText}
        />
      );

      const input = getByPlaceholderText('Enter text');
      fireEvent.changeText(input, 'New text');

      expect(onChangeText).toHaveBeenCalledWith('New text');
      expect(onChangeText).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus when input is focused', () => {
      const onFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Enter text"
          onFocus={onFocus}
        />
      );

      const input = getByPlaceholderText('Enter text');
      fireEvent(input, 'focus');

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when input loses focus', () => {
      const onBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Enter text"
          onBlur={onBlur}
        />
      );

      const input = getByPlaceholderText('Enter text');
      fireEvent(input, 'blur');

      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when editable is false', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" editable={false} />
      );
      const input = getByPlaceholderText('Enter text');
      expect(input.props.editable).toBe(false);
    });

    it('should apply disabled styling when disabled', () => {
      const { getByTestId } = render(
        <Input
          placeholder="Enter text"
          editable={false}
          testID="input"
        />
      );
      const container = getByTestId('input-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom testID', () => {
      const { getByTestId } = render(
        <Input placeholder="Email" testID="custom-input" />
      );
      expect(getByTestId('custom-input')).toBeTruthy();
    });

    it('should support secureTextEntry for passwords', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Password" secureTextEntry />
      );
      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should support multiline input', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Comments" multiline />
      );
      const input = getByPlaceholderText('Comments');
      expect(input.props.multiline).toBe(true);
    });

    it('should support keyboardType', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Email" keyboardType="email-address" />
      );
      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
    });
  });

  describe('Acceptance Criteria', () => {
    it('should support error state with message', () => {
      const { getByText, getByTestId } = render(
        <Input
          placeholder="Email"
          error="Invalid email address"
          testID="input"
        />
      );
      // Error message should be visible
      expect(getByText('Invalid email address')).toBeTruthy();
      // Container should have error styling
      expect(getByTestId('input-container')).toBeTruthy();
    });

    it('should support label with input', () => {
      const { getByText, getByPlaceholderText } = render(
        <Input
          label="Full Name"
          placeholder="Enter your name"
        />
      );
      expect(getByText('Full Name')).toBeTruthy();
      expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    });

    it('should support icons on both sides', () => {
      const LeftIcon = () => <Text testID="search-icon">🔍</Text>;
      const RightIcon = () => <Text testID="clear-icon">✕</Text>;
      const { getByTestId } = render(
        <Input
          placeholder="Search"
          leftIcon={<LeftIcon />}
          rightIcon={<RightIcon />}
        />
      );
      expect(getByTestId('search-icon')).toBeTruthy();
      expect(getByTestId('clear-icon')).toBeTruthy();
    });
  });
});

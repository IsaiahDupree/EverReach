/**
 * Auth screen tests — UX0641-UX0700
 *
 * Screen covered: SignInScreen (templates/app/auth/sign-in)
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import SignInScreen from '../../../templates/app/auth/sign-in';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => () => React.createElement('View') });
});

// Use jest.fn() INSIDE the factory so hoisting works correctly.
// Access the mocks via jest.requireMock after module setup.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(() => Promise.resolve({ error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ error: null })),
      signInWithIdToken: jest.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSupabaseMock() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return jest.requireMock('@/lib/supabase').supabase;
}

function renderSignIn() {
  return render(<SignInScreen />);
}

// ── SignInScreen — initial render (UX0641-UX0660) ─────────────────────────────

describe('SignInScreen — initial render', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSupabaseMock().auth.signInWithOtp.mockResolvedValue({ error: null });
  });

  it('UX0641: renders without crashing', () => {
    // UX0641: screen mounts without throwing
    expect(() => renderSignIn()).not.toThrow();
  });

  it('UX0642: renders "SunTrace" brand title', () => {
    // UX0642: brand/logo title is visible on the sign-in screen
    renderSignIn();
    expect(screen.getByText('SunTrace')).toBeTruthy();
  });

  it('UX0643: renders "Email address" label', () => {
    // UX0643: form label for email field is present
    renderSignIn();
    expect(screen.getByText('Email address')).toBeTruthy();
  });

  it('UX0644: renders an email TextInput with placeholder', () => {
    // UX0644: email input field is present with expected placeholder
    renderSignIn();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('UX0645: renders "Send Magic Link" button', () => {
    // UX0645: magic link CTA button is visible
    renderSignIn();
    expect(screen.getByText('Send Magic Link')).toBeTruthy();
  });

  it('UX0646: no error message is shown on initial render', () => {
    // UX0646: error text is absent before any interaction
    renderSignIn();
    expect(screen.queryByText('Please enter your email address.')).toBeNull();
  });

  it('UX0647: renders "Your personal sun coach" tagline', () => {
    // UX0647: subtitle tagline beneath brand title is visible
    renderSignIn();
    expect(screen.getByText('Your personal sun coach')).toBeTruthy();
  });

  it('UX0648: email input starts empty', () => {
    // UX0648: input value is empty string on mount
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.props.value).toBe('');
  });

  it('UX0649: "Send Magic Link" button is initially enabled', () => {
    // UX0649: magic link button is not disabled before interaction
    renderSignIn();
    const btn = screen.getByText('Send Magic Link').parent;
    expect(btn?.props?.disabled ?? btn?.props?.accessibilityState?.disabled).toBeFalsy();
  });

  it('UX0650: renders a Privacy Policy link', () => {
    // UX0650: privacy policy text link is present at the bottom
    renderSignIn();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('UX0651: renders a Terms of Service link', () => {
    // UX0651: terms of service text link is present at the bottom
    renderSignIn();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
  });

  it('UX0652: renders "By continuing you agree to our" privacy notice', () => {
    // UX0652: legal disclosure text is visible
    renderSignIn();
    expect(screen.getByText(/By continuing you agree to our/)).toBeTruthy();
  });

  it('UX0653: email input has keyboardType "email-address"', () => {
    // UX0653: keyboard type is optimised for email entry
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.props.keyboardType).toBe('email-address');
  });

  it('UX0654: email input has autoCapitalize "none"', () => {
    // UX0654: auto-capitalisation is off for email input
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.props.autoCapitalize).toBe('none');
  });

  it('UX0655: email input has autoCorrect false', () => {
    // UX0655: auto-correct is disabled for email input
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.props.autoCorrect).toBe(false);
  });

  it('UX0656: renders "or" divider between email and social options', () => {
    // UX0656: divider separating email from social sign-in is visible
    renderSignIn();
    expect(screen.getByText('or')).toBeTruthy();
  });

  it('UX0657: does not show "Check your email" view on initial render', () => {
    // UX0657: sent confirmation state is not shown before magic link is sent
    renderSignIn();
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('UX0658: email input accepts text input via fireEvent', () => {
    // UX0658: typing an email updates the input value
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    fireEvent.changeText(input, 'hello@example.com');
    expect(input.props.value).toBe('hello@example.com');
  });

  it('UX0659: email input is not in a disabled state by default', () => {
    // UX0659: email field is editable on initial render
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.props.editable).not.toBe(false);
  });

  it('UX0660: screen title text "SunTrace" is on screen', () => {
    // UX0660: brand title is present (secondary assertion)
    renderSignIn();
    expect(screen.getAllByText('SunTrace').length).toBeGreaterThan(0);
  });
});

// ── SignInScreen — error state (UX0661-UX0670) ────────────────────────────────

describe('SignInScreen — empty email error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSupabaseMock().auth.signInWithOtp.mockResolvedValue({ error: null });
  });

  it('UX0661: pressing magic link with empty email shows error message', () => {
    // UX0661: validation error fires when email is blank
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
  });

  it('UX0662: error message is absent when email is non-empty before submission', () => {
    // UX0662: no error shown just from typing an email (no submit yet)
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    expect(screen.queryByText('Please enter your email address.')).toBeNull();
  });

  it('UX0663: whitespace-only email still triggers the empty error', () => {
    // UX0663: whitespace-only email fails the trim() check
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '   ');
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
  });

  it('UX0664: supabase.auth.signInWithOtp is NOT called when email is empty', () => {
    // UX0664: API is not hit when validation fails
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(getSupabaseMock().auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('UX0665: supabase.auth.signInWithOtp is NOT called when email is whitespace', () => {
    // UX0665: whitespace-only email also prevents API call
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '   ');
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(getSupabaseMock().auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('UX0666: pressing magic link with empty email does not navigate', () => {
    // UX0666: router.replace is not called on validation failure
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    // Validation short-circuits — no navigation
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('UX0667: "Send Magic Link" text remains visible after empty-email error', () => {
    // UX0667: button text persists after validation error (not loading state)
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(screen.getByText('Send Magic Link')).toBeTruthy();
  });

  it('UX0668: after error, typing a new email accepts the value', () => {
    // UX0668: typing after error clears validation check on next submit
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    expect(screen.getByPlaceholderText('you@example.com').props.value).toBe('user@test.com');
  });

  it('UX0669: error text has correct message string', () => {
    // UX0669: exact error message string matches expected copy
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
  });

  it('UX0670: multiple empty-email submissions show error each time', () => {
    // UX0670: validation is stateless — error shows on each empty press
    renderSignIn();
    fireEvent.press(screen.getByText('Send Magic Link'));
    fireEvent.press(screen.getByText('Send Magic Link'));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
  });
});

// ── SignInScreen — success/sent state (UX0671-UX0700) ────────────────────────

describe('SignInScreen — sent state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSupabaseMock().auth.signInWithOtp.mockResolvedValue({ error: null });
  });

  it('UX0671: calling signInWithOtp with valid email triggers API call', async () => {
    // UX0671: valid email submission calls supabase signInWithOtp
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledTimes(1)
    );
  });

  it('UX0672: signInWithOtp is called with trimmed lowercase email', async () => {
    // UX0672: email is normalized before API call
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '  Test@Example.COM  ');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      )
    );
  });

  it('UX0673: "Check your email" heading appears after successful OTP request', async () => {
    // UX0673: success view transitions to confirmation screen
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => expect(screen.getByText('Check your email')).toBeTruthy());
  });

  it('UX0674: sent view shows the submitted email address', async () => {
    // UX0674: confirmation screen echoes the email user entered
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => expect(screen.getByText('jane@example.com')).toBeTruthy());
  });

  it('UX0675: "Use a different email" link appears in sent view', async () => {
    // UX0675: user can navigate back to change email after sent
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.getByText('Use a different email')).toBeTruthy()
    );
  });

  it('UX0676: "We sent a sign-in link to" body text appears in sent view', async () => {
    // UX0676: confirmation body copy is correct
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.getByText(/We sent a sign-in link to/)).toBeTruthy()
    );
  });

  it('UX0677: sent view replaces the form — confirmation heading is shown', async () => {
    // UX0677: form is replaced by the confirmation view after submission
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.getByText('Check your email')).toBeTruthy()
    );
  });

  it('UX0678: "Send Magic Link" button is gone after sent state', async () => {
    // UX0678: CTA is hidden once the link has been sent
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.queryByText('Send Magic Link')).toBeNull()
    );
  });

  it('UX0679: pressing "Use a different email" returns to the form', async () => {
    // UX0679: back-navigation re-shows the email form
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Use a different email'));
    fireEvent.press(screen.getByText('Use a different email'));
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('UX0680: pressing "Use a different email" hides the confirmation view', async () => {
    // UX0680: going back hides "Check your email" heading
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Use a different email'));
    fireEvent.press(screen.getByText('Use a different email'));
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('UX0681: signInWithOtp receives emailRedirectTo option', async () => {
    // UX0681: deep-link redirect option is passed to Supabase
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: 'suntrace://auth/callback',
          }),
        })
      )
    );
  });

  it('UX0682: signInWithOtp is only called once per submission', async () => {
    // UX0682: pressing the button once only fires one API call
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledTimes(1)
    );
  });

  it('UX0683: sent view is shown only after successful API response', async () => {
    // UX0683: confirmation view waits for Promise resolution
    let resolve: (v: any) => void = () => {};
    getSupabaseMock().auth.signInWithOtp.mockReturnValueOnce(
      new Promise((res) => { resolve = res; })
    );
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    // Before resolve — sent view not shown
    expect(screen.queryByText('Check your email')).toBeNull();
    await act(async () => { resolve({ error: null }); });
    expect(screen.getByText('Check your email')).toBeTruthy();
  });

  it('UX0684: API error message is displayed when signInWithOtp returns error', async () => {
    // UX0684: Supabase error message surfaces to the user
    getSupabaseMock().auth.signInWithOtp.mockResolvedValueOnce({
      error: { message: 'Rate limit exceeded' },
    });
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.getByText('Rate limit exceeded')).toBeTruthy()
    );
  });

  it('UX0685: sent view not shown when API returns error', async () => {
    // UX0685: error response keeps user on the form, not sent view
    getSupabaseMock().auth.signInWithOtp.mockResolvedValueOnce({
      error: { message: 'Something went wrong' },
    });
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Something went wrong'));
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('UX0686: form returns to idle state (button re-enabled) after API error', async () => {
    // UX0686: loading spinner is gone after error and button re-appears
    getSupabaseMock().auth.signInWithOtp.mockResolvedValueOnce({
      error: { message: 'Network error' },
    });
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => expect(screen.getByText('Send Magic Link')).toBeTruthy());
  });

  it('UX0687: sent view shows the email the user entered', async () => {
    // UX0687: the raw email state value (as typed) is echoed back in the confirmation
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.getByText('user@example.com')).toBeTruthy()
    );
  });

  it('UX0688: "Check your email" heading is shown in sent view', async () => {
    // UX0688: sent view renders the confirmation heading
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => expect(screen.getByText('Check your email')).toBeTruthy());
  });

  it('UX0689: signInWithOtp called with correct email object shape', async () => {
    // UX0689: API is called with {email, options} matching Supabase OTP shape
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'dev@suntrace.app');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'dev@suntrace.app',
        options: { emailRedirectTo: 'suntrace://auth/callback' },
      })
    );
  });

  it('UX0690: form is functional for a second attempt after "Use a different email"', async () => {
    // UX0690: user can complete a second magic link request after going back
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'first@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Use a different email'));
    fireEvent.press(screen.getByText('Use a different email'));
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'second@test.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledTimes(2)
    );
  });

  it('UX0691: "Send Magic Link" text disappears while loading', async () => {
    // UX0691: loading state replaces button text with spinner
    let resolve: (v: any) => void = () => {};
    getSupabaseMock().auth.signInWithOtp.mockReturnValueOnce(
      new Promise((res) => { resolve = res; })
    );
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    // While pending: text should be gone
    expect(screen.queryByText('Send Magic Link')).toBeNull();
    await act(async () => { resolve({ error: null }); });
  });

  it('UX0692: signInWithOtp is called exactly once per valid submission', async () => {
    // UX0692: one button press = one API call
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(getSupabaseMock().auth.signInWithOtp).toHaveBeenCalledTimes(1)
    );
  });

  it('UX0693: sent confirmation body contains the word "link"', async () => {
    // UX0693: confirmation message references the sign-in link
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() =>
      expect(screen.getByText(/sign-in link/i)).toBeTruthy()
    );
  });

  it('UX0694: "Use a different email" button is pressable without error', async () => {
    // UX0694: back navigation does not throw
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Use a different email'));
    expect(() =>
      fireEvent.press(screen.getByText('Use a different email'))
    ).not.toThrow();
  });

  it('UX0695: email value is preserved when returning via "Use a different email"', async () => {
    // UX0695: component state retains the email when going back
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Use a different email'));
    fireEvent.press(screen.getByText('Use a different email'));
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.props.value).toBe('a@b.com');
  });

  it('UX0696: no error shown in sent view', async () => {
    // UX0696: success path does not display any error text
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Check your email'));
    expect(screen.queryByText('Please enter your email address.')).toBeNull();
  });

  it('UX0697: "Check your email" heading is a Text element', async () => {
    // UX0697: confirmation heading renders as a Text node
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => {
      const heading = screen.getByText('Check your email');
      expect(heading.type).toBe('Text');
    });
  });

  it('UX0698: "Use a different email" triggers mode change back to idle', async () => {
    // UX0698: pressing back from sent view restores the form mode
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Use a different email'));
    fireEvent.press(screen.getByText('Use a different email'));
    expect(screen.getByText('Send Magic Link')).toBeTruthy();
  });

  it('UX0699: sent state hides "Email address" label', async () => {
    // UX0699: form label is not visible on the confirmation screen
    renderSignIn();
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => screen.getByText('Check your email'));
    expect(screen.queryByText('Email address')).toBeNull();
  });

  it('UX0700: screen renders correctly after full sign-in flow completes', async () => {
    // UX0700: complete happy-path flow ends with confirmation view visible
    renderSignIn();
    const input = screen.getByPlaceholderText('you@example.com');
    fireEvent.changeText(input, 'complete@flow.com');
    fireEvent.press(screen.getByText('Send Magic Link'));
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeTruthy();
      expect(screen.getByText('complete@flow.com')).toBeTruthy();
      expect(screen.getByText('Use a different email')).toBeTruthy();
    });
  });
});

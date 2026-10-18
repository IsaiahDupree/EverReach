/**
 * Admin Authentication System
 * Password-protected dashboard access with Resend email integration
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'super_admin' | 'analyst' | 'viewer';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminSession {
  id: string;
  admin_user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: AdminUser;
  session?: AdminSession;
  error?: string;
}

// ============================================================================
// PASSWORD HASHING
// ============================================================================

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new admin session
 */
export async function createSession(
  adminUserId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AdminSession | null> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { data, error } = await supabase
    .from('admin_sessions')
    .insert({
      admin_user_id: adminUserId,
      token,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create session:', error);
    return null;
  }

  return data;
}

/**
 * Verify a session token and return the admin user
 */
export async function verifySession(
  token: string
): Promise<AdminUser | null> {
  const { data, error } = await supabase.rpc('verify_admin_session', {
    p_token: token,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const result = data[0];

  if (!result.is_valid) {
    return null;
  }

  return {
    id: result.admin_user_id,
    email: result.email,
    name: null,
    role: result.role,
    is_active: true,
    last_login_at: null,
    created_at: '',
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('admin_sessions')
    .delete()
    .eq('token', token);

  return !error;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await supabase
    .from('admin_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Sign in an admin user
 */
export async function signIn(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  // Find admin user
  const { data: user, error: userError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (userError || !user) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  // Check if user is active
  if (!user.is_active) {
    return {
      success: false,
      error: 'Account is deactivated',
    };
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash);

  if (!isValidPassword) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  // Update last login
  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  // Create session
  const session = await createSession(user.id, ipAddress, userAgent);

  if (!session) {
    return {
      success: false,
      error: 'Failed to create session',
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    },
    session,
  };
}

/**
 * Sign out an admin user
 */
export async function signOut(token: string): Promise<boolean> {
  return deleteSession(token);
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Generate a password reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request a password reset
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  // Find admin user
  const { data: user, error: userError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (userError || !user) {
    // Don't reveal if email exists
    return { success: true };
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

  // Save reset token
  const { error: updateError } = await supabase
    .from('admin_users')
    .update({
      reset_token: resetToken,
      reset_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to save reset token:', updateError);
    return { success: false, error: 'Failed to process request' };
  }

  // Send reset email via Resend
  const resetUrl = `${process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@everreach.app',
      to: user.email,
      subject: 'Reset Your Admin Dashboard Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Reset Your Password</h1>
          <p>Hi ${user.name || 'Admin'},</p>
          <p>You requested to reset your password for the EverReach Admin Dashboard.</p>
          <p>Click the button below to reset your password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${resetUrl}</p>
          <p><strong>This link expires in 1 hour.</strong></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #999; font-size: 12px;">EverReach Admin Dashboard</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send reset email:', error);
    return { success: false, error: 'Failed to send reset email' };
  }

  return { success: true };
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Find user with valid reset token
  const { data: user, error: userError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('reset_token', token)
    .gt('reset_token_expires_at', new Date().toISOString())
    .single();

  if (userError || !user) {
    return {
      success: false,
      error: 'Invalid or expired reset token',
    };
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and clear reset token
  const { error: updateError } = await supabase
    .from('admin_users')
    .update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires_at: null,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update password:', updateError);
    return { success: false, error: 'Failed to update password' };
  }

  // Delete all existing sessions for this user
  await supabase
    .from('admin_sessions')
    .delete()
    .eq('admin_user_id', user.id);

  return { success: true };
}

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

/**
 * Create a new admin user
 */
export async function createAdminUser(
  email: string,
  password: string,
  name?: string,
  role: 'admin' | 'super_admin' | 'analyst' | 'viewer' = 'admin'
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  // Check if user already exists
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return {
      success: false,
      error: 'User with this email already exists',
    };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const { data: user, error } = await supabase
    .from('admin_users')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      role,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create admin user:', error);
    return { success: false, error: 'Failed to create user' };
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    },
  };
}

/**
 * Get admin user by ID
 */
export async function getAdminUser(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    is_active: data.is_active,
    last_login_at: data.last_login_at,
    created_at: data.created_at,
  };
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Extract session token from request headers
 */
export function extractSessionToken(
  headers: Headers
): string | null {
  const authHeader = headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Get IP address from request headers
 */
export function getIpAddress(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}

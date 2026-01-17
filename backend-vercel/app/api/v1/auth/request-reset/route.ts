import { NextRequest } from 'next/server';
import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getClientOrThrow } from "@/lib/supabase";
import { Resend } from 'resend';
import crypto from 'crypto';

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /v1/auth/request-reset
 * 
 * Initiates password reset flow:
 * 1. Validates email exists
 * 2. Generates secure token
 * 3. Stores in password_resets table
 * 4. Sends email via Resend
 * 
 * Security:
 * - Always returns success (don't leak user existence)
 * - Token expires in 30 minutes
 * - One-time use only
 */
export async function POST(req: NextRequest){
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }

  const { email } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return badRequest('Valid email required', req);
  }

  const supabase = getClientOrThrow(req);

  try {
    // Check if user exists (query auth.users table directly)
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    // Always return success to prevent email enumeration
    if (userError || !userData) {
      console.log(`[Reset] Email not found: ${email}`);
      return ok({ success: true, message: 'If that email exists, a reset link has been sent' }, req);
    }

    const userId = userData.id;

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token
    const { error: tokenError } = await supabase
      .from('password_resets')
      .insert({
        token,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('[Reset] Token insert error:', tokenError);
      return serverError('Failed to generate reset token', req);
    }

    // Construct reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://everreach.app'}/reset-password?token=${token}`;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'EverReach <noreply@everreach.app>',
      to: email,
      subject: 'Reset your EverReach password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password for EverReach.</p>
          <p>Click the link below to reset your password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="margin-top: 40px; color: #666; font-size: 14px;">
            This link will expire in 30 minutes. If you didn't request this, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            EverReach - Stay connected to what matters
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('[Reset] Email send error:', emailError);
      // Don't fail the request if email fails - token is stored
      // Return success anyway (user will need to contact support)
    }

    return ok({ 
      success: true, 
      message: 'If that email exists, a reset link has been sent' 
    }, req);

  } catch (error: any) {
    console.error('[Reset] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}

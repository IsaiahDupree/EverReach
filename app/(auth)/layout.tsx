'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Auth Layout Component
 *
 * Wraps authentication pages (login, signup, forgot-password) with:
 * - Centered layout for auth forms
 * - Automatic redirect to dashboard if user is already logged in
 * - Consistent styling and spacing
 *
 * This layout ensures that authenticated users don't access auth pages
 * and provides a clean, centered container for auth forms.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        // If user has an active session, redirect to dashboard
        if (!error && data.session) {
          router.replace('/dashboard');
        }
      } catch (err) {
        // Silently handle errors - user can still access auth pages
        console.error('Session check error:', err);
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}

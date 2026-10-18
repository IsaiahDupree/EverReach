'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { settingsNav } from '@/config/nav';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Settings Page Component
 *
 * Main settings page displaying navigation to various settings sub-pages.
 *
 * Features:
 * - Profile settings link
 * - Billing settings link
 * - User information display
 * - Card-based navigation
 *
 * Acceptance Criteria (WEB-PAGE-006):
 * - Profile settings
 * - Navigation to sub-pages
 */
export default function SettingsPage() {
  const { user } = useAuth();

  // Get user display info
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const email = user?.email || '';

  return (
    <div className="flex flex-col gap-8 p-8" data-testid="settings-page">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your current account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-base">{displayName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Navigation */}
      <section aria-label="Settings navigation">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block group"
              >
                <Card className="transition-all hover:shadow-md hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {Icon && (
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {item.title}
                          </CardTitle>
                          {item.description && (
                            <CardDescription className="mt-1">
                              {item.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

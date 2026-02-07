'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Plus,
  List,
  Settings,
  ArrowRight
} from 'lucide-react';

/**
 * Dashboard Page Component
 *
 * Main dashboard page displaying overview stats, recent items, and quick actions.
 *
 * Features:
 * - Overview stats cards showing key metrics
 * - Recent items section with latest activity
 * - Quick actions for common tasks
 *
 * Acceptance Criteria (WEB-PAGE-003):
 * - Overview stats
 * - Recent items
 * - Quick actions
 */
export default function DashboardPage() {
  const { user } = useAuth();

  // Mock data for stats (in real app, fetch from API)
  const stats = [
    {
      title: 'Total Items',
      value: '24',
      change: '+12%',
      icon: FileText,
      trend: 'up',
    },
    {
      title: 'Active Users',
      value: '1,234',
      change: '+5%',
      icon: Users,
      trend: 'up',
    },
    {
      title: 'Growth',
      value: '32%',
      change: '+8%',
      icon: TrendingUp,
      trend: 'up',
    },
    {
      title: 'Analytics',
      value: '89%',
      change: '+2%',
      icon: BarChart3,
      trend: 'up',
    },
  ];

  // Mock data for recent items (in real app, fetch from API)
  const recentItems = [
    {
      id: '1',
      title: 'Sample Item 1',
      description: 'This is a sample item description',
      createdAt: '2 hours ago',
    },
    {
      id: '2',
      title: 'Sample Item 2',
      description: 'Another sample item description',
      createdAt: '5 hours ago',
    },
    {
      id: '3',
      title: 'Sample Item 3',
      description: 'Yet another sample item',
      createdAt: '1 day ago',
    },
  ];

  // Quick actions
  const quickActions = [
    {
      title: 'Create Item',
      description: 'Add a new item to your collection',
      href: '/items/new',
      icon: Plus,
      variant: 'default' as const,
    },
    {
      title: 'View All Items',
      description: 'Browse your complete item list',
      href: '/items',
      icon: List,
      variant: 'outline' as const,
    },
    {
      title: 'Settings',
      description: 'Manage your account settings',
      href: '/settings',
      icon: Settings,
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-8" data-testid="dashboard-page">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.user_metadata?.full_name || user?.email || 'User'}!
        </p>
      </div>

      {/* Overview Stats */}
      <section aria-label="Overview statistics">
        <h2 className="mb-4 text-xl font-semibold">Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{stat.change}</span> from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Items and Quick Actions Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Items */}
        <section className="lg:col-span-2" aria-label="Recent items">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Items</h2>
            <Link
              href="/items"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {recentItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No items yet</p>
                  <p className="text-sm mt-1">Create your first item to get started</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recentItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="block p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.createdAt}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section aria-label="Quick actions">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card key={action.title} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      asChild
                      variant={action.variant}
                      className="w-full"
                    >
                      <Link href={action.href}>
                        {action.title}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

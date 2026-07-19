/**
 * PulseLense - API Service
 *
 * All operations use real Supabase endpoints.
 * Auth is enforced on every call — RLS policies handle row-level access.
 */

import { supabase } from '@/lib/supabase';
import {
  Dashboard,
  CreateDashboardInput,
  UpdateDashboardInput,
  Metric,
  CreateMetricInput,
  UpdateMetricInput,
  Alert,
  CreateAlertInput,
  UpdateAlertInput,
  AlertStatus,
  PaginatedResponse,
} from '@/types/models';

// ============================================
// Auth helper
// ============================================

async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user;
}

// ============================================
// Dashboard operations
// ============================================

export async function getDashboards(): Promise<Dashboard[]> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('dashboards')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDashboard(id: string): Promise<Dashboard> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('dashboards')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDashboard(input: CreateDashboardInput): Promise<Dashboard> {
  const user = await getAuthenticatedUser();

  // If this dashboard is the default, unset any existing default first
  if (input.is_default) {
    await supabase
      .from('dashboards')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('dashboards')
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description ?? null,
      layout: input.layout ?? 'grid',
      is_default: input.is_default ?? false,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDashboard(id: string, input: UpdateDashboardInput): Promise<Dashboard> {
  const user = await getAuthenticatedUser();

  if (input.is_default) {
    await supabase
      .from('dashboards')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
      .neq('id', id);
  }

  const { data, error } = await supabase
    .from('dashboards')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDashboard(id: string): Promise<void> {
  const user = await getAuthenticatedUser();

  const { error } = await supabase
    .from('dashboards')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================
// Metric operations
// ============================================

export async function getMetrics(dashboardId: string): Promise<Metric[]> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', user.id)
    .eq('dashboard_id', dashboardId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllMetrics(page = 1, limit = 20): Promise<PaginatedResponse<Metric>> {
  const user = await getAuthenticatedUser();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('metrics')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    per_page: limit,
    has_more: (count ?? 0) > offset + limit,
  };
}

export async function getMetric(id: string): Promise<Metric> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMetric(input: CreateMetricInput): Promise<Metric> {
  const user = await getAuthenticatedUser();

  // Determine next sort order within the dashboard
  const { count } = await supabase
    .from('metrics')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('dashboard_id', input.dashboard_id);

  const { data, error } = await supabase
    .from('metrics')
    .insert({
      user_id: user.id,
      dashboard_id: input.dashboard_id,
      name: input.name,
      description: input.description ?? null,
      metric_type: input.metric_type,
      source: input.source,
      value: 0,
      unit: input.unit ?? null,
      period: input.period ?? '24h',
      threshold_warning: input.threshold_warning ?? null,
      threshold_critical: input.threshold_critical ?? null,
      is_visible: true,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMetric(id: string, input: UpdateMetricInput): Promise<Metric> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('metrics')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMetric(id: string): Promise<void> {
  const user = await getAuthenticatedUser();

  const { error } = await supabase
    .from('metrics')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================
// Alert operations
// ============================================

export async function getAlerts(dashboardId?: string): Promise<Alert[]> {
  const user = await getAuthenticatedUser();

  let query = supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'acknowledged'])
    .order('triggered_at', { ascending: false });

  if (dashboardId) {
    query = query.eq('dashboard_id', dashboardId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAlert(id: string): Promise<Alert> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAlert(input: CreateAlertInput): Promise<Alert> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: user.id,
      metric_id: input.metric_id,
      dashboard_id: input.dashboard_id,
      name: input.name,
      description: input.description ?? null,
      condition: input.condition,
      threshold: input.threshold,
      severity: input.severity,
      status: 'active',
      notification_channels: input.notification_channels ?? ['push'],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAlert(id: string, input: UpdateAlertInput): Promise<Alert> {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('alerts')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAlertStatus(id: string, status: AlertStatus): Promise<Alert> {
  const user = await getAuthenticatedUser();

  const timestamps: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (status === 'acknowledged') timestamps.acknowledged_at = new Date().toISOString();
  if (status === 'resolved') timestamps.resolved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('alerts')
    .update({ status, ...timestamps })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAlert(id: string): Promise<void> {
  const user = await getAuthenticatedUser();

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================
// User profile operations
// ============================================

export async function getUserProfile() {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('users')
    .select('*, subscription:subscriptions(*)')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(updates: { full_name?: string; avatar_url?: string }) {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

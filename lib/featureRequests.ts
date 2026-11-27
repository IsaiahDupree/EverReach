/**
 * Feature Requests API Client
 * 
 * Integrates with backend-vercel feature requests system
 */

import { apiFetch } from './api';

export interface FeatureRequest {
  id: string;
  type: 'feature' | 'feedback' | 'bug';
  title: string;
  description: string;
  status: 'pending' | 'reviewing' | 'planned' | 'in_progress' | 'shipped' | 'declined';
  priority: 'low' | 'medium' | 'high' | 'critical';
  votes_count: number;
  user_has_voted: boolean;
  user_id?: string;
  email?: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  target_version?: string;
  shipped_at?: string;
  declined_reason?: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'breaking';
  published: boolean;
  published_at: string;
  feature?: {
    id: string;
    title: string;
    type: string;
    votes_count: number;
  };
}

export const featureRequestsApi = {
  /**
   * List feature requests with optional filters
   */
  async list(params?: {
    status?: string;
    type?: 'feature' | 'feedback' | 'bug';
    sort?: 'votes' | 'recent' | 'oldest';
    limit?: number;
    my_votes?: boolean;
  }): Promise<{ success: boolean; data: FeatureRequest[]; count: number }> {
    const query = new URLSearchParams(params as any);
    const response = await apiFetch(`/v1/feature-requests?${query}`);
    return response.json();
  },

  /**
   * Get a single feature request by ID
   */
  async get(id: string): Promise<{ success: boolean; data: FeatureRequest }> {
    const response = await apiFetch(`/v1/feature-requests/${id}`);
    return response.json();
  },

  /**
   * Create a new feature request
   */
  async create(data: {
    type: 'feature' | 'feedback' | 'bug';
    title: string;
    description: string;
    email?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; data: FeatureRequest; message: string }> {
    const response = await apiFetch('/v1/feature-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Update a feature request (owner or admin only)
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      tags?: string[];
      status?: string;
      priority?: string;
    }
  ): Promise<{ success: boolean; data: FeatureRequest; message: string }> {
    const response = await apiFetch(`/v1/feature-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Delete a feature request (owner only)
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiFetch(`/v1/feature-requests/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  /**
   * Vote for a feature request
   */
  async vote(id: string): Promise<{
    success: boolean;
    data: { vote_id: string; feature_id: string; votes_count: number };
    message: string;
  }> {
    const response = await apiFetch(`/v1/feature-requests/${id}/vote`, {
      method: 'POST',
    });
    return response.json();
  },

  /**
   * Remove vote from a feature request
   */
  async unvote(id: string): Promise<{
    success: boolean;
    data: { feature_id: string; votes_count: number };
    message: string;
  }> {
    const response = await apiFetch(`/v1/feature-requests/${id}/vote`, {
      method: 'DELETE',
    });
    return response.json();
  },

  /**
   * Get public changelog entries
   */
  async changelog(params?: {
    version?: string;
    category?: 'feature' | 'improvement' | 'bugfix' | 'breaking';
    limit?: number;
  }): Promise<{
    success: boolean;
    data: ChangelogEntry[];
    grouped: Record<string, ChangelogEntry[]>;
    count: number;
  }> {
    const query = new URLSearchParams(params as any);
    const response = await apiFetch(`/v1/changelog?${query}`);
    return response.json();
  },
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { TeamMember, TeamInvite, TeamRole } from '@/lib/types/team'

/**
 * Hook to fetch team members
 */
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () => getJsonArray<TeamMember>('/api/v1/team/members', { requireAuth: true }),
    staleTime: 5 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch pending invites
 */
export function useTeamInvites() {
  return useQuery({
    queryKey: ['team-invites'],
    queryFn: () => getJsonArray<TeamInvite>('/api/v1/team/invites', { requireAuth: true }),
    staleTime: 5 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to invite team member
 */
export function useInviteTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: TeamRole }) => {
      const response = await apiFetch('/api/v1/team/invite', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ email, role }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Invite failed' }))
        throw new Error(error.error || 'Failed to send invite')
      }

      return response.json() as Promise<TeamInvite>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] })
    },
  })
}

/**
 * Hook to update member role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const response = await apiFetch(`/api/v1/team/members/${memberId}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      return response.json() as Promise<TeamMember>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

/**
 * Hook to remove team member
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiFetch(`/api/v1/team/members/${memberId}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to remove member')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

/**
 * Hook to cancel invite
 */
export function useCancelInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiFetch(`/api/v1/team/invites/${inviteId}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to cancel invite')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] })
    },
  })
}

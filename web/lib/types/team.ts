// Team Types

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface TeamMember {
  id: string
  org_id: string
  user_id: string
  email: string
  display_name?: string
  role: TeamRole
  invited_by?: string
  invited_at: string
  accepted_at?: string
  last_active_at?: string
  is_active: boolean
}

export interface TeamInvite {
  id: string
  org_id: string
  email: string
  role: TeamRole
  invited_by: string
  expires_at: string
  created_at: string
}

export const TEAM_ROLES: Record<TeamRole, {
  label: string
  description: string
  permissions: string[]
}> = {
  owner: {
    label: 'Owner',
    description: 'Full access to everything including billing',
    permissions: [
      'Manage team members',
      'Access all data',
      'Configure integrations',
      'Manage billing',
      'Delete organization',
    ],
  },
  admin: {
    label: 'Admin',
    description: 'Manage team and access all data',
    permissions: [
      'Manage team members',
      'Access all data',
      'Configure integrations',
      'View billing',
    ],
  },
  member: {
    label: 'Member',
    description: 'Full access to contacts and features',
    permissions: [
      'Create and edit contacts',
      'View all contacts',
      'Use all features',
      'Upload files',
    ],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to contacts',
    permissions: [
      'View contacts',
      'View interactions',
      'View reports',
    ],
  },
}

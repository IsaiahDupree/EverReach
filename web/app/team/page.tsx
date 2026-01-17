'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Mail, Shield, Crown, X, User, Eye } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { 
  useTeamMembers, 
  useTeamInvites,
  useInviteTeamMember,
  useRemoveTeamMember,
  useUpdateMemberRole,
  useCancelInvite
} from '@/lib/hooks/useTeam'
import { TEAM_ROLES, TeamMember, TeamInvite, TeamRole } from '@/lib/types/team'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/utils'
import RequireAuth from '@/components/RequireAuth'
import { cn } from '@/lib/utils'

function TeamPageContent() {
  const { showToast } = useToast()
  const { data: members, isLoading: membersLoading } = useTeamMembers()
  const { data: invites, isLoading: invitesLoading } = useTeamInvites()
  
  const inviteMember = useInviteTeamMember()
  const removeMember = useRemoveTeamMember()
  const updateRole = useUpdateMemberRole()
  const cancelInvite = useCancelInvite()

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('member')

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('error', 'Please enter an email')
      return
    }

    try {
      await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole })
      showToast('success', 'Invitation sent')
      setShowInviteForm(false)
      setInviteEmail('')
      setInviteRole('member')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to send invite')
    }
  }

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.email} from team?`)) return

    try {
      await removeMember.mutateAsync(member.id)
      showToast('success', 'Member removed')
    } catch (error) {
      showToast('error', 'Failed to remove member')
    }
  }

  const handleCancelInvite = async (invite: TeamInvite) => {
    if (!confirm(`Cancel invite to ${invite.email}?`)) return

    try {
      await cancelInvite.mutateAsync(invite.id)
      showToast('success', 'Invite cancelled')
    } catch (error) {
      showToast('error', 'Failed to cancel invite')
    }
  }

  const roleOptions = Object.entries(TEAM_ROLES).map(([value, config]) => ({
    value,
    label: config.label,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team</h1>
            <p className="text-gray-600 mt-1">Manage team members and permissions</p>
          </div>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Team Management</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Invite team members</strong> via email</li>
          <li>• <strong>Set roles</strong> - Owner, Admin, Member, or Viewer</li>
          <li>• <strong>Manage permissions</strong> - Control what each role can do</li>
          <li>• <strong>Track activity</strong> - See when members were last active</li>
        </ul>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h2>
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
            />
            
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              options={roleOptions}
            />

            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
              <strong>{TEAM_ROLES[inviteRole].label}:</strong> {TEAM_ROLES[inviteRole].description}
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowInviteForm(false)}
                disabled={inviteMember.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                isLoading={inviteMember.isPending}
              >
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {invites && invites.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Invitations ({invites.length})
          </h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-gray-900">{invite.email}</div>
                    <div className="text-sm text-gray-600">
                      {TEAM_ROLES[invite.role].label} • Invited {formatDateTime(invite.created_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Team Members ({members?.length || 0})
        </h2>

        {membersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onRemove={() => handleRemove(member)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No team members yet
          </div>
        )}
      </div>

      {/* Role Permissions */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(TEAM_ROLES).map(([role, config]) => (
            <div key={role} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                {getRoleIcon(role as TeamRole)}
                <h4 className="font-medium text-gray-900">{config.label}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">{config.description}</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {config.permissions.map((permission, index) => (
                  <li key={index}>• {permission}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MemberCard({ member, onRemove }: { member: TeamMember; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 flex-1">
        {getRoleIcon(member.role)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">
              {member.display_name || member.email}
            </h4>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded font-medium',
              member.role === 'owner' && 'bg-purple-100 text-purple-700',
              member.role === 'admin' && 'bg-blue-100 text-blue-700',
              member.role === 'member' && 'bg-green-100 text-green-700',
              member.role === 'viewer' && 'bg-gray-100 text-gray-700'
            )}>
              {TEAM_ROLES[member.role].label}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {member.email}
            {member.last_active_at && ` • Last active ${formatDateTime(member.last_active_at)}`}
          </div>
        </div>
      </div>
      
      {member.role !== 'owner' && (
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-600 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function getRoleIcon(role: TeamRole) {
  switch (role) {
    case 'owner':
      return <Crown className="h-5 w-5 text-purple-600" />
    case 'admin':
      return <Shield className="h-5 w-5 text-blue-600" />
    case 'member':
      return <User className="h-5 w-5 text-green-600" />
    case 'viewer':
      return <Eye className="h-5 w-5 text-gray-600" />
  }
}

export default function TeamPage() {
  return (
    <RequireAuth>
      <TeamPageContent />
    </RequireAuth>
  )
}

export type PipelineTheme = 'networking' | 'personal' | 'business';

export const PipelineThemes: PipelineTheme[] = ['networking', 'personal', 'business'];

export const PipelineLabels: Record<PipelineTheme, string> = {
  networking: 'Networking',
  personal: 'Personal',
  business: 'Business',
};

export const ThemeColors: Record<PipelineTheme, { primary: string; tint: string } > = {
  networking: { primary: '#4A90E2', tint: '#E8F2FF' },
  personal: { primary: '#FF6B6B', tint: '#FFECEC' },
  business: { primary: '#4ECDC4', tint: '#E8FBF8' },
};

export const PipelineStages: Record<PipelineTheme, string[]> = {
  networking: [
    'New / Added',
    'Initial Contact',
    'Engaged Conversation',
    'Opportunity / Mutual Value',
    'Ongoing Connection',
    'Dormant / Needs Revival',
    'Archived',
  ],
  personal: [
    'Met / Added',
    'First Contact / Icebreaker',
    'Casual Conversations',
    'Developing Friendship',
    'Close Friend / Inner Circle',
    'Dormant / Cooling',
    'Archived',
  ],
  business: [
    'Prospect / Lead',
    'Contacted / Outreach',
    'Discovery / Conversation',
    'Qualified Opportunity',
    'Proposal / Negotiation',
    'Closed – Won',
    'Closed – Lost',
  ],
};

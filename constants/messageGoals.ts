import { MessageGoal, Channel } from '@/types/message';

export const DEFAULT_MESSAGE_GOALS: MessageGoal[] = [
  {
    id: 'check_in',
    name: 'Check In',
    template: 'Write a friendly {channel} message to {contact_first} for a casual check-in. Reference {shared_interests} or {recent_notes} if relevant. Keep it {tone} and {length}. End with an open question.',
    defaultChannels: ['sms', 'dm'],
    styleTags: ['casual', 'relationship-building']
  },
  {
    id: 'congratulate',
    name: 'Congratulate',
    template: 'Write a {tone} {channel} message to {contact_first} congratulating them on a recent achievement. Reference {recent_notes} if available. Keep it {length} and genuine.',
    defaultChannels: ['sms', 'email', 'dm'],
    styleTags: ['positive', 'celebratory']
  },
  {
    id: 'share_resource',
    name: 'Share Resource',
    template: 'Write a {channel} message to {contact_first} sharing a helpful resource. Connect it to {shared_interests} or {recent_notes}. Be {tone} and explain why it\'s relevant. Keep it {length}.',
    defaultChannels: ['email', 'dm'],
    styleTags: ['helpful', 'value-add']
  },
  {
    id: 'ask_intro',
    name: 'Ask for Intro',
    template: 'Write a {tone} {channel} message to {contact_first} requesting an introduction. Reference your relationship and {shared_interests}. Be specific about who and why. Keep it {length}.',
    defaultChannels: ['email'],
    styleTags: ['professional', 'specific']
  },
  {
    id: 'schedule_meet',
    name: 'Schedule Meeting',
    template: 'Write a {channel} message to {contact_first} proposing a meeting or call. Reference {recent_notes} or {shared_interests} for context. Be {tone} and suggest specific times. Keep it {length}.',
    defaultChannels: ['email', 'sms'],
    styleTags: ['actionable', 'specific']
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    template: 'Write a {tone} {channel} follow-up message to {contact_first} about a previous conversation. Reference {recent_notes} and next steps. Keep it {length} and actionable.',
    defaultChannels: ['email', 'sms'],
    styleTags: ['professional', 'actionable']
  },
  {
    id: 'thank_you',
    name: 'Thank You',
    template: 'Write a {tone} {channel} thank you message to {contact_first}. Reference what you\'re thanking them for from {recent_notes}. Be specific and genuine. Keep it {length}.',
    defaultChannels: ['sms', 'email', 'dm'],
    styleTags: ['grateful', 'specific']
  }
];

export function getGoalById(goalId: string, customGoals: MessageGoal[] = []): MessageGoal | undefined {
  return [...DEFAULT_MESSAGE_GOALS, ...customGoals].find(goal => goal.id === goalId);
}

export function getDefaultChannelForGoal(goalId: string, customGoals: MessageGoal[] = []): Channel {
  const goal = getGoalById(goalId, customGoals);
  return goal?.defaultChannels[0] || 'sms';
}
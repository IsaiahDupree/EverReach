export type Goal = {
  id: string;
  label: string;
  emoji?: string;
  cadenceDays?: number;
};

export const DEFAULT_GOALS: Goal[] = [
  { id: 'checkin', label: 'Check-in', emoji: '👋', cadenceDays: 14 },
  { id: 'collab', label: 'Collab Pitch', emoji: '🤝', cadenceDays: 10 },
  { id: 'deal', label: 'Close Deal', emoji: '💼', cadenceDays: 7 },
  { id: 'invite', label: 'Invite to Event', emoji: '📩', cadenceDays: 21 },
];

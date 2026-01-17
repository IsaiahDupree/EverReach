import { Platform } from 'react-native';

export type ContactContext = {
  name: string;
  title: string;
  company: string;
  lastContactDays: number;
  lastTopic?: string;
  interests?: string[];
};

export type ChosenMode = 'suggested' | 'custom' | 'screenshot' | null;

export function deriveSuggestedGoals(ctx: ContactContext): string[] {
  const goals: string[] = [];
  
  // Always include these core goals that map to predefined goal IDs
  goals.push('Follow up on our last chat');
  goals.push('Share a quick update');
  goals.push('Propose a quick call');
  goals.push('Casual check-in');
  
  // Add context-specific goals as custom goals
  if (ctx.lastTopic) {
    goals.push(`Follow up on ${ctx.lastTopic}`);
  }
  if (ctx.interests?.length) {
    goals.push(`Ask about ${ctx.interests[0]}`);
  }
  
  // Add AI-specific goals for the demo
  goals.push('Follow up on AI features');
  goals.push('Ask about ai');
  
  return Array.from(new Set(goals));
}

export const exampleContext: ContactContext = {
  name: 'Emily Johnson',
  title: 'Investment Associate',
  company: 'Venture Capital Partners',
  lastContactDays: 45,
  lastTopic: 'Series A',
  interests: ['Startups', 'SaaS', 'Tennis'],
};

export const isWeb = Platform.OS === 'web';

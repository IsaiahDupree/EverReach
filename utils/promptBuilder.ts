import { MessageGoal, MessageContext, Channel, ToneStyle } from '@/types/message';

export function buildMessageContext(
  goal: MessageGoal,
  person: any,
  voiceNotes: any[],
  channel: Channel,
  tone: ToneStyle = 'casual',
  additionalContext?: string,
  voiceContext?: string
): MessageContext {
  const firstName = person.fullName?.split(' ')[0] || '';
  const lastName = person.fullName?.split(' ').slice(1).join(' ') || '';
  
  // Get recent notes for this person
  const personNotes = voiceNotes
    .filter(note => note.personId === person.id)
    .slice(-3)
    .map(note => note.transcript?.slice(0, 100))
    .filter(Boolean)
    .join('. ');
  
  // Build shared interests string
  const interests = person.interests?.slice(0, 3).join(', ') || '';
  
  // Combine recent notes with additional context
  const combinedNotes = [personNotes, additionalContext]
    .filter(Boolean)
    .join('. ');
  
  return {
    goal_name: goal.name.toLowerCase(),
    user_bio: 'Professional networker focused on meaningful relationships',
    brand_voice: 'Friendly, authentic, and value-focused',
    voiceContext,
    contact_first: firstName,
    contact_last: lastName,
    contact_role: person.title || '',
    company: person.company || '',
    recent_notes: combinedNotes || '',
    shared_interests: interests,
    tone,
    length: 'short',
    channel
  };
}

export function buildPrompt(goal: MessageGoal, context: MessageContext): string {
  let template = goal.template;
  
  // Replace all template variables
  Object.entries(context).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    template = template.replaceAll(placeholder, value || '');
  });
  
  // Add system instructions for better output
  const systemPrompt = `Generate 3 different message variants. Each should be:
- Concise and natural (2-3 sentences max)
- Appropriate for ${context.channel.toUpperCase()}
- ${context.tone} in tone
- Include one clear call-to-action or question
- Avoid generic phrases

Return as JSON array of strings: ["message1", "message2", "message3"]`;
  
  return `${systemPrompt}\n\nContext: ${template}`;
}

export function fillTemplate(template: string, context: MessageContext): string {
  let filled = template;
  Object.entries(context).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    filled = filled.replaceAll(placeholder, value || '');
  });
  return filled;
}
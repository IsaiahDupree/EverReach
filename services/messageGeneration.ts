import { MessageGoal, MessageContext, GeneratedVariant } from '@/types/message';
import { trpcClient } from '@/lib/trpc';
import { apiFetch } from '@/lib/api';
import { FLAGS } from '@/constants/flags';

export async function generateMessages(
  goal: MessageGoal,
  context: MessageContext
): Promise<GeneratedVariant[]> {
  const startTime = Date.now();
  
  try {
    if (FLAGS.LOCAL_ONLY) {
      console.log('🏠 Using local-only message generation');
      const messages = await generateMockMessages(goal, context);
      const latency = Date.now() - startTime;
      console.log(`Generated ${messages.length} local variants in ${latency}ms`);
      
      return messages.map((text) => ({
        text,
        subject: context.channel === 'email' ? generateSubject(goal, context) : undefined,
        edited: false
      }));
    }
    
    // Try backend-vercel messages API first
    console.log('🌐 Attempting backend-vercel message generation...');
    
    try {
      const response = await apiFetch('/api/messages/craft', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          prompt: `Generate a ${context.tone} ${context.channel} message for ${goal.name}. Context: ${context.contact_first} ${context.contact_last} at ${context.company}. Recent notes: ${context.recent_notes}. Shared interests: ${context.shared_interests}.`,
          tone: context.tone
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const latency = Date.now() - startTime;
        console.log(`✅ Backend-vercel generation successful in ${latency}ms`);
        
        return [{
          text: data.message,
          subject: context.channel === 'email' ? generateSubject(goal, context) : undefined,
          edited: false
        }];
      }
    } catch (cloudError) {
      console.warn('Backend-vercel API failed, trying tRPC fallback:', cloudError);
    }
    
    // Fallback to tRPC if available (currently not implemented in backend-vercel)
    try {
      const result = await trpcClient.messages.craft.mutate({
        prompt: `Generate a ${context.tone} ${context.channel} message for ${goal.name}. Context: ${context.contact_first} ${context.contact_last} at ${context.company}. Recent notes: ${context.recent_notes}. Shared interests: ${context.shared_interests}.`,
        tone: context.tone
      });
      
      const latency = Date.now() - startTime;
      console.log(`✅ tRPC generation successful in ${latency}ms`);
      
      return [{
        text: result.message,
        subject: context.channel === 'email' ? generateSubject(goal, context) : undefined,
        edited: false
      }];
    } catch (trpcError) {
      console.warn('tRPC also failed, falling back to local generation:', trpcError);
    }
    
    // Final fallback to local generation
    console.log('🏠 Falling back to local message generation');
    const messages = await generateMockMessages(goal, context);
    const latency = Date.now() - startTime;
    console.log(`✅ Local fallback successful: ${messages.length} variants in ${latency}ms`);
    
    return messages.map((text) => ({
      text,
      subject: context.channel === 'email' ? generateSubject(goal, context) : undefined,
      edited: false
    }));

  } catch (error) {
    console.error('Message generation failed:', error);
    throw new Error('Failed to generate messages. Please try again.');
  }
}

async function generateMockMessages(goal: MessageGoal, context: MessageContext): Promise<string[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const { contact_first, shared_interests, recent_notes, tone } = context;
  const firstName = tone === 'casual' ? contact_first.toLowerCase() : contact_first;
  
  switch (goal.id) {
    case 'custom':
      return [
        tone === 'casual'
          ? `hey ${firstName}, quick note about ${context.goal_name}. what do you think?`
          : `Hi ${contact_first}, following up about ${context.goal_name}. Would love your thoughts.`,
        tone === 'casual'
          ? `${firstName} — thinking about ${context.goal_name}. free to chat this week?`
          : `${contact_first}, circling back on ${context.goal_name}. Are you available to connect this week?`,
        tone === 'casual'
          ? `hey ${firstName}, any updates on ${context.goal_name}?`
          : `Hi ${contact_first}, do you have any updates on ${context.goal_name}?`
      ];
    case 'check_in':
      return [
        tone === 'casual' 
          ? `hey ${firstName}, how's ${shared_interests || 'everything'} going? been thinking about our last chat`
          : `Hi ${contact_first}, hope you're doing well! Wanted to check in on ${shared_interests || 'your projects'} and see how things are progressing.`,
        tone === 'casual'
          ? `${firstName} — quick check-in. anything exciting happening with ${shared_interests || 'work'}?`
          : `${contact_first}, just wanted to touch base and see what's new. Hope all is well!`,
        tone === 'casual'
          ? `thinking of you ${firstName}! how are things with ${shared_interests || 'the team'}?`
          : `${contact_first}, wanted to reach out and see how you've been. Any updates on ${shared_interests || 'your projects'}?`
      ];
      
    case 'congratulate':
      return [
        tone === 'casual'
          ? `${firstName} — just heard about your win! that's awesome. well deserved 🎉`
          : `${contact_first}, congratulations on your recent achievement! Really excited for you.`,
        tone === 'casual'
          ? `so proud of you ${firstName}! saw the news and had to reach out`
          : `${contact_first}, wanted to personally congratulate you. What an accomplishment!`,
        tone === 'casual'
          ? `${firstName}!! crushing it as always. celebrate tonight! 🥳`
          : `${contact_first}, heard the great news and wanted to reach out. Congratulations!`
      ];
      
    case 'share_resource':
      return [
        tone === 'casual'
          ? `${firstName} — saw this and thought of you: [link]. relates to what we discussed about ${shared_interests || 'your work'}`
          : `Hi ${contact_first}, came across this resource that might interest you: [link]. It relates to our conversation about ${shared_interests || 'your work'}.`,
        tone === 'casual'
          ? `${firstName}, this reminded me of you: [link]. thought you'd find it useful`
          : `${contact_first}, found something that aligns with your interests in ${shared_interests || 'your field'}: [link]`,
        tone === 'casual'
          ? `hey ${firstName}, stumbled on this and immediately thought of our chat: [link]`
          : `${contact_first}, sharing this resource that connects to our discussion about ${shared_interests || 'your projects'}: [link]`
      ];
      
    case 'ask_intro':
      return [
        `Hi ${contact_first}, hope you're well! I'm looking to connect with someone in ${shared_interests || 'your network'} and thought you might know the right person. Would you be open to making an introduction?`,
        `${contact_first}, reaching out because I value your network and expertise. I'm seeking to connect with professionals in ${shared_interests || 'your field'}. Any introductions you could facilitate?`,
        `Hi ${contact_first}, given our shared interest in ${shared_interests || 'the industry'}, I wondered if you might know someone I should connect with. Happy to provide more context if helpful.`
      ];
      
    case 'schedule_meet':
      return [
        tone === 'casual'
          ? `${firstName} — would love to catch up over coffee. free next week? thinking tuesday or wednesday afternoon`
          : `Hi ${contact_first}, would love to schedule some time to catch up. Are you available for coffee next week? Tuesday or Wednesday afternoon work well for me.`,
        tone === 'casual'
          ? `${firstName}, been too long! want to grab lunch and chat about ${shared_interests || 'life'}? next week good?`
          : `${contact_first}, it's been a while since we connected. Would you be interested in meeting for lunch to discuss ${shared_interests || 'recent developments'}?`,
        tone === 'casual'
          ? `hey ${firstName}, thinking we should reconnect. 30min call this week? or coffee if you prefer`
          : `${contact_first}, I'd appreciate the opportunity to reconnect. Would you have 30 minutes for a call this week, or would you prefer to meet in person?`
      ];
      
    case 'follow_up':
      return [
        `Hi ${contact_first}, following up on our conversation about ${recent_notes || shared_interests || 'our discussion'}. Wanted to share the next steps we discussed.`,
        `${contact_first}, circling back on ${recent_notes || 'our recent chat'}. Here's what I mentioned I'd send over.`,
        `Hi ${contact_first}, as promised, following up with more details about ${recent_notes || shared_interests || 'what we discussed'}. Let me know your thoughts.`
      ];
      
    case 'thank_you':
      return [
        tone === 'casual'
          ? `${firstName} — thank you so much for ${recent_notes || 'your help'}! really appreciate it`
          : `${contact_first}, wanted to thank you for ${recent_notes || 'your assistance'}. It was incredibly helpful.`,
        tone === 'casual'
          ? `grateful for you ${firstName}! ${recent_notes || 'your support'} means a lot`
          : `${contact_first}, I'm very grateful for ${recent_notes || 'your time and insights'}. Thank you.`,
        tone === 'casual'
          ? `${firstName}, you're the best! thanks for ${recent_notes || 'everything'} 🙏`
          : `${contact_first}, I wanted to express my sincere appreciation for ${recent_notes || 'your help'}. Thank you so much.`
      ];
      
    default:
      return [
        `Hi ${contact_first}, hope you're doing well! Wanted to reach out and connect.`,
        `${contact_first}, thinking of you and wanted to say hello. How have you been?`,
        `Hi ${contact_first}, it's been a while since we connected. Hope all is well with you.`
      ];
  }
}

function generateSubject(goal: MessageGoal, context: MessageContext): string {
  switch (goal.id) {
    case 'check_in':
      return 'Quick check-in';
    case 'congratulate':
      return 'Congratulations!';
    case 'share_resource':
      return 'Thought you\'d find this interesting';
    case 'ask_intro':
      return 'Introduction request';
    case 'schedule_meet':
      return 'Let\'s catch up';
    case 'follow_up':
      return 'Following up';
    case 'thank_you':
      return 'Thank you';
    default:
      return 'Following up';
  }
}
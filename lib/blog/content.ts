/**
 * Blog Seed Content
 * Static content for the blog until backend API is ready.
 * Real, useful articles about relationships and personal CRM.
 */
import type { BlogPost, BlogAuthor, BlogCategory, GlossaryTerm } from './types';

// ── Authors ──────────────────────────────────────────────
export const AUTHORS: Record<string, BlogAuthor> = {
  everreach: {
    name: 'EverReach Team',
    slug: 'everreach-team',
    bio: 'The EverReach team builds tools to help you nurture the relationships that matter most. We write about friendship, networking, and staying connected in a busy world.',
    role: 'Editorial Team',
    avatar_url: undefined,
  },
};

// ── Categories ───────────────────────────────────────────
export const CATEGORIES: BlogCategory[] = [
  {
    slug: 'personal-crm',
    name: 'Personal CRM',
    description: 'Systems and tools for managing your personal and professional relationships intentionally.',
    color: '#7C3AED',
    icon: 'Users',
  },
  {
    slug: 'friendships',
    name: 'Friendship Systems',
    description: 'How to maintain, deepen, and rebuild the friendships that make life meaningful.',
    color: '#EC4899',
    icon: 'Heart',
  },
  {
    slug: 'networking',
    name: 'Networking',
    description: 'Authentic networking strategies that build real connections, not just contact lists.',
    color: '#3B82F6',
    icon: 'Globe',
  },
  {
    slug: 'follow-up',
    name: 'Follow-Up',
    description: 'Templates, scripts, and systems for following up without feeling awkward or forced.',
    color: '#10B981',
    icon: 'MessageCircle',
  },
  {
    slug: 'social-capital',
    name: 'Social Capital',
    description: 'Understanding and building the invisible currency of strong relationships.',
    color: '#F59E0B',
    icon: 'TrendingUp',
  },
  {
    slug: 'founders',
    name: 'Founder Networking',
    description: 'Relationship strategies specifically for founders, freelancers, and solo operators.',
    color: '#6366F1',
    icon: 'Rocket',
  },
];

export const CATEGORY_MAP: Record<string, BlogCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);

// ── Articles ─────────────────────────────────────────────

export const POSTS: BlogPost[] = [
  {
    id: 'why-friendships-fade',
    slug: 'why-friendships-fade',
    title: 'Why Friendships Fade — and the Simple System to Stop It',
    excerpt: 'Most friendships don\'t end with a fight. They end with silence. Here\'s why it happens and a practical system to prevent it.',
    answer_summary: 'Friendships fade because life gets busy and no one takes responsibility for initiating contact. The fix isn\'t more effort — it\'s a lightweight system: track when you last reached out, set gentle reminders, and rotate through your closest 20 people every 2-3 weeks. Apps like EverReach automate the tracking so you just focus on the human part.',
    content_html: `
<h2 id="the-real-reason">The Real Reason Friendships Fade</h2>
<p>It's rarely a fight. It's rarely a betrayal. Most friendships end the same quiet way: you both get busy, neither person reaches out, and months turn into years.</p>
<p>Research from Robin Dunbar's lab at Oxford shows that without regular contact, even close friendships degrade within 6-12 months. Your brain literally reclassifies people from "inner circle" to "acquaintance" when you stop interacting.</p>
<p>The problem isn't that you don't care. It's that caring isn't enough — you need a <strong>system</strong>.</p>

<h2 id="why-willpower-fails">Why Willpower Alone Fails</h2>
<p>You've probably told yourself "I should reach out to [name]" dozens of times. And then... didn't. That's normal. Here's why:</p>
<ul>
<li><strong>Decision fatigue:</strong> By the time you think about texting someone, you've already made 35,000 other decisions that day.</li>
<li><strong>The awkwardness barrier:</strong> The longer you wait, the weirder it feels to reach out. "Hey, sorry it's been 8 months" is a hard text to send.</li>
<li><strong>No trigger:</strong> Without a prompt, "reach out to friends" sits in the same mental category as "organize the garage" — important but never urgent.</li>
</ul>

<h2 id="the-system">The Simple System That Works</h2>
<p>The fix is embarrassingly simple. You need three things:</p>
<ol>
<li><strong>A list</strong> of your 15-25 most important relationships</li>
<li><strong>A tracker</strong> that shows when you last connected with each person</li>
<li><strong>A gentle nudge</strong> when someone is drifting</li>
</ol>
<p>That's it. No elaborate spreadsheet. No 47-field CRM. Just awareness of who you haven't talked to recently, and a nudge to do something about it.</p>

<h3 id="warmth-score">How Warmth Scoring Works</h3>
<p>EverReach uses a concept called a <strong>Warmth Score</strong> — a simple metric that reflects how connected you are to each person based on recency, frequency, and depth of interaction. When someone's warmth drops below a threshold, you get a nudge.</p>
<p>Think of it like a garden. You don't need to water every plant every day. You just need to know which ones are getting dry.</p>

<h2 id="what-to-say">What to Actually Say</h2>
<p>The hardest part isn't the system — it's the message. Here are templates that work:</p>
<ul>
<li><strong>The callback:</strong> "Hey! I was just [doing something] and it reminded me of [shared memory]. How have you been?"</li>
<li><strong>The share:</strong> "Saw this and immediately thought of you: [link/photo/article]"</li>
<li><strong>The direct:</strong> "I realized I haven't checked in with you in a while. What's new?"</li>
<li><strong>The invite:</strong> "Are you free [specific date]? Would love to grab coffee/call."</li>
</ul>
<p>Notice: none of these apologize for the gap. Don't draw attention to the silence — just bridge it.</p>

<h2 id="mistakes">Common Mistakes</h2>
<ul>
<li><strong>Trying to maintain 200+ friendships:</strong> You can't. Focus on your top 15-25.</li>
<li><strong>Only reaching out when you need something:</strong> The best time to nurture a relationship is when you don't need anything.</li>
<li><strong>Treating it like a task list:</strong> The system is for awareness. The actual interaction should feel genuine.</li>
<li><strong>Going all-in then burning out:</strong> Consistency beats intensity. One text per day > 20 texts on a Sunday.</li>
</ul>

<h2 id="takeaway">The Takeaway</h2>
<p>Friendships don't need heroic effort. They need consistent, small moments of attention. A personal CRM like EverReach handles the remembering so you can focus on the connecting.</p>
<p>Start with your 10 closest people. Check when you last reached out. Send one message today. That's it.</p>
`,
    category: CATEGORY_MAP['friendships'],
    tags: ['friendships', 'relationships', 'personal-crm', 'warmth-score'],
    author: AUTHORS.everreach,
    published_at: '2026-04-15T10:00:00Z',
    updated_at: '2026-04-15T10:00:00Z',
    reading_time_minutes: 6,
    featured: true,
    toc: [
      { id: 'the-real-reason', text: 'The Real Reason Friendships Fade', level: 2 },
      { id: 'why-willpower-fails', text: 'Why Willpower Alone Fails', level: 2 },
      { id: 'the-system', text: 'The Simple System That Works', level: 2 },
      { id: 'warmth-score', text: 'How Warmth Scoring Works', level: 3 },
      { id: 'what-to-say', text: 'What to Actually Say', level: 2 },
      { id: 'mistakes', text: 'Common Mistakes', level: 2 },
      { id: 'takeaway', text: 'The Takeaway', level: 2 },
    ],
    faq: [
      { question: 'Why do friendships fade?', answer: 'Friendships fade primarily due to lack of regular contact, not conflict. When life gets busy, neither person initiates, and the relationship gradually weakens over 6-12 months.' },
      { question: 'How often should you reach out to friends?', answer: 'For close friends, aim for contact every 2-3 weeks. For your broader circle, once every 1-2 months is enough to maintain the connection.' },
      { question: 'What is a Warmth Score?', answer: 'A Warmth Score is a metric that reflects how connected you are to someone based on recency, frequency, and depth of interaction. It helps you see which relationships need attention.' },
    ],
  },
  {
    id: 'personal-crm-guide',
    slug: 'what-is-personal-crm',
    title: 'What Is a Personal CRM? The Complete Guide for 2026',
    excerpt: 'A personal CRM helps you manage relationships the way businesses manage customers — but for your actual life. Here\'s everything you need to know.',
    answer_summary: 'A personal CRM (Customer Relationship Management) is a tool adapted for personal use that helps you track, organize, and nurture your relationships. Unlike business CRMs, personal CRMs focus on friendship maintenance, networking follow-ups, and staying connected with the people who matter. Popular options include EverReach, which adds AI-powered warmth scoring and message composition.',
    content_html: `
<h2 id="definition">What Is a Personal CRM?</h2>
<p>A personal CRM is a system — usually an app — that helps you manage your personal and professional relationships with the same intentionality that businesses manage customer relationships.</p>
<p>But instead of tracking deals and revenue, you're tracking:</p>
<ul>
<li>When you last talked to someone</li>
<li>What you talked about</li>
<li>Important dates and details about their life</li>
<li>How strong each relationship feels right now</li>
</ul>
<p>Think of it as a relationship dashboard. It gives you awareness of who needs attention, without requiring you to keep everything in your head.</p>

<h2 id="who-needs-one">Who Needs a Personal CRM?</h2>
<p>You probably need one if:</p>
<ul>
<li>You have more than 50 people you want to stay connected with</li>
<li>You frequently think "I should reach out to [name]" but don't</li>
<li>You're a founder, freelancer, or professional whose network is your career</li>
<li>You've lost touch with friends and want to fix that</li>
<li>You forget details people share with you</li>
</ul>

<h2 id="personal-vs-business">Personal CRM vs Business CRM</h2>
<p>Business CRMs like Salesforce and HubSpot are designed for sales pipelines. Personal CRMs are fundamentally different:</p>
<table>
<tr><th>Feature</th><th>Business CRM</th><th>Personal CRM</th></tr>
<tr><td>Goal</td><td>Close deals</td><td>Nurture relationships</td></tr>
<tr><td>Contacts</td><td>Leads & customers</td><td>Friends, family, colleagues</td></tr>
<tr><td>Metrics</td><td>Revenue, pipeline</td><td>Connection frequency, warmth</td></tr>
<tr><td>Complexity</td><td>High (teams)</td><td>Low (individual)</td></tr>
<tr><td>Feel</td><td>Transactional</td><td>Personal, warm</td></tr>
</table>

<h2 id="key-features">Key Features to Look For</h2>
<ol>
<li><strong>Contact timeline:</strong> See your full interaction history with each person</li>
<li><strong>Reminders:</strong> Get nudged when relationships need attention</li>
<li><strong>Notes:</strong> Record important details (kids' names, job changes, interests)</li>
<li><strong>Warmth tracking:</strong> Visualize relationship health at a glance</li>
<li><strong>AI assistance:</strong> Help composing messages, suggesting conversation starters</li>
<li><strong>Privacy-first:</strong> Your relationship data should stay yours</li>
</ol>

<h2 id="getting-started">Getting Started</h2>
<ol>
<li>Import your contacts (or start with your top 20)</li>
<li>Add notes about each person — what you know, when you last talked</li>
<li>Set your cadence — how often you want to connect with each tier</li>
<li>Respond to nudges — the app tells you who to reach out to</li>
<li>Log interactions — keep the system accurate so it stays useful</li>
</ol>

<h2 id="faq-section">Frequently Asked Questions</h2>
<h3>Is a personal CRM creepy?</h3>
<p>No more than writing in a journal or keeping a calendar. You're just being intentional about relationships instead of leaving them to chance.</p>
<h3>Can't I just use a spreadsheet?</h3>
<p>You can, but you probably won't. The magic of a personal CRM is that it nudges you — a spreadsheet just sits there.</p>
<h3>How is this different from my phone's contacts app?</h3>
<p>Your contacts app stores phone numbers. A personal CRM stores relationships — context, history, reminders, and insights about how connected you are.</p>
`,
    category: CATEGORY_MAP['personal-crm'],
    tags: ['personal-crm', 'guide', 'relationships', 'productivity'],
    author: AUTHORS.everreach,
    published_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-16T10:00:00Z',
    reading_time_minutes: 7,
    featured: true,
    toc: [
      { id: 'definition', text: 'What Is a Personal CRM?', level: 2 },
      { id: 'who-needs-one', text: 'Who Needs a Personal CRM?', level: 2 },
      { id: 'personal-vs-business', text: 'Personal CRM vs Business CRM', level: 2 },
      { id: 'key-features', text: 'Key Features to Look For', level: 2 },
      { id: 'getting-started', text: 'Getting Started', level: 2 },
      { id: 'faq-section', text: 'Frequently Asked Questions', level: 2 },
    ],
    faq: [
      { question: 'What is a personal CRM?', answer: 'A personal CRM is a tool that helps you manage your personal and professional relationships intentionally, tracking interactions, important details, and connection frequency.' },
      { question: 'Is a personal CRM creepy?', answer: 'No. It\'s no different from keeping a journal or calendar. You\'re just being intentional about relationships instead of leaving them to chance.' },
      { question: 'What\'s the difference between a personal CRM and a business CRM?', answer: 'Business CRMs focus on sales pipelines and revenue. Personal CRMs focus on relationship warmth, friendship maintenance, and staying connected with people you care about.' },
    ],
  },
  {
    id: 'follow-up-templates',
    slug: 'follow-up-message-templates',
    title: '12 Follow-Up Message Templates That Don\'t Feel Awkward',
    excerpt: 'Copy-paste templates for following up with friends, colleagues, and new connections — without the cringe factor.',
    answer_summary: 'The best follow-up messages feel natural, not transactional. Lead with something specific (a shared memory, something you saw, or a genuine question), keep it short (2-3 sentences), and never apologize for the gap in communication. Templates that work: the callback ("This reminded me of you"), the share (forwarding relevant content), and the direct check-in.',
    content_html: `
<h2 id="golden-rules">The Golden Rules of Following Up</h2>
<p>Before the templates, internalize these rules:</p>
<ol>
<li><strong>Never apologize for reaching out.</strong> "Sorry I've been MIA" makes it weird. Just reach out.</li>
<li><strong>Be specific.</strong> "How are you?" is easy to ignore. "How did that presentation go?" demands a response.</li>
<li><strong>Keep it short.</strong> 2-3 sentences max. Long messages feel like homework.</li>
<li><strong>Make it easy to reply.</strong> Ask one question, not five.</li>
</ol>

<h2 id="friend-templates">For Friends You've Lost Touch With</h2>

<h3>1. The Callback</h3>
<blockquote>"I was [doing X] today and it reminded me of when we [shared memory]. Hope you're doing well — what's new with you?"</blockquote>

<h3>2. The Content Share</h3>
<blockquote>"Saw this and immediately thought of you: [link]. How have things been going?"</blockquote>

<h3>3. The Direct</h3>
<blockquote>"Hey! I was thinking about you today. What's the latest?"</blockquote>

<h3>4. The Invite</h3>
<blockquote>"Are you free [date]? Would love to catch up over coffee/a call."</blockquote>

<h2 id="professional-templates">For Professional Connections</h2>

<h3>5. Post-Meeting</h3>
<blockquote>"Great meeting you at [event]. Loved your point about [specific thing]. Would love to continue that conversation — are you open to a quick coffee chat?"</blockquote>

<h3>6. The Value-Add</h3>
<blockquote>"Hi [name], I came across [article/resource] and thought it might be useful for [their project/interest]. Hope things are going well!"</blockquote>

<h3>7. The Warm Re-Connect</h3>
<blockquote>"Hi [name]! I was just thinking about our conversation about [topic]. How did that end up going?"</blockquote>

<h3>8. The Congratulations</h3>
<blockquote>"Just saw your [achievement/news]! Congrats — that's awesome. How are you feeling about it?"</blockquote>

<h2 id="new-connection-templates">For New Connections</h2>

<h3>9. Post-Introduction</h3>
<blockquote>"Hi [name], [mutual friend] mentioned we should connect — they said you're doing interesting work in [area]. Would love to hear more. Free for a quick call this week?"</blockquote>

<h3>10. The Helpful Follow-Up</h3>
<blockquote>"Hey [name], I was thinking about what you mentioned about [challenge]. I have an idea that might help — want me to send it over?"</blockquote>

<h3>11. The Check-In (After Helping)</h3>
<blockquote>"Hey! Just wanted to check in — did that [resource/intro/suggestion] end up being useful?"</blockquote>

<h3>12. The Simple Ping</h3>
<blockquote>"Hey [name] — hope you're having a good week! Just wanted to say hi."</blockquote>

<h2 id="when-to-send">When to Send Follow-Ups</h2>
<ul>
<li><strong>After meeting someone new:</strong> Within 24-48 hours</li>
<li><strong>For close friends:</strong> Every 2-3 weeks</li>
<li><strong>For professional contacts:</strong> Every 4-8 weeks</li>
<li><strong>After a life event:</strong> Within a week of learning about it</li>
<li><strong>Best days:</strong> Tuesday-Thursday tend to get the highest response rates</li>
<li><strong>Best times:</strong> 9-10am or 7-8pm local time</li>
</ul>

<h2 id="takeaway">Stop Overthinking, Start Reaching Out</h2>
<p>The perfect follow-up message doesn't exist. What exists is your genuine desire to stay connected with someone — and that's always enough. Pick a template, customize it in 10 seconds, and hit send.</p>
<p>EverReach can help by telling you exactly who needs a follow-up and even drafting personalized messages based on your relationship history.</p>
`,
    category: CATEGORY_MAP['follow-up'],
    tags: ['follow-up', 'templates', 'messaging', 'networking'],
    author: AUTHORS.everreach,
    published_at: '2026-04-12T10:00:00Z',
    updated_at: '2026-04-12T10:00:00Z',
    reading_time_minutes: 5,
    featured: true,
    toc: [
      { id: 'golden-rules', text: 'The Golden Rules of Following Up', level: 2 },
      { id: 'friend-templates', text: 'For Friends You\'ve Lost Touch With', level: 2 },
      { id: 'professional-templates', text: 'For Professional Connections', level: 2 },
      { id: 'new-connection-templates', text: 'For New Connections', level: 2 },
      { id: 'when-to-send', text: 'When to Send Follow-Ups', level: 2 },
      { id: 'takeaway', text: 'Stop Overthinking, Start Reaching Out', level: 2 },
    ],
    faq: [
      { question: 'How do you follow up without being awkward?', answer: 'Don\'t apologize for the gap, be specific about why you\'re reaching out, keep it to 2-3 sentences, and ask one easy-to-answer question.' },
      { question: 'How often should you follow up with someone?', answer: 'Close friends every 2-3 weeks, professional contacts every 4-8 weeks, and new connections within 24-48 hours of meeting them.' },
    ],
  },
  {
    id: 'networking-for-introverts',
    slug: 'networking-for-introverts',
    title: 'Networking for Introverts: A System That Doesn\'t Drain You',
    excerpt: 'You don\'t need to work the room. You need a system that turns genuine 1-on-1 conversations into lasting professional relationships.',
    answer_summary: 'Introverts can build strong networks by focusing on depth over breadth: prioritize 1-on-1 conversations over events, follow up consistently with a personal CRM, and leverage asynchronous communication (email, DMs) instead of forcing real-time socializing. The key is a system that removes the decision fatigue of "who should I talk to next?"',
    content_html: `
<h2 id="the-myth">The Networking Myth Introverts Need to Forget</h2>
<p>Networking doesn't mean working a room, collecting business cards, or making small talk with strangers. That's performance, not connection.</p>
<p>Real networking — the kind that builds careers and creates opportunities — happens in quiet 1-on-1 conversations, thoughtful follow-ups, and genuine interest in other people's work.</p>
<p>That's introvert territory.</p>

<h2 id="introvert-advantages">Why Introverts Are Actually Better Networkers</h2>
<ul>
<li><strong>Deeper conversations:</strong> You naturally go beyond surface-level small talk</li>
<li><strong>Better listeners:</strong> People remember how you made them feel, not your elevator pitch</li>
<li><strong>More thoughtful follow-ups:</strong> You reference specific things from conversations</li>
<li><strong>Authentic connections:</strong> You build fewer but stronger relationships</li>
</ul>

<h2 id="the-system">The Introvert Networking System</h2>
<h3>Step 1: Define Your Circle Size</h3>
<p>You don't need 500 connections. You need 30-50 meaningful ones. Identify the people who matter most to your personal and professional life.</p>

<h3>Step 2: Choose Your Channels</h3>
<p>Skip the networking events. Instead:</p>
<ul>
<li>DMs and email (asynchronous = no pressure)</li>
<li>1-on-1 coffee chats (in-person or virtual)</li>
<li>Commenting thoughtfully on their content</li>
<li>Sharing relevant resources privately</li>
</ul>

<h3>Step 3: Set a Cadence</h3>
<p>Reach out to 2-3 people per week. That's it. At that pace, you'll touch base with your entire network every 10-15 weeks.</p>

<h3>Step 4: Use a Personal CRM</h3>
<p>Let the tool track who you've contacted and when. Your job is just to show up and be genuine when prompted.</p>

<h2 id="energy-management">Managing Your Energy</h2>
<ul>
<li><strong>Batch your outreach:</strong> Do all your messages in one 15-minute block</li>
<li><strong>Alternate channels:</strong> Text one person, email another, comment on a third's post</li>
<li><strong>Schedule recovery time:</strong> After a call, block 30 minutes to recharge</li>
<li><strong>Say no to events:</strong> If a networking event drains you, skip it. Your system handles the rest.</li>
</ul>

<h2 id="takeaway">The Takeaway</h2>
<p>Networking isn't about being the loudest person in the room. It's about being the most consistent person in someone's inbox. Build a system, show up genuinely, and let the compounding do its work.</p>
`,
    category: CATEGORY_MAP['networking'],
    tags: ['networking', 'introverts', 'relationships', 'career'],
    author: AUTHORS.everreach,
    published_at: '2026-04-08T10:00:00Z',
    updated_at: '2026-04-08T10:00:00Z',
    reading_time_minutes: 5,
    featured: false,
    toc: [
      { id: 'the-myth', text: 'The Networking Myth', level: 2 },
      { id: 'introvert-advantages', text: 'Why Introverts Are Better Networkers', level: 2 },
      { id: 'the-system', text: 'The Introvert Networking System', level: 2 },
      { id: 'energy-management', text: 'Managing Your Energy', level: 2 },
      { id: 'takeaway', text: 'The Takeaway', level: 2 },
    ],
    faq: [
      { question: 'Can introverts be good at networking?', answer: 'Yes. Introverts excel at deep 1-on-1 conversations, thoughtful follow-ups, and building authentic connections — all of which matter more than working a room.' },
      { question: 'How can introverts network without events?', answer: 'Use asynchronous channels like email and DMs, schedule 1-on-1 coffee chats, comment on people\'s content, and use a personal CRM to maintain consistency.' },
    ],
  },
  {
    id: 'warmth-score-explained',
    slug: 'warmth-score-explained',
    title: 'What Is a Warmth Score? How EverReach Measures Relationship Health',
    excerpt: 'Your Warmth Score tells you at a glance which relationships are thriving and which need attention. Here\'s how it works.',
    answer_summary: 'A Warmth Score is EverReach\'s metric for relationship health. It combines recency of contact, frequency of interactions, and depth of engagement into a single score (0-100). High warmth means you\'re actively connected; low warmth means the relationship is cooling and needs attention. It helps you prioritize who to reach out to without guessing.',
    content_html: `
<h2 id="what-is-it">What Is a Warmth Score?</h2>
<p>A Warmth Score is a number from 0 to 100 that represents how connected you are to someone right now. It's not a judgment — it's awareness.</p>
<ul>
<li><strong>80-100:</strong> You're actively connected. Recent, frequent interactions.</li>
<li><strong>50-79:</strong> Healthy but could use attention soon.</li>
<li><strong>20-49:</strong> Cooling off. Time to reach out.</li>
<li><strong>0-19:</strong> Dormant. This relationship needs a spark.</li>
</ul>

<h2 id="how-calculated">How It's Calculated</h2>
<p>Three factors feed into your Warmth Score:</p>
<ol>
<li><strong>Recency:</strong> When did you last interact? Yesterday scores higher than 3 months ago.</li>
<li><strong>Frequency:</strong> How often do you connect? Regular contact keeps warmth high.</li>
<li><strong>Depth:</strong> Was it a quick "like" or a 30-minute phone call? Deeper interactions count more.</li>
</ol>
<p>EverReach calculates this automatically based on logged interactions, messages, calls, and notes.</p>

<h2 id="why-it-matters">Why It Matters</h2>
<p>Without a warmth score, you're guessing. You might text someone you spoke with last week while ignoring a close friend you haven't contacted in two months — simply because the recent person is top of mind.</p>
<p>Warmth scoring removes the guesswork. Open EverReach, sort by warmth, and immediately see who needs your attention.</p>

<h2 id="how-to-use">How to Use Your Warmth Score</h2>
<ol>
<li><strong>Daily:</strong> Glance at your lowest-warmth close contacts. Send one message.</li>
<li><strong>Weekly:</strong> Review your top 20 relationships. Anyone below 50? Reach out.</li>
<li><strong>Monthly:</strong> Look at your broader network. Anyone drifting that you want to keep close?</li>
</ol>

<h2 id="not-a-competition">It's Not a Competition</h2>
<p>Warmth Scores aren't about maximizing numbers. Some relationships naturally have lower contact frequency — and that's fine. A friend you see twice a year but have deep, meaningful conversations with is just as valid as someone you text daily.</p>
<p>Use warmth as a compass, not a scoreboard.</p>
`,
    category: CATEGORY_MAP['personal-crm'],
    tags: ['warmth-score', 'personal-crm', 'relationships', 'features'],
    author: AUTHORS.everreach,
    published_at: '2026-04-05T10:00:00Z',
    updated_at: '2026-04-17T10:00:00Z',
    reading_time_minutes: 4,
    featured: false,
    toc: [
      { id: 'what-is-it', text: 'What Is a Warmth Score?', level: 2 },
      { id: 'how-calculated', text: 'How It\'s Calculated', level: 2 },
      { id: 'why-it-matters', text: 'Why It Matters', level: 2 },
      { id: 'how-to-use', text: 'How to Use Your Warmth Score', level: 2 },
      { id: 'not-a-competition', text: 'It\'s Not a Competition', level: 2 },
    ],
    faq: [
      { question: 'What is a Warmth Score?', answer: 'A Warmth Score is a 0-100 metric that measures how connected you are to someone based on recency, frequency, and depth of your interactions.' },
      { question: 'How is a Warmth Score calculated?', answer: 'It combines three factors: recency of last contact, frequency of interactions over time, and depth of engagement (calls and long conversations score higher than quick likes).' },
    ],
  },
];

export const POST_MAP: Record<string, BlogPost> = Object.fromEntries(
  POSTS.map((p) => [p.slug, p])
);

// Helper: get posts by category
export function getPostsByCategory(categorySlug: string): BlogPost[] {
  return POSTS.filter((p) => p.category.slug === categorySlug);
}

// Helper: get featured posts
export function getFeaturedPosts(): BlogPost[] {
  return POSTS.filter((p) => p.featured);
}

// Helper: search posts
export function searchPosts(query: string): BlogPost[] {
  const q = query.toLowerCase();
  return POSTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)) ||
      p.category.name.toLowerCase().includes(q)
  );
}

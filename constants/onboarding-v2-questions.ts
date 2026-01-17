/**
 * Onboarding V2 Questions
 * See: /ONBOARDING_V2_SPEC.md
 */

export interface OnboardingQuestion {
  id: string;
  key: string;
  question: string;
  type: 'text' | 'single_choice';
  placeholder?: string;
  header?: string;
  explainer?: string;
  options?: Array<{ value: string; label: string }>;
  required: boolean;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  // Phase 1 – Easy Warmup
  {
    id: 'Q1',
    key: 'profile_first_name',
    question: 'First, what should we call you?',
    type: 'text',
    placeholder: 'Your first name',
    required: true,
  },
  {
    id: 'Q2',
    key: 'feeling_lose_touch',
    question: 'Do you ever feel like you lose touch with people you care about?',
    type: 'single_choice',
    options: [
      { value: 'often', label: 'Yes, a lot' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Not really' },
    ],
    required: true,
  },
  {
    id: 'Q3',
    key: 'persona_type',
    question: 'Which sounds most like you?',
    type: 'single_choice',
    options: [
      { value: 'founder', label: 'I run a business / side hustle' },
      { value: 'worker_student', label: 'I am mainly focused on my job or studies' },
      { value: 'other', label: 'Something else' },
    ],
    required: true,
  },
  {
    id: 'Q4',
    key: 'desired_contacts_size',
    question: 'How many people do you really want to keep up with?',
    type: 'single_choice',
    options: [
      { value: 'lt25', label: 'Fewer than 25' },
      { value: '25_75', label: '25–75' },
      { value: 'gt75', label: 'More than 75' },
    ],
    required: true,
  },
  {
    id: 'Q5',
    key: 'last_reachout_window',
    question: "When was the last time you messaged someone you've been meaning to reach out to?",
    type: 'single_choice',
    options: [
      { value: 'lt1m', label: 'In the last month' },
      { value: 'few_months', label: 'In the last few months' },
      { value: 'cant_remember', label: 'I honestly cannot remember' },
    ],
    required: true,
  },
  
  // Phase 2 – What You Need Help With
  {
    id: 'Q6',
    key: 'friction_primary',
    question: 'What usually gets in the way?',
    type: 'single_choice',
    options: [
      { value: 'forget', label: 'I forget' },
      { value: 'dont_know_what_to_say', label: 'I do not know what to say' },
      { value: 'both_other', label: 'Both / something else' },
    ],
    required: true,
  },
  {
    id: 'Q7',
    key: 'focus_segment',
    question: 'Right now, who do you care most about keeping up with?',
    type: 'single_choice',
    options: [
      { value: 'work', label: 'Work / business / career people' },
      { value: 'personal', label: 'Friends and family' },
      { value: 'both', label: 'Both' },
    ],
    required: true,
  },
  {
    id: 'Q8',
    key: 'goal_30_days',
    question: 'In the next 30 days, what do you want most?',
    type: 'single_choice',
    options: [
      { value: 'opportunities', label: 'Win more work or opportunities' },
      { value: 'reconnect', label: "Reconnect with people I've drifted from" },
      { value: 'consistency', label: 'Be more consistent with check-ins' },
    ],
    required: true,
  },
  {
    id: 'Q9',
    key: 'existing_system',
    question: 'Do you already have any way of keeping track of people?',
    type: 'single_choice',
    options: [
      { value: 'yes_system', label: 'Yes, I have a system' },
      { value: 'messy', label: 'Kind of, it is messy' },
      { value: 'none', label: 'No, I just try to remember' },
    ],
    required: true,
  },
  {
    id: 'Q10',
    key: 'daily_help_pref',
    question: 'If EverReach helped you once a day, what would be most useful?',
    type: 'single_choice',
    options: [
      { value: 'who', label: 'Tell me who to reach out to' },
      { value: 'what', label: 'Give me ideas for what to say' },
      { value: 'both', label: 'Both' },
    ],
    required: true,
  },
  
  // Phase 3 – How EverReach Should Feel
  {
    id: 'Q11',
    key: 'message_style',
    question: 'What kind of messages feel most natural for you?',
    type: 'single_choice',
    explainer: 'EverReach can suggest message ideas. We want them to sound like you.',
    options: [
      { value: 'super_short', label: "Super short check-ins (like 'hey, how've you been?')" },
      { value: 'short_friendly', label: 'Short and friendly, 1–2 sentences' },
      { value: 'detailed', label: 'A bit more detailed and thoughtful' },
      { value: 'mixed', label: 'It depends on the person, I mix it up' },
    ],
    required: true,
  },
  {
    id: 'Q12',
    key: 'channel_primary',
    question: 'How do you usually reach out?',
    type: 'single_choice',
    options: [
      { value: 'text_calls', label: 'Mostly text / calls' },
      { value: 'email_linkedin', label: 'Mostly email / LinkedIn' },
      { value: 'mixed', label: 'A mix of everything' },
    ],
    required: true,
  },
  {
    id: 'Q13',
    key: 'assistance_level',
    question: 'When you reach out, how much help do you want from EverReach?',
    type: 'single_choice',
    options: [
      { value: 'ai_help', label: 'Help me write messages' },
      { value: 'reminders_only', label: 'Just remind me, I will write them' },
      { value: 'mix', label: 'A mix of both' },
    ],
    required: true,
  },
  
  // Phase 4 – Privacy & Safety
  {
    id: 'Q14',
    key: 'contacts_comfort',
    question: 'How do you feel about EverReach using your contacts to remind you?',
    type: 'single_choice',
    header: 'Your contacts stay yours. We never post for you. You can export or delete your data any time.',
    options: [
      { value: 'ok', label: 'I am okay with it if it helps' },
      { value: 'ok_control', label: 'Okay, but I want tight control' },
      { value: 'not_comfortable', label: 'I am not comfortable with that yet' },
    ],
    required: true,
  },
  {
    id: 'Q15',
    key: 'analytics_consent',
    question: 'Can we use anonymous, combined data to make the app better over time?',
    type: 'single_choice',
    options: [
      { value: 'yes', label: "Yes, that's fine" },
      { value: 'no', label: 'No, keep my usage private' },
    ],
    required: true,
  },
  {
    id: 'Q16',
    key: 'import_start_method',
    question: "What's the easiest way to bring your people into EverReach?",
    type: 'single_choice',
    options: [
      { value: 'import_contacts', label: 'Import my contacts (recommended)' },
      { value: 'manual_few', label: 'I will add a few people by hand for now' },
    ],
    required: true,
  },
  
  // Phase 5 – First Win / Aha Moment
  {
    id: 'Q17',
    key: 'first_person_flag',
    question: 'Is there one person you have been meaning to reach out to?',
    type: 'single_choice',
    options: [
      { value: 'yes', label: 'Yes, I have someone in mind' },
      { value: 'not_now', label: 'Not right now' },
      { value: 'skip', label: "I'd rather skip" },
    ],
    required: false,
  },
  {
    id: 'Q18',
    key: 'first_person_name',
    question: 'Who is that person?',
    type: 'text',
    placeholder: 'e.g. Mom, My old boss Alex',
    required: false,
  },
  
  // Phase 6 – Expectation Setting & Emotional Anchoring
  {
    id: 'Q19',
    key: 'first_week_win',
    question: "In your first week, what would feel like a 'win' with EverReach?",
    type: 'single_choice',
    options: [
      { value: 'reconnect', label: "Reaching out to a few people I've drifted from" },
      { value: 'on_top', label: 'Feeling more on top of my relationships overall' },
      { value: 'lead', label: 'Getting at least one new lead or opportunity' },
    ],
    required: true,
  },
  {
    id: 'Q20',
    key: 'worst_to_forget',
    question: 'Which of these would you feel worst about forgetting?',
    type: 'single_choice',
    options: [
      { value: 'personal', label: "A friend's or family member's important moment (birthday, big news, etc.)" },
      { value: 'work', label: 'A follow-up with someone important for your work or career' },
      { value: 'both', label: 'Honestly, both would bother me a lot' },
    ],
    required: true,
  },
  {
    id: 'Q21',
    key: 'celebrate_wins',
    question: 'Do you want EverReach to celebrate your small wins?',
    type: 'single_choice',
    options: [
      { value: 'yes', label: "Yes, show me little recaps of people I've reached out to" },
      { value: 'low_key', label: "Keep it low-key, I'll notice the progress myself" },
      { value: 'unsure', label: "I'm not sure yet" },
    ],
    required: true,
  },
  {
    id: 'Q22',
    key: 'why_matters',
    question: 'Last one: Why does staying in touch matter to you right now?',
    type: 'single_choice',
    options: [
      { value: 'relationships', label: 'I want stronger relationships in my life' },
      { value: 'work', label: 'It is important for my work or future' },
      { value: 'both', label: 'Both—this matters to me in and out of work' },
    ],
    required: true,
  },
];

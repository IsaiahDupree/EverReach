export type MessageChannel = 'email' | 'sms' | 'dm';

export interface EmailTemplate {
  subjectLine: string;
  body: string;
  closing: string;
}

export interface SMSTemplate {
  body: string;
}

export interface DMTemplate {
  body: string;
}

export interface MessageTemplates {
  email: EmailTemplate;
  sms: SMSTemplate;
  dm: DMTemplate;
  enabled: boolean;
  voiceContext?: string;
}

export const DEFAULT_TEMPLATES: MessageTemplates = {
  email: {
    subjectLine: 'Re: {{topic}}',
    body: 'Hi {{name}},\n\n{{message}}',
    closing: 'Best,\n{{sender_name}}',
  },
  sms: {
    body: 'Hey {{name}}, {{message}}',
  },
  dm: {
    body: 'Hey {{name}}! {{message}}',
  },
  enabled: false,
};

export const TEMPLATE_VARIABLES = [
  { key: '{{name}}', description: 'Contact name' },
  { key: '{{sender_name}}', description: 'Your name' },
  { key: '{{topic}}', description: 'Message topic' },
  { key: '{{message}}', description: 'Generated message content' },
];

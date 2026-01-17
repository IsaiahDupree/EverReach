import { MessageTemplates, MessageChannel } from '@/types/templates';

export interface TemplateVariables {
  name?: string;
  senderName?: string;
  topic?: string;
}

export function applyMessageTemplate(
  generatedMessage: string,
  channel: MessageChannel,
  templates: MessageTemplates,
  variables: TemplateVariables
): string {
  if (!templates.enabled) {
    return generatedMessage;
  }

  let result = '';

  if (channel === 'email') {
    const emailTemplate = templates.email;
    const subject = replaceVariables(emailTemplate.subjectLine, { ...variables, message: generatedMessage });
    const body = replaceVariables(emailTemplate.body, { ...variables, message: generatedMessage });
    const closing = replaceVariables(emailTemplate.closing, { ...variables, message: generatedMessage });
    
    result = `Subject: ${subject}\n\n${body}${closing}`;
  } else if (channel === 'sms') {
    const smsTemplate = templates.sms;
    result = replaceVariables(smsTemplate.body, { ...variables, message: generatedMessage });
  } else if (channel === 'dm') {
    const dmTemplate = templates.dm;
    result = replaceVariables(dmTemplate.body, { ...variables, message: generatedMessage });
  }

  return result;
}

function replaceVariables(
  template: string,
  variables: {
    name?: string;
    senderName?: string;
    topic?: string;
    message?: string;
  }
): string {
  let result = template;
  
  if (variables.name) {
    result = result.replace(/\{\{name\}\}/g, variables.name);
  }
  if (variables.senderName) {
    result = result.replace(/\{\{sender_name\}\}/g, variables.senderName);
  }
  if (variables.topic) {
    result = result.replace(/\{\{topic\}\}/g, variables.topic);
  }
  if (variables.message) {
    result = result.replace(/\{\{message\}\}/g, variables.message);
  }

  return result;
}

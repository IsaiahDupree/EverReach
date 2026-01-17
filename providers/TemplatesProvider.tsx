import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { KV } from '@/storage/AsyncStorageService';
import { MessageTemplates, DEFAULT_TEMPLATES, MessageChannel } from '../types/templates';
import { apiFetch } from '@/lib/api';

const TEMPLATES_STORAGE_KEY = '@message_templates';

export const [TemplatesContext, useTemplates] = createContextHook(() => {
  const [templates, setTemplates] = useState<MessageTemplates>(DEFAULT_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);
  const [templateIds, setTemplateIds] = useState<Record<MessageChannel, string | null>>({
    email: null,
    sms: null,
    dm: null,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // Load from local storage first (for offline support)
      const stored = await KV.get<MessageTemplates>(TEMPLATES_STORAGE_KEY);
      if (stored) {
        setTemplates(stored);
      }

      // Then sync from backend
      try {
        // Load compose settings (voice & tone, enabled)
        const settingsResponse = await apiFetch('/api/v1/me/compose-settings', {
          method: 'GET',
          requireAuth: true,
        });
        if (settingsResponse.ok) {
          const { settings } = await settingsResponse.json();
          if (settings) {
            setTemplates(prev => ({
              ...prev,
              enabled: settings.enabled ?? prev.enabled,
              voiceContext: settings.tone ?? prev.voiceContext,
            }));
          }
        }

        // Load templates for each channel
        const channels: MessageChannel[] = ['email', 'sms', 'dm'];
        const ids: Record<MessageChannel, string | null> = { email: null, sms: null, dm: null };
        
        for (const channel of channels) {
          const templatesResponse = await apiFetch(`/api/v1/templates?channel=${channel}&limit=1`, {
            method: 'GET',
            requireAuth: true,
          });
          if (templatesResponse.ok) {
            const { items } = await templatesResponse.json();
            if (items && items.length > 0) {
              const template = items[0];
              ids[channel] = template.id;
              if (channel === 'email') {
                setTemplates(prev => ({
                  ...prev,
                  email: {
                    subjectLine: template.subject_tmpl || prev.email.subjectLine,
                    body: template.body_tmpl || prev.email.body,
                    closing: template.closing_tmpl || prev.email.closing,
                  },
                }));
              } else if (channel === 'sms') {
                setTemplates(prev => ({
                  ...prev,
                  sms: {
                    body: template.body_tmpl || prev.sms.body,
                  },
                }));
              } else if (channel === 'dm') {
                setTemplates(prev => ({
                  ...prev,
                  dm: {
                    body: template.body_tmpl || prev.dm.body,
                  },
                }));
              }
            }
          }
        }
        setTemplateIds(ids);
      } catch (backendError) {
        console.warn('[TemplatesProvider] Failed to load from backend, using local storage:', backendError);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplates = useCallback(async (newTemplates: MessageTemplates) => {
    try {
      // Save to local storage first
      await KV.set(TEMPLATES_STORAGE_KEY, newTemplates);
      setTemplates(newTemplates);

      // Sync to backend
      try {
        // Update compose settings (voice & tone, enabled)
        await apiFetch('/api/v1/me/compose-settings', {
          method: 'PATCH',
          requireAuth: true,
          body: JSON.stringify({
            enabled: newTemplates.enabled,
            tone: newTemplates.voiceContext,
          }),
        });

        // Update templates for each channel
        const channels: MessageChannel[] = ['email', 'sms', 'dm'];
        for (const channel of channels) {
          const templateId = templateIds[channel];

          if (channel === 'email') {
            const templateData = newTemplates.email;
            if (templateId) {
              // Update existing template
              await apiFetch(`/api/v1/templates/${templateId}`, {
                method: 'PATCH',
                requireAuth: true,
                body: JSON.stringify({
                  subject_tmpl: templateData.subjectLine,
                  body_tmpl: templateData.body,
                  closing_tmpl: templateData.closing,
                }),
              });
            } else {
              // Create new template
              const createResponse = await apiFetch('/api/v1/templates', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({
                  channel,
                  name: `Default ${channel.toUpperCase()} Template`,
                  subject_tmpl: templateData.subjectLine,
                  body_tmpl: templateData.body,
                  closing_tmpl: templateData.closing,
                  visibility: 'private',
                }),
              });
              if (createResponse.ok) {
                const { template } = await createResponse.json();
                setTemplateIds(prev => ({ ...prev, [channel]: template.id }));
              }
            }
          } else if (channel === 'sms') {
            const templateData = newTemplates.sms;
            if (templateId) {
              await apiFetch(`/api/v1/templates/${templateId}`, {
                method: 'PATCH',
                requireAuth: true,
                body: JSON.stringify({
                  body_tmpl: templateData.body,
                }),
              });
            } else {
              const createResponse = await apiFetch('/api/v1/templates', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({
                  channel,
                  name: `Default ${channel.toUpperCase()} Template`,
                  body_tmpl: templateData.body,
                  visibility: 'private',
                }),
              });
              if (createResponse.ok) {
                const { template } = await createResponse.json();
                setTemplateIds(prev => ({ ...prev, [channel]: template.id }));
              }
            }
          } else if (channel === 'dm') {
            const templateData = newTemplates.dm;
            if (templateId) {
              await apiFetch(`/api/v1/templates/${templateId}`, {
                method: 'PATCH',
                requireAuth: true,
                body: JSON.stringify({
                  body_tmpl: templateData.body,
                }),
              });
            } else {
              const createResponse = await apiFetch('/api/v1/templates', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({
                  channel,
                  name: `Default ${channel.toUpperCase()} Template`,
                  body_tmpl: templateData.body,
                  visibility: 'private',
                }),
              });
              if (createResponse.ok) {
                const { template } = await createResponse.json();
                setTemplateIds(prev => ({ ...prev, [channel]: template.id }));
              }
            }
          }
        }
      } catch (backendError) {
        console.warn('[TemplatesProvider] Failed to sync to backend:', backendError);
        // Don't throw - local save succeeded
      }
    } catch (error) {
      console.error('Failed to save templates:', error);
      throw error;
    }
  }, [templateIds]);

  const updateTemplate = useCallback(async (channel: MessageChannel, updates: Partial<MessageTemplates[MessageChannel]>) => {
    const newTemplates = {
      ...templates,
      [channel]: {
        ...templates[channel],
        ...updates,
      },
    };
    await saveTemplates(newTemplates);
  }, [templates, saveTemplates]);

  const toggleEnabled = useCallback(async () => {
    const newTemplates = {
      ...templates,
      enabled: !templates.enabled,
    };
    await saveTemplates(newTemplates);
  }, [templates, saveTemplates]);

  const updateVoiceContext = useCallback(async (voiceContext: string) => {
    const newTemplates = {
      ...templates,
      voiceContext,
    };
    await saveTemplates(newTemplates);
    
    // Also update compose settings immediately
    try {
      await apiFetch('/api/v1/me/compose-settings', {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ tone: voiceContext }),
      });
      console.log('[TemplatesProvider] ✅ Voice context saved to backend');
    } catch (error) {
      console.warn('[TemplatesProvider] ⚠️ Failed to save voice context to backend:', error);
    }
  }, [templates, saveTemplates]);

  const resetToDefaults = useCallback(async () => {
    await saveTemplates(DEFAULT_TEMPLATES);
  }, [saveTemplates]);

  const applyTemplate = useCallback((
    channel: MessageChannel,
    generatedMessage: string,
    variables: {
      name?: string;
      senderName?: string;
      topic?: string;
    }
  ): string => {
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
  }, [templates]);

  const replaceVariables = (
    template: string,
    variables: {
      name?: string;
      senderName?: string;
      topic?: string;
      message?: string;
    }
  ): string => {
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
  };

  return useMemo(() => ({
    templates,
    isLoading,
    updateTemplate,
    updateVoiceContext,
    toggleEnabled,
    resetToDefaults,
    applyTemplate,
  }), [templates, isLoading, updateTemplate, updateVoiceContext, toggleEnabled, resetToDefaults, applyTemplate]);
});

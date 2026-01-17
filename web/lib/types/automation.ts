// Automation Rules Types

export type TriggerType = 
  | 'warmth_threshold'
  | 'stage_change'
  | 'tag_added'
  | 'interaction_created'
  | 'no_touch_days'
  | 'goal_completed'

export type ActionType = 
  | 'send_notification'
  | 'add_tag'
  | 'remove_tag'
  | 'set_watch'
  | 'add_to_pipeline'
  | 'create_task'
  | 'webhook'
  | 'send_email'

export interface AutomationRule {
  id: string
  user_id: string
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config: Record<string, any>
  actions: AutomationAction[]
  is_active: boolean
  trigger_count: number
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export interface AutomationAction {
  type: ActionType
  config: Record<string, any>
}

export const TRIGGER_TYPES: Record<TriggerType, {
  label: string
  description: string
  icon: string
  configFields: Array<{
    key: string
    label: string
    type: 'number' | 'text' | 'select'
    options?: Array<{ value: string; label: string }>
  }>
}> = {
  warmth_threshold: {
    label: 'Warmth Score Drops Below',
    description: 'Trigger when a contact\'s warmth score drops below a threshold',
    icon: '🔥',
    configFields: [
      {
        key: 'warmth_threshold',
        label: 'Threshold Score',
        type: 'number',
      },
      {
        key: 'lookback_days',
        label: 'Check Last N Days',
        type: 'number',
      },
    ],
  },
  stage_change: {
    label: 'Pipeline Stage Changed',
    description: 'Trigger when a contact moves to a specific pipeline stage',
    icon: '📊',
    configFields: [
      {
        key: 'pipeline_id',
        label: 'Pipeline',
        type: 'text',
      },
      {
        key: 'stage_id',
        label: 'Stage',
        type: 'text',
      },
    ],
  },
  tag_added: {
    label: 'Tag Added',
    description: 'Trigger when a specific tag is added to a contact',
    icon: '🏷️',
    configFields: [
      {
        key: 'tag',
        label: 'Tag Name',
        type: 'text',
      },
    ],
  },
  interaction_created: {
    label: 'Interaction Created',
    description: 'Trigger when a new interaction is logged',
    icon: '💬',
    configFields: [
      {
        key: 'interaction_type',
        label: 'Interaction Type',
        type: 'select',
        options: [
          { value: 'any', label: 'Any Type' },
          { value: 'email', label: 'Email' },
          { value: 'call', label: 'Call' },
          { value: 'meeting', label: 'Meeting' },
        ],
      },
    ],
  },
  no_touch_days: {
    label: 'No Contact For Days',
    description: 'Trigger when a contact hasn\'t been touched for N days',
    icon: '⏰',
    configFields: [
      {
        key: 'no_touch_days',
        label: 'Number of Days',
        type: 'number',
      },
      {
        key: 'tags_include',
        label: 'Tags to Include (optional)',
        type: 'text',
      },
    ],
  },
  goal_completed: {
    label: 'Goal Completed',
    description: 'Trigger when a goal is completed',
    icon: '🎯',
    configFields: [],
  },
}

export const ACTION_TYPES: Record<ActionType, {
  label: string
  description: string
  icon: string
  configFields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'checkbox'
    options?: Array<{ value: string; label: string }>
  }>
}> = {
  send_notification: {
    label: 'Send Notification',
    description: 'Send a push notification',
    icon: '🔔',
    configFields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
      },
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
      },
    ],
  },
  add_tag: {
    label: 'Add Tag',
    description: 'Add a tag to the contact',
    icon: '🏷️',
    configFields: [
      {
        key: 'tag',
        label: 'Tag Name',
        type: 'text',
      },
    ],
  },
  remove_tag: {
    label: 'Remove Tag',
    description: 'Remove a tag from the contact',
    icon: '🏷️',
    configFields: [
      {
        key: 'tag',
        label: 'Tag Name',
        type: 'text',
      },
    ],
  },
  set_watch: {
    label: 'Set Watch Status',
    description: 'Mark contact as watched',
    icon: '👁️',
    configFields: [
      {
        key: 'watch_status',
        label: 'Watch Status',
        type: 'select',
        options: [
          { value: 'watch', label: 'Watch' },
          { value: 'important', label: 'Important' },
          { value: 'vip', label: 'VIP' },
        ],
      },
    ],
  },
  add_to_pipeline: {
    label: 'Add to Pipeline',
    description: 'Add contact to a pipeline stage',
    icon: '📊',
    configFields: [
      {
        key: 'pipeline_id',
        label: 'Pipeline ID',
        type: 'text',
      },
      {
        key: 'stage_id',
        label: 'Stage ID',
        type: 'text',
      },
    ],
  },
  create_task: {
    label: 'Create Task',
    description: 'Create a follow-up task',
    icon: '✅',
    configFields: [
      {
        key: 'title',
        label: 'Task Title',
        type: 'text',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
      },
    ],
  },
  webhook: {
    label: 'Call Webhook',
    description: 'Send data to a webhook URL',
    icon: '🔗',
    configFields: [
      {
        key: 'url',
        label: 'Webhook URL',
        type: 'text',
      },
    ],
  },
  send_email: {
    label: 'Send Email',
    description: 'Send an automated email',
    icon: '📧',
    configFields: [
      {
        key: 'template_id',
        label: 'Template ID',
        type: 'text',
      },
      {
        key: 'subject',
        label: 'Subject (optional)',
        type: 'text',
      },
    ],
  },
}

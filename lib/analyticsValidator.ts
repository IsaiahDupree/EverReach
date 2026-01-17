// Lightweight, dev-only validator for analytics events
// Reads docs/analytics-schema.json and warns on missing required fields

let cachedMap: Record<string, { requiredFields: string[] }> | null = null;

function loadEventsMap(): Record<string, { requiredFields: string[] }> | null {
  if (cachedMap) return cachedMap;
  try {
    // Prefer explicit events map
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const events = require('../docs/analytics-events.json');
    if (events && events.events) {
      cachedMap = events.events;
      return cachedMap;
    }
  } catch {}
  try {
    // Fallback to schema file's example if present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const schema = require('../docs/analytics-schema.json');
    if (schema?.events) {
      cachedMap = schema.events;
      return cachedMap;
    }
    if (schema?.examples?.[0]?.events) {
      cachedMap = schema.examples[0].events;
      return cachedMap;
    }
  } catch {}
  return null;
}

export function validateEvent(eventName: string, props?: Record<string, any>) {
  if (!__DEV__) return; // dev-only
  const map = loadEventsMap();
  if (!map || !map[eventName]) return;

  const required: string[] = map[eventName].requiredFields || [];
  const missing = required.filter((k) => props == null || !(k in props));
  if (missing.length > 0) {
    // Non-blocking warning so devs can fix
    // eslint-disable-next-line no-console
    console.warn(`[AnalyticsValidator] ${eventName} missing fields: ${missing.join(', ')}`);
  }
}

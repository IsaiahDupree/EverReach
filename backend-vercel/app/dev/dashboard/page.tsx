'use client';

import { useEffect, useState } from 'react';

interface AppEvent {
  id: number;
  event_name: string;
  user_id: string | null;
  anonymous_id: string | null;
  occurred_at: string;
  context: Record<string, any>;
  properties: Record<string, any>;
}

interface EventsResponse {
  events: AppEvent[];
  meta: {
    total: number;
    uniqueEventNames: string[];
    eventCounts: Record<string, number>;
    filters: {
      event_name: string | null;
      user_id: string | null;
      limit: number;
    };
  };
}

export default function DevDashboard() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [meta, setMeta] = useState<EventsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const fetchEvents = async (eventName?: string) => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (eventName) params.append('event_name', eventName);

      const response = await fetch(`/api/dev/events?${params}`);
      const data: EventsResponse = await response.json();

      setEvents(data.events);
      setMeta(data.meta);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(selectedEvent || undefined);
  }, [selectedEvent]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchEvents(selectedEvent || undefined);
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedEvent]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleString();
  };

  const getEventColor = (eventName: string) => {
    const colors: Record<string, string> = {
      'page_view': 'bg-blue-100 text-blue-800',
      'button_click': 'bg-green-100 text-green-800',
      'api_call': 'bg-purple-100 text-purple-800',
      'error': 'bg-red-100 text-red-800',
      'user_action': 'bg-yellow-100 text-yellow-800',
    };

    // Check for partial matches
    for (const [key, color] of Object.entries(colors)) {
      if (eventName.toLowerCase().includes(key)) return color;
    }

    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Dev Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time event monitoring for frontend & mobile apps
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? '🟢 Auto-refresh ON' : '⭕ Auto-refresh OFF'}
              </button>
              <button
                onClick={() => fetchEvents(selectedEvent || undefined)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                🔄 Refresh Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Events</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{meta?.total || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Showing latest 100</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Event Types</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {meta?.uniqueEventNames.length || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Unique event names</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Last 24 Hours</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {Object.values(meta?.eventCounts || {}).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total events</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Top Event</div>
            <div className="text-lg font-bold text-gray-900 mt-2 truncate">
              {meta?.eventCounts ? 
                Object.entries(meta.eventCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                : 'N/A'
              }
            </div>
            <div className="text-xs text-gray-500 mt-1">Most frequent</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by event:</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Events</option>
              {meta?.uniqueEventNames.map(name => (
                <option key={name} value={name}>
                  {name} ({meta.eventCounts[name] || 0} in 24h)
                </option>
              ))}
            </select>
            {selectedEvent && (
              <button
                onClick={() => setSelectedEvent('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {events.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                <p className="text-gray-600">Events from your frontend/mobile apps will appear here</p>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
                  <p className="text-sm font-medium text-gray-700 mb-2">Track an event:</p>
                  <code className="text-xs bg-gray-900 text-green-400 p-3 rounded block overflow-x-auto">
{`fetch('/api/dev/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_name: 'page_view',
    user_id: 'user-id',
    properties: { page: '/home' }
  })
});`}
                  </code>
                </div>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventColor(event.event_name)}`}>
                          {event.event_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(event.occurred_at)}
                        </span>
                        {event.user_id && (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                            👤 User
                          </span>
                        )}
                        {event.anonymous_id && !event.user_id && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            🕵️ Anonymous
                          </span>
                        )}
                      </div>

                      {expandedEvent === event.id && (
                        <div className="mt-4 space-y-3">
                          {Object.keys(event.properties).length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Properties:</div>
                              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                                {JSON.stringify(event.properties, null, 2)}
                              </pre>
                            </div>
                          )}
                          {Object.keys(event.context).length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Context:</div>
                              <pre className="text-xs bg-gray-900 text-blue-400 p-3 rounded overflow-x-auto">
                                {JSON.stringify(event.context, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-medium text-gray-700">Event ID:</span>{' '}
                              <span className="text-gray-600">{event.id}</span>
                            </div>
                            {event.user_id && (
                              <div>
                                <span className="font-medium text-gray-700">User ID:</span>{' '}
                                <span className="text-gray-600 font-mono">{event.user_id.slice(0, 8)}...</span>
                              </div>
                            )}
                            {event.anonymous_id && (
                              <div>
                                <span className="font-medium text-gray-700">Anonymous ID:</span>{' '}
                                <span className="text-gray-600 font-mono">{event.anonymous_id}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">Timestamp:</span>{' '}
                              <span className="text-gray-600">{new Date(event.occurred_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedEvent === event.id ? 'transform rotate-180' : ''}`}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

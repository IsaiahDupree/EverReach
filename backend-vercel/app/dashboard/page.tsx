'use client';

import dynamic from 'next/dynamic';

// Check if dev dashboard is enabled via env flag
const DEV_DASHBOARD_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_DASHBOARD === '1';

// Dynamically import the full dashboard only when enabled
const DashboardEnabled = dynamic(() => import('./DashboardEnabled'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  // If dev dashboard is disabled, show minimal page
  if (!DEV_DASHBOARD_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Disabled</h1>
          <p className="text-gray-600">
            The developer dashboard is not enabled for this deployment.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            This is a backend API deployment. For the analytics dashboard, visit{' '}
            <a 
              href="https://reports.everreach.app" 
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              reports.everreach.app
            </a>
          </p>
        </div>
      </div>
    );
  }

  // If enabled, lazy load the full dashboard
  return <DashboardEnabled />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

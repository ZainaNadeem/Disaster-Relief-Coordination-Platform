import Link from 'next/link';
import type { IncidentListItem } from '@/lib/types';

// Sidebar: active incidents sorted by open-task count (descending). Each row
// shows the title, an open-task count badge, and a View button.
export default function IncidentSidebar({ incidents }: { incidents: IncidentListItem[] }) {
  const sorted = [...incidents].sort((a, b) => b.openTaskCount - a.openTaskCount);

  return (
    <div className="flex h-full flex-col">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">Active Incidents ({incidents.length})</h2>
      <ul className="flex-1 divide-y overflow-y-auto">
        {sorted.map((incident) => (
          <li key={incident.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{incident.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                title="Open tasks"
              >
                {incident.openTaskCount} tasks
              </span>
              <Link
                href={`/incidents/${incident.id}`}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                View
              </Link>
            </div>
          </li>
        ))}
        {incidents.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">No active incidents</li>
        )}
      </ul>
    </div>
  );
}

import type { Incident } from '@/lib/types';
import { IncidentStatusBadge } from './badges';

// Left panel: high-level incident info.
export default function IncidentInfoPanel({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold leading-tight">{incident.title}</h1>
        <IncidentStatusBadge status={incident.status} />
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</h2>
        <p className="mt-1 text-sm text-gray-700">{incident.description}</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Location</h2>
        <p className="mt-1 font-mono text-sm text-gray-700">
          {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Created</h2>
        <p className="mt-1 text-sm text-gray-700">
          {new Date(incident.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

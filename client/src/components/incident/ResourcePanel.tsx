'use client';

import type { Resource } from '@/lib/types';
import { ResourceStatusBadge } from './badges';

// Right panel: resource list with an admin-only Dispatch action.
export default function ResourcePanel({
  resources,
  isAdmin,
  onDispatch,
  dispatchingId,
}: {
  resources: Resource[];
  isAdmin: boolean;
  onDispatch: (resourceId: string) => void;
  dispatchingId: string | null;
}) {
  return (
    <div className="space-y-2 p-4">
      <h2 className="text-sm font-semibold">Resources ({resources.length})</h2>
      {resources.length === 0 && <p className="text-sm text-gray-400">No resources</p>}

      {resources.map((r) => (
        <div key={r.id} className="rounded border bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">{r.name}</span>
            <ResourceStatusBadge status={r.status} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {r.type} · qty {r.quantity}
            {r.assignee ? ` · ${r.assignee.name}` : ''}
          </p>

          {isAdmin && r.status === 'AVAILABLE' && (
            <button
              onClick={() => onDispatch(r.id)}
              disabled={dispatchingId === r.id}
              className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {dispatchingId === r.id ? 'Dispatching…' : 'Dispatch'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

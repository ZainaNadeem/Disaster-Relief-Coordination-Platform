'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import api from '@/lib/api';
import type { Incident } from '@/lib/types';

function IncidentDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<Incident>(`/incidents/${id}`)
      .then(({ data }) => active && setIncident(data))
      .catch(() => active && setError('Incident not found'));
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!incident) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  const openTasks = incident.tasks?.filter((t) => t.status !== 'DONE') ?? [];
  const availableResources = incident.resources?.filter((r) => r.status === 'AVAILABLE') ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>

      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{incident.title}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              incident.status === 'ACTIVE'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {incident.status}
          </span>
        </div>
        <p className="mt-1 text-gray-600">{incident.description}</p>
        <p className="mt-1 text-sm text-gray-400">
          {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
        </p>
      </header>

      <section>
        <h2 className="mb-2 font-semibold">Tasks ({incident.tasks?.length ?? 0})</h2>
        <ul className="divide-y rounded border bg-white">
          {(incident.tasks ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{t.title}</span>
              <span className="flex gap-2">
                <span className="rounded bg-gray-100 px-2 py-0.5">{t.priority}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5">{t.status}</span>
              </span>
            </li>
          ))}
          {(incident.tasks?.length ?? 0) === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No tasks</li>
          )}
        </ul>
        <p className="mt-1 text-sm text-gray-500">{openTasks.length} open</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Resources ({incident.resources?.length ?? 0})</h2>
        <ul className="divide-y rounded border bg-white">
          {(incident.resources ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                {r.name} <span className="text-gray-400">×{r.quantity}</span>
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5">{r.status}</span>
            </li>
          ))}
          {(incident.resources?.length ?? 0) === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No resources</li>
          )}
        </ul>
        <p className="mt-1 text-sm text-gray-500">{availableResources.length} available</p>
      </section>
    </div>
  );
}

export default function IncidentPage() {
  return (
    <AuthGuard>
      <IncidentDetail />
    </AuthGuard>
  );
}

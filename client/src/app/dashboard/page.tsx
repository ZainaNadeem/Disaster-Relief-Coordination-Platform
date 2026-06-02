'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import StatsBar from '@/components/dashboard/StatsBar';
import IncidentSidebar from '@/components/dashboard/IncidentSidebar';
import api from '@/lib/api';
import { clearToken, isAdmin } from '@/lib/auth';
import type { Incident, IncidentListItem } from '@/lib/types';

// mapbox-gl touches `window`, so load the map only on the client.
const IncidentMap = dynamic(() => import('@/components/IncidentMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-gray-500">Loading map…</div>
  ),
});

// search-js-react wraps a web component; keep it out of server rendering too.
const AddIncidentModal = dynamic(() => import('@/components/dashboard/AddIncidentModal'), {
  ssr: false,
});

export default function DashboardPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapKey, setMapKey] = useState(0); // bump to remount/refetch the map
  const admin = isAdmin();

  function loadIncidents() {
    api
      .get<IncidentListItem[]>('/incidents')
      .then(({ data }) => setIncidents(data))
      .catch(() => setError('Failed to load incidents'));
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  const stats = useMemo(
    () => ({
      activeIncidents: incidents.length,
      openTasks: incidents.reduce((sum, i) => sum + i.openTaskCount, 0),
      dispatchedResources: incidents.reduce((sum, i) => sum + i.dispatchedResourceCount, 0),
    }),
    [incidents],
  );

  function handleCreated(_incident: Incident) {
    loadIncidents(); // refresh stats + sidebar
    setMapKey((k) => k + 1); // re-fetch the map markers
  }

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3">
          <h1 className="text-lg font-semibold">Incident Dashboard</h1>
          <div className="flex items-center gap-3">
            {admin && (
              <button
                onClick={() => setModalOpen(true)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add Incident
              </button>
            )}
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 px-4 py-1 text-center text-sm text-red-700">{error}</div>
        )}

        <div className="border-b bg-gray-50 p-4">
          <StatsBar {...stats} />
        </div>

        <div className="flex min-h-0 flex-1">
          <main className="min-h-0 flex-1">
            <IncidentMap key={mapKey} />
          </main>
          <aside className="w-80 shrink-0 border-l bg-white">
            <IncidentSidebar incidents={incidents} />
          </aside>
        </div>

        {modalOpen && (
          <AddIncidentModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />
        )}
      </div>
    </AuthGuard>
  );
}

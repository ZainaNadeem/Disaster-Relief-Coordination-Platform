'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { clearToken } from '@/lib/auth';

// mapbox-gl touches `window`, so load the map only on the client.
const IncidentMap = dynamic(() => import('@/components/IncidentMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-gray-500">Loading map…</div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3">
          <h1 className="text-lg font-semibold">Incident Dashboard</h1>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </header>
        <main className="flex-1">
          <IncidentMap />
        </main>
      </div>
    </AuthGuard>
  );
}

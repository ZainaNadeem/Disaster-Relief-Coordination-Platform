'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import IncidentInfoPanel from '@/components/incident/IncidentInfoPanel';
import TaskBoard from '@/components/incident/TaskBoard';
import ResourcePanel from '@/components/incident/ResourcePanel';
import api from '@/lib/api';
import { getUser, isAdmin } from '@/lib/auth';
import { useIncidentSocket, type SocketStatus } from '@/lib/useIncidentSocket';
import type { Incident, Resource, Task, TaskStatus, WsEvent } from '@/lib/types';

// Insert-or-replace an item in a list by id.
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const exists = list.some((x) => x.id === item.id);
  return exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function ConnectionDot({ status }: { status: SocketStatus }) {
  const color =
    status === 'open' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-red-500';
  const label = status === 'open' ? 'Live' : status === 'connecting' ? 'Connecting…' : 'Reconnecting…';
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function IncidentDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const admin = isAdmin();

  // Initial load.
  useEffect(() => {
    let active = true;
    api
      .get<Incident>(`/incidents/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setIncident(data);
        setTasks(data.tasks ?? []);
        setResources(data.resources ?? []);
      })
      .catch(() => active && setError('Incident not found'));
    return () => {
      active = false;
    };
  }, [id]);

  // Real-time updates: merge task/resource events into local state.
  const handleEvent = useCallback((evt: WsEvent) => {
    if (evt.entity === 'task') {
      setTasks((prev) => upsertById(prev, evt.data as Task));
    } else if (evt.entity === 'resource') {
      setResources((prev) => upsertById(prev, evt.data as Resource));
    }
  }, []);

  const socketStatus = useIncidentSocket(id, handleEvent);

  // Drag a task to a new column → optimistic update + PATCH.
  async function moveTask(taskId: string, status: TaskStatus) {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      // The authoritative row also arrives over the WebSocket and upserts.
    } catch {
      setTasks(previous); // revert on failure
      setError('Failed to move task');
    }
  }

  // Admin dispatches a resource. With no users list endpoint yet, we assign it
  // to the acting admin (a valid user id the client already has).
  async function dispatchResource(resourceId: string) {
    const me = getUser();
    if (!me) return;
    setDispatchingId(resourceId);
    try {
      const { data } = await api.patch<Resource>(`/resources/${resourceId}/dispatch`, {
        assignedTo: me.id,
      });
      setResources((prev) => upsertById(prev, data));
    } catch {
      setError('Failed to dispatch resource');
    } finally {
      setDispatchingId(null);
    }
  }

  if (error && !incident) {
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

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <ConnectionDot status={socketStatus} />
      </header>

      {error && (
        <div className="bg-red-50 px-4 py-1 text-center text-sm text-red-700">{error}</div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr_20rem]">
        {/* Left: incident info */}
        <aside className="overflow-y-auto border-r bg-white">
          <IncidentInfoPanel incident={incident} />
        </aside>

        {/* Center: task board */}
        <main className="min-h-0 overflow-hidden p-4">
          <h2 className="mb-3 text-sm font-semibold">Task Board</h2>
          <div className="h-[calc(100%-2rem)]">
            <TaskBoard tasks={tasks} onMove={moveTask} />
          </div>
        </main>

        {/* Right: resources */}
        <aside className="overflow-y-auto border-l bg-white">
          <ResourcePanel
            resources={resources}
            isAdmin={admin}
            onDispatch={dispatchResource}
            dispatchingId={dispatchingId}
          />
        </aside>
      </div>
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

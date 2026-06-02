import type { IncidentStatus, Priority, ResourceStatus } from '@/lib/types';

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge className={status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
      {status}
    </Badge>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MED: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-600',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{priority}</Badge>;
}

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <Badge className={status === 'AVAILABLE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}>
      {status}
    </Badge>
  );
}

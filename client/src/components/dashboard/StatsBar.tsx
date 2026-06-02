// Top stats bar: three headline numbers for the active situation.
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-lg border bg-white px-4 py-3">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}

export default function StatsBar({
  activeIncidents,
  openTasks,
  dispatchedResources,
}: {
  activeIncidents: number;
  openTasks: number;
  dispatchedResources: number;
}) {
  return (
    <div className="flex gap-3">
      <Stat label="Active incidents" value={activeIncidents} />
      <Stat label="Open tasks" value={openTasks} />
      <Stat label="Dispatched resources" value={dispatchedResources} />
    </div>
  );
}

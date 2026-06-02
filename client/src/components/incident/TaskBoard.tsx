'use client';

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Task, TaskStatus } from '@/lib/types';
import { PriorityBadge } from './badges';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'OPEN', label: 'Open' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
];

// A single draggable task card.
function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded border bg-white p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {task.assignee ? `👤 ${task.assignee.name}` : 'Unassigned'}
      </p>
    </div>
  );
}

// A droppable column for one status.
function Column({ status, label, tasks }: { status: TaskStatus; label: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 flex-col rounded-lg border bg-gray-50 ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <h3 className="border-b px-3 py-2 text-sm font-semibold">
        {label} <span className="text-gray-400">({tasks.length})</span>
      </h3>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-gray-400">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}

// Center panel: three-column drag-and-drop board.
export default function TaskBoard({
  tasks,
  onMove,
}: {
  tasks: Task[];
  onMove: (taskId: string, status: TaskStatus) => void;
}) {
  // Require a small drag distance so plain clicks don't count as drags.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== newStatus) {
      onMove(task.id, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid h-full grid-cols-3 gap-3">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            status={c.status}
            label={c.label}
            tasks={tasks.filter((t) => t.status === c.status)}
          />
        ))}
      </div>
    </DndContext>
  );
}

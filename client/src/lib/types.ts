// Shared API types used across the client.

export type Role = 'ADMIN' | 'VOLUNTEER';
export type IncidentStatus = 'ACTIVE' | 'RESOLVED';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MED' | 'HIGH';
export type ResourceStatus = 'AVAILABLE' | 'DISPATCHED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AssigneeRef {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  incidentId: string;
  assignedTo: string | null;
  assignee?: AssigneeRef | null;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  quantity: number;
  status: ResourceStatus;
  incidentId: string;
  assignedTo: string | null;
  assignee?: AssigneeRef | null;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  status: IncidentStatus;
  createdAt: string;
  tasks?: Task[];
  resources?: Resource[];
}

// Shape returned by GET /incidents (list) — incident fields plus rollup counts.
export interface IncidentListItem extends Incident {
  openTaskCount: number;
  dispatchedResourceCount: number;
}

// GeoJSON returned by GET /incidents/map.
export interface IncidentFeatureProperties {
  id: string;
  title: string;
  status: IncidentStatus;
  open_task_count: number;
  available_resource_count: number;
  high_priority_task_count: number;
}

export interface IncidentFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: IncidentFeatureProperties;
}

export interface IncidentFeatureCollection {
  type: 'FeatureCollection';
  features: IncidentFeature[];
}

// Events pushed over the WebSocket: { type, entity, data }.
export interface WsEvent {
  type: string;
  entity: 'task' | 'resource' | 'incident';
  data: unknown;
}

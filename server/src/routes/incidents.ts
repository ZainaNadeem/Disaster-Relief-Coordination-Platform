import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const incidentsRouter = Router();

// ---------- Schemas ----------

const createIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'RESOLVED']),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(['LOW', 'MED', 'HIGH']).optional(),
  assignedTo: z.string().uuid().optional(),
});

const createResourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  quantity: z.number().int().nonnegative().optional(),
});

// ---------- Helpers ----------

async function incidentExists(id: string): Promise<boolean> {
  const found = await prisma.incident.findUnique({ where: { id }, select: { id: true } });
  return found !== null;
}

// ---------- Routes ----------

// POST /incidents — create an incident (ADMIN only).
incidentsRouter.post(
  '/',
  requireRole(Role.ADMIN),
  validateBody(createIncidentSchema),
  async (req: Request, res: Response) => {
    const incident = await prisma.incident.create({ data: req.body });
    res.status(201).json(incident);
  },
);

// GET /incidents — list all ACTIVE incidents (newest first).
incidentsRouter.get('/', async (_req: Request, res: Response) => {
  const incidents = await prisma.incident.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  res.json(incidents);
});

// GET /incidents/map — all ACTIVE incidents as a GeoJSON FeatureCollection.
// NOTE: must be declared before "/:id" so "map" isn't treated as an id.
// Coordinates are the stored lat/lng; no geocoding happens server-side.
incidentsRouter.get('/map', async (_req: Request, res: Response) => {
  const incidents = await prisma.incident.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      status: true,
      lat: true,
      lng: true,
      // Filtered relation counts: only OPEN tasks and AVAILABLE resources.
      _count: {
        select: {
          tasks: { where: { status: 'OPEN' } },
          resources: { where: { status: 'AVAILABLE' } },
        },
      },
    },
  });

  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: incidents.map((incident) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        // GeoJSON order is [longitude, latitude].
        coordinates: [incident.lng, incident.lat],
      },
      properties: {
        id: incident.id,
        title: incident.title,
        status: incident.status,
        open_task_count: incident._count.tasks,
        available_resource_count: incident._count.resources,
      },
    })),
  };

  res.json(featureCollection);
});

// GET /incidents/:id — one incident with its tasks and resources.
incidentsRouter.get('/:id', async (req: Request, res: Response) => {
  const incident = await prisma.incident.findUnique({
    where: { id: req.params.id },
    include: { tasks: true, resources: true },
  });
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json(incident);
});

// PATCH /incidents/:id/status — update status (ADMIN only).
incidentsRouter.patch(
  '/:id/status',
  requireRole(Role.ADMIN),
  validateBody(updateStatusSchema),
  async (req: Request, res: Response) => {
    if (!(await incidentExists(req.params.id))) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json(incident);
  },
);

// POST /incidents/:id/tasks — create a task under this incident.
incidentsRouter.post(
  '/:id/tasks',
  validateBody(createTaskSchema),
  async (req: Request, res: Response) => {
    if (!(await incidentExists(req.params.id))) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    try {
      const task = await prisma.task.create({
        data: { ...req.body, incidentId: req.params.id },
      });
      res.status(201).json(task);
    } catch (err) {
      // assignedTo points at a user that doesn't exist.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        res.status(400).json({ error: 'assignedTo does not reference an existing user' });
        return;
      }
      throw err;
    }
  },
);

// POST /incidents/:id/resources — add a resource to this incident.
incidentsRouter.post(
  '/:id/resources',
  validateBody(createResourceSchema),
  async (req: Request, res: Response) => {
    if (!(await incidentExists(req.params.id))) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    const resource = await prisma.resource.create({
      data: { ...req.body, incidentId: req.params.id },
    });
    res.status(201).json(resource);
  },
);

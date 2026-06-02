import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { broadcast } from '../realtime/ws.js';

export const tasksRouter = Router();

// At least one of status / assignedTo must be provided. assignedTo may be null
// to un-assign the task.
const updateTaskSchema = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.assignedTo !== undefined, {
    message: 'Provide at least one of: status, assignedTo',
  });

// PATCH /tasks/:id — update a task's status and/or assignee.
tasksRouter.patch('/:id', validateBody(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
      include: { assignee: { select: { id: true, name: true } } },
    });
    // Notify everyone watching this incident.
    broadcast(task.incidentId, { type: 'task.updated', entity: 'task', data: task });
    res.json(task);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      if (err.code === 'P2003') {
        res.status(400).json({ error: 'assignedTo does not reference an existing user' });
        return;
      }
    }
    throw err;
  }
});

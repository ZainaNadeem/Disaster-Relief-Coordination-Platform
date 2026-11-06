import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { broadcast } from '../realtime/ws.js';

export const resourcesRouter = Router();

const dispatchSchema = z.object({
  assignedTo: z.string().uuid(),
});

// PATCH /resources/:id/dispatch — assign a resource to a user and mark it
// DISPATCHED.
resourcesRouter.patch(
  '/:id/dispatch',
  validateBody(dispatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.body.assignedTo },
        select: { id: true },
      });
      if (!user) {
        res.status(400).json({ error: 'assignedTo does not reference an existing user' });
        return;
      }

      // Claim the resource atomically so competing requests cannot overwrite the assignee.
      const [resource] = await prisma.resource.updateManyAndReturn({
        where: { id: req.params.id, status: 'AVAILABLE' },
        data: { assignedTo: req.body.assignedTo, status: 'DISPATCHED' },
        include: { assignee: { select: { id: true, name: true } } },
      });
      if (!resource) {
        const existing = await prisma.resource.findUnique({
          where: { id: req.params.id },
          select: { id: true },
        });
        if (existing) {
          res.status(409).json({ error: 'Resource has already been dispatched' });
        } else {
          res.status(404).json({ error: 'Resource not found' });
        }
        return;
      }

      broadcast(resource.incidentId, {
        type: 'resource.dispatched',
        entity: 'resource',
        data: resource,
      });
      res.json(resource);
    } catch (err) {
      next(err);
    }
  },
);

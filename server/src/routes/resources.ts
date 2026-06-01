import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';

export const resourcesRouter = Router();

const dispatchSchema = z.object({
  assignedTo: z.string().uuid(),
});

// PATCH /resources/:id/dispatch — assign a resource to a user and mark it
// DISPATCHED.
resourcesRouter.patch(
  '/:id/dispatch',
  validateBody(dispatchSchema),
  async (req: Request, res: Response) => {
    // Make sure the target user exists before dispatching.
    const user = await prisma.user.findUnique({
      where: { id: req.body.assignedTo },
      select: { id: true },
    });
    if (!user) {
      res.status(400).json({ error: 'assignedTo does not reference an existing user' });
      return;
    }

    try {
      const resource = await prisma.resource.update({
        where: { id: req.params.id },
        data: { assignedTo: req.body.assignedTo, status: 'DISPATCHED' },
      });
      res.json(resource);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }
      throw err;
    }
  },
);

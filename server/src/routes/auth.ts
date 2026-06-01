import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

export const authRouter = Router();

const SALT_ROUNDS = 10;

// POST /auth/register
// Body: { name, email, password, role? }
// Hashes the password with bcrypt and stores the user. Returns the safe user
// fields (never the password hash) plus a signed JWT.
authRouter.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body ?? {};

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email and password are required' });
    return;
  }

  // Only allow a valid role; default to VOLUNTEER.
  const userRole: Role =
    role && Object.values(Role).includes(role) ? (role as Role) : Role.VOLUNTEER;

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, hashedPassword, role: userRole },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ user, token });
  } catch (err) {
    // Unique constraint violation = email already registered.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error('register failed', err);
    res.status(500).json({ error: 'Could not register user' });
  }
});

// POST /auth/login
// Body: { email, password }
// Verifies the password against the stored hash and returns a signed JWT.
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Use the same generic message whether the email or password is wrong, so we
  // don't reveal which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  });
});

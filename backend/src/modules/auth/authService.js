import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { UnauthorizedError, ConflictError } from '../../common/errors.js';

export async function signup({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new ConflictError('Email already in use');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'analyst',
    }
  });

  const accessToken = jwt.sign({ sub: user.id, role: user.role, name: user.name }, env.jwtAccessSecret, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ sub: user.id }, env.jwtRefreshSecret, { expiresIn: '7d' });

  await prisma.auditLog.create({ data: { userId: user.id, action: 'signup', entity: 'User', entityId: user.id } });

  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const accessToken = jwt.sign({ sub: user.id, role: user.role, name: user.name }, env.jwtAccessSecret, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ sub: user.id }, env.jwtRefreshSecret, { expiresIn: '7d' });

  await prisma.auditLog.create({ data: { userId: user.id, action: 'login', entity: 'User', entityId: user.id } });

  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

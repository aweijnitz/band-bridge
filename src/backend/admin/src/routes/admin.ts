import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import prisma from '../prisma.js';

const router = express.Router();

// Create a new user
router.post(
  '/users',
  [
    body('username').isString().isLength({ min: 3 }),
    body('password').isString().isLength({ min: 8 })
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;
    console.log('Creating user');
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const user = await prisma.user.create({
        data: { username, passwordHash }
      });
      res.status(201).json({ id: user.id, username: user.username });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        return res.status(409).json({ error: 'Username already exists' });
      }
      res.status(500).json({ error: 'Failed to create user', details: (err as { message?: string }).message, code: (err as { code?: string }).code });
    }
  }
);

// Create a new band
router.post(
  '/bands',
  [body('name').isString().isLength({ min: 2 })],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name } = req.body;
    console.log('Creating band');
    try {
      const band = await prisma.band.create({ data: { name } });
      res.status(201).json({ id: band.id, name: band.name });
    } catch {
      res.status(500).json({ error: 'Failed to create band' });
    }
  }
);

// Assign user to band
router.post(
  '/bands/:bandId/users',
  [body('userId').isInt()],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { bandId } = req.params;
    const { userId } = req.body;
    console.log('Assigning user to band');
    try {
      const userBand = await prisma.userBand.create({
        data: { bandId: Number(bandId), userId: Number(userId) }
      });
      res.status(201).json(userBand);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        return res.status(409).json({ error: 'User already in band' });
      }
      res.status(500).json({ error: 'Failed to assign user to band' });
    }
  }
);

// Create API key for user
router.post(
  '/users/:userId/apikeys',
  async (req: express.Request, res: express.Response) => {
    const { userId } = req.params;
    console.log('Creating API key for user');
    // Generate a random API key
    const apiKey = [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
    const keyHash = await bcrypt.hash(apiKey, 12);
    try {
      const created = await prisma.apiKey.create({
        data: { userId: Number(userId), keyHash }
      });
      res.status(201).json({ id: created.id, apiKey }); // Only show plain key once
    } catch {
      res.status(500).json({ error: 'Failed to create API key' });
    }
  }
);

// Revoke API key
router.post(
  '/apikeys/:id/revoke',
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    console.log('Revoking API key');
    try {
      const revoked = await prisma.apiKey.update({
        where: { id: Number(id) },
        data: { revokedAt: new Date() }
      });
      res.json({ id: revoked.id, revokedAt: revoked.revokedAt });
    } catch {
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  }
);

export default router; 
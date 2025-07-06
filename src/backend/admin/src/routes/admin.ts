import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import crypto from 'crypto';

function signJwt(payload: Record<string, unknown>, expiresIn: number) {
  const secret = process.env.JWT_SECRET || 'changeme';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const base = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(base).digest('base64url');
  return `${base}.${signature}`;
}

const keyRate: Record<string, { count: number; first: number }> = {};
const KEY_LIMIT = 5;
const KEY_WINDOW = 60 * 1000;

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
      res.status(400).json({ errors: errors.array() });
      return;
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
        res.status(409).json({ error: 'Username already exists' });
        return;
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
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { name } = req.body;
    console.log('Creating band');
    try {
      const band = await prisma.band.create({ data: { name } });
      res.status(201).json({ id: band.id, name: band.name });
    } catch (err: unknown) {
      console.error('Error creating band:', err);
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Band name already exists' });
        return;
      }
      res.status(500).json({ error: 'Failed to create band', details: (err as { message?: string }).message });
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
      res.status(400).json({ errors: errors.array() });
      return;
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
        res.status(409).json({ error: 'User already in band' });
        return;
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
    const rate = keyRate[userId] || { count: 0, first: Date.now() };
    if (Date.now() - rate.first < KEY_WINDOW) {
      if (rate.count >= KEY_LIMIT) {
        res.status(429).json({ error: 'Too many keys' });
        return;
      }
    } else {
      rate.count = 0;
      rate.first = Date.now();
    }
    rate.count++;
    keyRate[userId] = rate;

    console.log('Creating API key for user');
    const token = signJwt({ sub: Number(userId), type: 'api-key' }, 10 * 24 * 60 * 60);
    const keyHash = await bcrypt.hash(token, 12);
    try {
      const created = await prisma.apiKey.create({
        data: { userId: Number(userId), keyHash }
      });
      res.status(201).json({ id: created.id, apiKey: token });
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

// Reset complete application state
router.post(
  '/reset',
  async (req: express.Request, res: express.Response) => {
    console.log('Resetting complete application state');
    try {
      // Clear all database tables
      console.log('Resetting complete database');
      await prisma.comment.deleteMany();
      await prisma.media.deleteMany();
      await prisma.project.deleteMany();
      await prisma.userBand.deleteMany();
      await prisma.apiKey.deleteMany();
      await prisma.session.deleteMany();
      await prisma.user.deleteMany();
      await prisma.band.deleteMany();

      // Call media service reset endpoint
      console.log('Deleting all media files');
      const mediaServiceUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:4001';
      const adminApiKey = process.env.ADMIN_API_KEY;
      const response = await fetch(`${mediaServiceUrl}/reset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminApiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Media service reset failed: ${response.statusText}`);
      }

      const mediaResetResult = await response.json();
      
      res.json({ 
        success: true, 
        message: 'Application state reset successfully',
        mediaFiles: mediaResetResult.deletedCount !== undefined ? mediaResetResult.deletedCount : 0
      });
    } catch (err: unknown) {
      console.error('Reset failed:', err);
      res.status(500).json({ 
        error: 'Failed to reset application state', 
        details: err instanceof Error ? err.message : String(err) 
      });
    }
  }
);

export default router; 
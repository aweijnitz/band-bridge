import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
  throw new Error('ADMIN_API_KEY must be set in environment');
}

// Admin API key auth middleware
function requireAdminApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.header('Authorization');
  if (!auth || auth !== `Bearer ${ADMIN_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/admin', requireAdminApiKey, adminRouter);

// TODO: Add user, band, and API key management routes here

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`[admin] Listening on port ${PORT}`);
});

export default app; 
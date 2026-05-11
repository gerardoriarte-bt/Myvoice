import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';

// Configure dotenv before any other imports that might use env variables
dotenv.config();

const REQUIRED_ENV_VARS = ['OPENAI_API_KEY', 'DATABASE_URL'] as const;
const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`\n[MyVoice] Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
  console.error('[MyVoice] Copy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn('[MyVoice] WARNING: JWT_SECRET not set — using insecure fallback. Set it before deploying.');
}

import { PrismaClient } from '@prisma/client';
import routes from './routes/index.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'My Voice API' });
});

// Mount Routes
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`My Voice API running on port ${PORT}`);
});

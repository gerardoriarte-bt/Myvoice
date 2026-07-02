import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';

// Configure dotenv before any other imports that might use env variables
dotenv.config();

const provider = process.env.AI_PROVIDER || 'openai';
const hasAIKey =
  (provider === 'openai'     && !!process.env.OPENAI_API_KEY) ||
  (provider === 'openrouter' && !!process.env.OPENROUTER_API_KEY) ||
  (provider === 'anthropic'  && !!(process.env.ANTHROPIC_API_KEY_TEMP || process.env.ANTHROPIC_API_KEY)) ||
  (provider === 'gemini'     && !!process.env.GEMINI_API_KEY);

if (!process.env.DATABASE_URL || !hasAIKey) {
  const missing = [
    !process.env.DATABASE_URL && 'DATABASE_URL',
    !hasAIKey && `API key for provider "${provider}" (e.g. OPENROUTER_API_KEY)`,
  ].filter(Boolean);
  console.error(`\n[MyVoice] Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
  console.error('[MyVoice] Copy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn('[MyVoice] WARNING: JWT_SECRET not set — using insecure fallback. Set it before deploying.');
}

import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import routes from './routes/index.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Basic health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', engine: 'My Voice API' });
});

// Mount Routes
app.use('/api', routes);

// Multer error handler — converts file-too-large and wrong-type into readable API errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'El archivo supera el límite de 15 MB.' });
  }
  if (err?.message === 'Solo se aceptan archivos PDF') {
    return res.status(415).json({ error: err.message });
  }
  res.status(500).json({ error: err?.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`My Voice API running on port ${PORT}`);
});

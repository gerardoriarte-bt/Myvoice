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

if (!process.env.DATABASE_URL || !hasAIKey || !process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
  const missing = [
    !process.env.DATABASE_URL && 'DATABASE_URL',
    !hasAIKey && `API key for provider "${provider}" (e.g. OPENROUTER_API_KEY)`,
    // Sin secreto propio, cualquiera puede firmar un token con el workspace y
    // el rol que quiera. Es fatal a propósito: antes era solo un warning.
    !process.env.JWT_SECRET && 'JWT_SECRET',
    // Sin ella no se pueden leer las API keys de IA que ya están cifradas en la
    // base, y las nuevas se guardarían en claro. Generar con: openssl rand -base64 32
    !process.env.ENCRYPTION_KEY && 'ENCRYPTION_KEY',
  ].filter(Boolean);
  console.error(`\n[MyVoice] Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
  console.error('[MyVoice] Copy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}

// El require de este import se emite en esta posición (el server compila a
// CommonJS), así que la validación corre después del chequeo de entorno de
// arriba. Fallar acá y no en la primera generación: una clave mal formada no se
// nota hasta que un workspace intenta usar su propia API key.
import { loadEncryptionKey } from './lib/crypto.js';

try {
  loadEncryptionKey();
} catch (err: any) {
  console.error(`\n[MyVoice] ENCRYPTION_KEY inválida: ${err.message}\n`);
  process.exit(1);
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

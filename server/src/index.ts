
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import routes from './routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'My Voice API' });
});

// Mount Routes
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`My Voice API running on port ${PORT}`);
});

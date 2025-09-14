import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import prdRoutes from './routes/prd.js';
import snapshotRoutes from './routes/snapshot.js';
import integrationRoutes from './routes/integration.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 4000;

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use('/api/prds', prdRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/sync', syncRoutes);

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName: uri.split('/').pop() });
    console.log('Mongo connected');
  } catch (err) {
    console.error('Mongo connect failed', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on :${PORT}`);
  });
}

start().catch((e) => console.error(e));

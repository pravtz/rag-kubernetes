import './config/config'; // fail-fast: validates required env vars on startup
import express from 'express';
import cors from 'cors';
import { config } from './config/config';
import ragRoutes from './routes/ragRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

app.use('/api/rag', ragRoutes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
});

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/config';
import { swaggerDocument } from './config/swagger';
import { ragRoutes, healthRoutes } from './modules/rag';
import {
  errorHandler,
  notFoundHandler,
} from './shared/infrastructure/middleware/errorMiddleware';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/rag', healthRoutes);
app.use('/api/rag', ragRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };

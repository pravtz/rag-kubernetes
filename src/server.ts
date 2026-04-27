import './config/config'; // fail-fast: validates required env vars on startup
import { config } from './config/config';
import { app } from './app';

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
});

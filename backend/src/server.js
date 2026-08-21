import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logger.js';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`Credit Intelligence API listening on :${env.port} (${env.nodeEnv}, pipeline mode: ${env.pipelineMode})`);
});

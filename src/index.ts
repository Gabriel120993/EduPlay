import { createApp } from './app';
import { env } from './config/env';
import { initSentry } from './lib/sentry';

initSentry();

const app = createApp();

app.listen(env.port, () => {
  console.info(`Servidor en http://localhost:${env.port} (${env.nodeEnv})`);
});

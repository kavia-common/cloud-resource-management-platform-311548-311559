import { createApp } from './app';
import { env } from './utils/env';
import { initDb } from './db/pool';

// PUBLIC_INTERFACE
export async function startServer(): Promise<void> {
  /** Initialize dependencies and start the HTTP server. */
  await initDb();

  const app = createApp();

  const server = app.listen(env.port, env.host, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running at http://${env.host}:${env.port}`);
  });

  process.on('SIGTERM', () => {
    // eslint-disable-next-line no-console
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

void startServer();

import { onShutdown } from 'node-graceful-shutdown';
import * as winston from 'winston';

import { DashboardServer } from './lib/interface/http/server';
import { MemoryConnectionRepository } from './lib/repo/connection/memory';
import { MemoryDashboardRepository } from './lib/repo/dashboard/memory';

const missingEnvVariables = ['HOST', 'PORT'].filter((v) => !process.env[v]);

if (missingEnvVariables.length)
  throw new Error(`Missing env variables ${missingEnvVariables.join(', ')}`);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: winston.format.json(),
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'combined.log',
      format: winston.format.json(),
    })
  );
}

const server = new DashboardServer(
  process.env.HOST!,
  parseInt(process.env.PORT!),
  new MemoryDashboardRepository(8),
  new MemoryConnectionRepository(),
  logger
);

server.start();

onShutdown('server', async () => {
  await server.close();
});

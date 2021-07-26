import AWS from 'aws-sdk';
import { onShutdown } from 'node-graceful-shutdown';
import * as winston from 'winston';

import { DashboardServer } from './lib/interface/http/server';
import { MemoryConnectionRepository } from './lib/repo/connection/memory';
import { DashboardRepository } from './lib/repo/dashboard';
import { DynamoDBDashboardRepository } from './lib/repo/dashboard/dynamodb';
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

let dashboardRepository: DashboardRepository = new MemoryDashboardRepository(8);

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

  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const tableName = process.env.TABLE_NAME;

  if (awsAccessKeyId && awsSecretAccessKey && tableName) {
    AWS.config.update(
      {
        region: 'eu-central-1',
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
      true
    );

    dashboardRepository = new DynamoDBDashboardRepository(
      tableName,
      8,
      new AWS.DynamoDB(),
      new AWS.DynamoDB.DocumentClient()
    );
    logger.info('Using DynamoDBDashboardRepository');
  } else {
    logger.info('Using MemoryDashboardRepository');
  }
}

const server = new DashboardServer(
  process.env.HOST!,
  parseInt(process.env.PORT!),
  dashboardRepository,
  new MemoryConnectionRepository(),
  logger
);

server.start();

onShutdown('server', async () => {
  await server.close();
});

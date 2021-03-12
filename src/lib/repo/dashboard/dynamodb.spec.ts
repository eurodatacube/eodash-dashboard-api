import test from 'ava';
import AWS from 'aws-sdk';
import DynamoDbLocal from 'dynamodb-local';
import getPort from 'get-port';
import isDocker from 'is-docker';

import { DynamoDBDashboardRepository } from './dynamodb';
import dashboardRepositoryTestFactory from './index.factory.spec';
let port = -1;

dashboardRepositoryTestFactory(
  test,
  async () => {
    port = await getPort();

    await DynamoDbLocal.launch(port, null, ['-sharedDb']);

    AWS.config.update(
      {
        region: 'local',
        endpoint: `http://${
          !isDocker() ? 'localhost' : 'host.docker.internal'
        }:${port}`,
        accessKeyId: 'accessKeyId',
        secretAccessKey: 'secretAccessKey',
      },
      true
    );

    return new DynamoDBDashboardRepository(
      'dashboard',
      8,
      new AWS.DynamoDB(),
      new AWS.DynamoDB.DocumentClient()
    );
  },
  async () => {
    await DynamoDbLocal.stop(port);
  }
);

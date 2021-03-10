import { randomBytes } from 'crypto';

import { DynamoDB } from 'aws-sdk';
import EventEmitter from 'eventemitter3';

import { Dashboard } from '../../domain/dashboard';
import { Feature } from '../../domain/feature';
import { DashboardNoKeys } from '../../dto/dashboard-no-keys';
import { dashboardToNoKeysMapper } from '../../mapper/dashboardToNoKeys';
import { noKeysToDashboardMapper } from '../../mapper/noKeysToDashboard';

import { DashboardRepository } from '.';

export class DynamoDBDashboardRepository
  extends EventEmitter
  implements DashboardRepository {
  constructor(
    public readonly tableName: string,
    public readonly keySize: number,
    private readonly db: DynamoDB,
    private readonly doc: DynamoDB.DocumentClient
  ) {
    super();
  }

  // TODO: Add pagination. If we have more than 100 DynamoDB tables this might not work
  connect(): Promise<void> {
    return this.db
      .listTables({})
      .promise()
      .then((data) => {
        // Check if table is already created
        const exists =
          data.TableNames!.filter((name) => name === this.tableName).length > 0;

        if (exists) return;
        else
          return this.db
            .createTable({
              TableName: this.tableName,
              KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
              AttributeDefinitions: [
                { AttributeName: 'id', AttributeType: 'S' },
              ],
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
              },
            })
            .promise()
            .then(() => {});
      });
  }

  async add(title: string, features: Feature[]): Promise<Dashboard> {
    const id = randomBytes(this.keySize).toString('hex');
    const editKey = randomBytes(this.keySize).toString('hex');

    const dashboard = {
      id,
      editKey,
      title,
      features,
    };

    await this.doc
      .put({
        TableName: this.tableName,
        Item: dashboard,
      })
      .promise();

    return dashboard;
  }

  async get(id: string, editKey?: string): Promise<DashboardNoKeys | null> {
    return new Promise((resolve, reject) => {
      this.doc.get(
        {
          TableName: this.tableName,
          Key: {
            id,
          },
        },
        (err, data) => {
          if (err) reject(err);
          else {
            if (!data?.Item?.id || (editKey && editKey !== data.Item!.editKey))
              return resolve(null);

            resolve(dashboardToNoKeysMapper(data.Item as Dashboard));
          }
        }
      );
    });
  }

  edit(
    id: string,
    fn: (dashboard: DashboardNoKeys) => Promise<DashboardNoKeys>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.doc.get(
        {
          TableName: this.tableName,
          Key: {
            id,
          },
        },
        async (err, data) => {
          if (err) reject(err);
          else {
            if (!data?.Item?.id) return resolve();

            const dashboard = data.Item as Dashboard;
            const newDashboard = noKeysToDashboardMapper(
              await fn(dashboardToNoKeysMapper(dashboard)),
              dashboard.id,
              dashboard.editKey
            );

            this.doc
              .update({
                TableName: this.tableName,
                Key: {
                  id,
                },
                UpdateExpression: 'set title = :t, features=:f',
                ExpressionAttributeValues: {
                  ':t': newDashboard.title,
                  ':f': newDashboard.features,
                },
              })
              .promise()
              .then(() => {
                this.emit('edit', id, dashboardToNoKeysMapper(newDashboard));
                resolve();
              })
              .catch(reject);
          }
        }
      );
    });
  }

  async close() {}
}

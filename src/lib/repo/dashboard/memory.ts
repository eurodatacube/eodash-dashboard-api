import { randomBytes } from 'crypto';

import EventEmitter from 'eventemitter3';

import { Dashboard } from '../../domain/dashboard';
import { Feature } from '../../domain/feature';
import { DashboardNoKeys } from '../../dto/dashboard-no-keys';
import { dashboardToNoKeysMapper } from '../../mapper/dashboardToNoKeys';
import { noKeysToDashboardMapper } from '../../mapper/noKeysToDashboard';

import { DashboardRepository } from '.';

export class MemoryDashboardRepository
  extends EventEmitter
  implements DashboardRepository {
  constructor(public readonly keySize: number) {
    super();
  }

  private readonly dashboards: Map<string, Dashboard> = new Map();

  async connect() {}

  async add(title: string, features: Feature[]): Promise<Dashboard> {
    const id = randomBytes(this.keySize).toString('hex');
    const editKey = randomBytes(this.keySize).toString('hex');

    const dashboard: Dashboard = {
      title,
      features,
      id,
      editKey,
    };

    this.dashboards.set(id, dashboard);

    return dashboard;
  }

  async get(id: string, editKey?: string) {
    const dashboard = this.dashboards.get(id);

    if (!dashboard) return null;

    if (editKey && dashboard.editKey !== editKey) return null;

    return dashboardToNoKeysMapper(dashboard);
  }

  async edit(
    id: string,
    fn: (dashboard: DashboardNoKeys) => Promise<DashboardNoKeys>
  ) {
    const dashboard = this.dashboards.get(id);

    if (!dashboard) return;

    if (dashboard) {
      const updatedDashboard = noKeysToDashboardMapper(
        await fn(dashboardToNoKeysMapper(dashboard)),
        dashboard.id,
        dashboard.editKey
      );
      this.dashboards.set(id, updatedDashboard);
      this.emit('edit', id, dashboardToNoKeysMapper(updatedDashboard));
    }
  }

  async close() {}
}

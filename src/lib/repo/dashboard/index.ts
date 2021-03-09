import EventEmitter from 'eventemitter3';

import { Dashboard } from '../../domain/dashboard';
import { Feature } from '../../domain/feature';
import { DashboardNoKeys } from '../../dto/dashboard-no-keys';

export interface DashboardRepository extends EventEmitter {
  connect(): Promise<void>;
  add(title: string, features: Feature[]): Promise<Dashboard>;
  get(id: string, editKey?: string): Promise<DashboardNoKeys | null>;
  /**
   * @fires DashboardRepository#edit
   */
  edit(
    id: string,
    fn: (dashboard: DashboardNoKeys) => Promise<DashboardNoKeys>
  ): Promise<void>;
  close(): Promise<void>;
}

/**
 * A dashboard has been edited.
 * @event DashboardRepository#edit
 * @property {DashboardNoKeys} dashboard - The updated dashboard
 */

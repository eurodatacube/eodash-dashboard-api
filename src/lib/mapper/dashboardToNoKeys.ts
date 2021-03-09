import { Dashboard } from '../domain/dashboard';
import { DashboardNoKeys } from '../dto/dashboard-no-keys';

export function dashboardToNoKeysMapper(dashboard: Dashboard): DashboardNoKeys {
  const { id, editKey, ...dto } = dashboard;

  return dto;
}

import { Dashboard } from '../domain/dashboard';
import { DashboardNoKeys } from '../dto/dashboard-no-keys';

export function noKeysToDashboardMapper(
  dashboard: DashboardNoKeys,
  id: string,
  editKey: string
): Dashboard {
  return {
    ...dashboard,
    id,
    editKey,
  };
}

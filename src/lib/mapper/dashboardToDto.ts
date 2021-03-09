import { Dashboard } from '../domain/dashboard';
import { DashboardDto } from '../dto/dashboard';

export function dashboardToDtoMapper(dashboard: Dashboard): DashboardDto {
  const { id, editKey, ...dto } = dashboard;

  return dto;
}

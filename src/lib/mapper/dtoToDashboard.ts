import { Dashboard } from '../domain/dashboard';
import { DashboardDto } from '../dto/dashboard';

export function dtoToDashboardMapper(
  dashboard: DashboardDto,
  id: string,
  editKey: string
): Dashboard {
  return {
    ...dashboard,
    id,
    editKey,
  };
}

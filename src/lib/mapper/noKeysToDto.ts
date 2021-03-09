import { DashboardDto } from '../dto/dashboard';
import { DashboardNoKeys } from '../dto/dashboard-no-keys';

export function noKeysToDtoMapper(dto: DashboardNoKeys): DashboardDto {
  return dto;
}

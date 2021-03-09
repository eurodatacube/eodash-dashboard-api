import { DashboardDto } from '../dto/dashboard';
import { DashboardNoKeys } from '../dto/dashboard-no-keys';

export function dtoToNoKeysMapper(dto: DashboardDto): DashboardNoKeys {
  return dto;
}

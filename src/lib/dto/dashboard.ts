import { Dashboard } from '../domain/dashboard';

export type DashboardDto = Omit<Dashboard, 'id' | 'editKey'>;

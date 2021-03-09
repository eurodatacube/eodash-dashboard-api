import { Dashboard } from '../domain/dashboard';

export type DashboardNoKeys = Omit<Dashboard, 'id' | 'editKey'>;

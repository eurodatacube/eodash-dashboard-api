import { Feature } from '../domain/feature';

export type DashboardDto = {
  title: string;
  features: Feature[];
};

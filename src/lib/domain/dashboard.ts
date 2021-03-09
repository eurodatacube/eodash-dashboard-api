import { Feature } from './feature';

export interface Dashboard {
  id: string;
  title: string;
  features: Feature[];
  editKey: string;
}

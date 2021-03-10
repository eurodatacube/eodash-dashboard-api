import test from 'ava';

import dashboardRepositoryTestFactory from './index.factory.spec';
import { MemoryDashboardRepository } from './memory';

dashboardRepositoryTestFactory(
  test,
  async () => new MemoryDashboardRepository(8)
);

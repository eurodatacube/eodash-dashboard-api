import test from 'ava';

import dashboardRepositoryTestFactory from './index.factory.spec';
import { MemoryDashboardRepository } from './memory';

dashboardRepositoryTestFactory(test, () => new MemoryDashboardRepository(8));

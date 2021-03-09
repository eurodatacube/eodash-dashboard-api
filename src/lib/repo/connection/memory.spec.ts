import test from 'ava';
import connectionRepositoryTestFactory from './index.factory.spec';
import { MemoryConnectionRepository } from './memory';

connectionRepositoryTestFactory(test, () => new MemoryConnectionRepository())
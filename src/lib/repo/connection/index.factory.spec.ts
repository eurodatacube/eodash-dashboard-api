import { TestInterface } from 'ava';

import { ConnectionRepository } from '.';

export default function connectionRepositoryTestFactory<
  CR extends ConnectionRepository
>(anyTest: TestInterface, connectionRepositoryFactory: () => CR) {
  type Context = {
    repo: CR;
  };

  const test = anyTest as TestInterface<Context>;

  test.beforeEach(async (t) => {
    t.context.repo = connectionRepositoryFactory();
    await t.context.repo.connect();
  });

  test('Should be able to add a connection to a new group', async t => {
    const groupId = 'abc';

    await t.notThrowsAsync(async () => {
      await t.context.repo.add(groupId, 'a', false);
    })
  });

  test('Should be able to add a connection to an existing group', async t => {
    const groupId = 'abc';

    await t.notThrowsAsync(async () => {
      await t.context.repo.add(groupId, 'a', false);
      await t.context.repo.add(groupId, 'b', false);
    })
  });

  test('Should be able to get group of connection', async t => {
    const groupId = 'abc';
    const connectionId = 'a'

    await t.context.repo.add(groupId, connectionId, false);

    t.is(await t.context.repo.getGroupOfConnection(connectionId), groupId);
  });

  test('Should be able to get connections of group', async t => {
    const groupId = 'abc';
    const connectionsIds = [{id: 'a', hasPrivilege: false}, {id: 'b', hasPrivilege: true}]

    await t.context.repo.add(groupId, connectionsIds[0].id, connectionsIds[0].hasPrivilege);
    await t.context.repo.add(groupId, connectionsIds[1].id, connectionsIds[1].hasPrivilege);
    await t.context.repo.add('_', '_', false);

    t.deepEqual(await t.context.repo.getConnectionsOfGroup(groupId), connectionsIds);
  });

  test('Should be able to remove a connection from a group', async t => {
    const groupId = 'abc';
    const connectionId = 'a'

    await t.context.repo.add(groupId, connectionId, false);

    await t.context.repo.remove(connectionId);

    t.deepEqual(await t.context.repo.getConnectionsOfGroup(groupId), []);
  });

  test('Should not throw when attempting to remove a non-connected connection', async t => {
    const connectionId = 'a'

    await t.notThrowsAsync(async () => {
      await t.context.repo.remove(connectionId);
    })
  });

  test('Should be able to check whether a connection exists', async t => {
    const connectionId = 'a'
    const groupId = 'abc';

    await t.context.repo.add(groupId, connectionId, false);

    t.true(await t.context.repo.has(connectionId));
    t.false(await t.context.repo.has('_'));
  });

  test('Should be able to check whether a connection has editing privilege', async t => {
    const groupId = 'abc';
    const connectionsIds = [{id: 'a', hasPrivilege: false}, {id: 'b', hasPrivilege: true}]

    await t.context.repo.add(groupId, connectionsIds[0].id, connectionsIds[0].hasPrivilege);
    await t.context.repo.add(groupId, connectionsIds[1].id, connectionsIds[1].hasPrivilege);

    t.is(await t.context.repo.hasPrivilege(connectionsIds[0].id), connectionsIds[0].hasPrivilege);
    t.is(await t.context.repo.hasPrivilege(connectionsIds[1].id), connectionsIds[1].hasPrivilege);
    t.false(await t.context.repo.hasPrivilege('_'));
  });

  test.afterEach.always((t) => {
    t.context.repo.close();
  });
}

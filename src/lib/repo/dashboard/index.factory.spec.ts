import { TestInterface } from 'ava';

import { Dashboard } from '../../domain/dashboard';
import { Feature } from '../../domain/feature';
import { DashboardNoKeys } from '../../dto/dashboard-no-keys';

import { DashboardRepository } from '.';

export default function dashboardRepositoryTestFactory<
  DR extends DashboardRepository
>(
  anyTest: TestInterface,
  dashboardRepositoryFactory: () => Promise<DR>,
  cleanupFunction?: () => Promise<void>
) {
  type Context = {
    repo: DR;
  };

  const test = anyTest as TestInterface<Context>;

  test.beforeEach(async (t) => {
    t.context.repo = await dashboardRepositoryFactory();
    await t.context.repo.connect();
  });

  test('Should be able to add a dashboard and create an id and editKey', async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const dashboard = await t.context.repo.add(title, features);

    t.is(dashboard.title, title);
    t.deepEqual(dashboard.features, features);
    t.is(typeof dashboard.id, 'string');
    t.is(typeof dashboard.editKey, 'string');
  });

  test('Should be able to get a dashboard', async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const { id } = await t.context.repo.add(title, features);

    const dashboard = await t.context.repo.get(id);

    t.truthy(dashboard);

    t.is(dashboard!.title, title);
    t.deepEqual(dashboard!.features, features);
    t.is(typeof (dashboard! as any).id, 'undefined');
    t.is(typeof (dashboard! as any).editKey, 'undefined');
  });

  test('Should be able to get a dashboard with editKey', async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const { id, editKey } = await t.context.repo.add(title, features);

    const dashboard = await t.context.repo.get(id, editKey);

    t.truthy(dashboard);

    t.is(dashboard!.title, title);
    t.deepEqual(dashboard!.features, features);
    t.is(typeof (dashboard! as any).id, 'undefined');
    t.is(typeof (dashboard! as any).editKey, 'undefined');
  });

  test('Should not be able to get a non-existent dashboard', async (t) => {
    const dashboard = await t.context.repo.get('_');

    t.is(dashboard, null);
  });

  test('Should not be able to get a dashboard with an incorrect editKey', async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const { id } = await t.context.repo.add(title, features);

    const dashboard = await t.context.repo.get(id, '_');

    t.is(dashboard, null);
  });

  test("Should be able to edit a dashboard's title", async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const { id } = await t.context.repo.add(title, features);

    const newTitle = 'My new dashboard';

    await t.context.repo.edit(
      id,
      async (dashboard) => ((dashboard.title = newTitle), dashboard)
    );

    const newDashboard = await t.context.repo.get(id);

    t.is(newDashboard!.title, newTitle);
  });

  test("Should be able to edit a dashboard's features", async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const { id } = await t.context.repo.add(title, features);

    const newFeatures: Feature[] = [
      { id: '1', width: 2 },
      { id: '2', width: 4 },
    ];

    await t.context.repo.edit(
      id,
      async (dashboard) => ((dashboard.features = newFeatures), dashboard)
    );

    const newDashboard = await t.context.repo.get(id);

    t.deepEqual(newDashboard!.features, newFeatures);
  });

  test("Should be able to edit a dashboard's marketing info", async (t) => {
    const title = 'My dashboard';
    const features: Feature[] = [];

    const { id } = await t.context.repo.add(title, features);

    const marketingInfo: Dashboard['marketingInfo'] = {
      email: 'a@b.co',
      interests: [],
      consent: true,
    };

    await t.context.repo.edit(
      id,
      async (dashboard) => (
        (dashboard.marketingInfo = marketingInfo), dashboard
      )
    );

    const newDashboard = await t.context.repo.get(id);

    t.deepEqual(newDashboard!.marketingInfo, marketingInfo);
  });

  test.cb('Should emit edit event when an edit happens', (t) => {
    t.plan(2);
    t.timeout(10000);

    const title = 'My dashboard';
    const features: Feature[] = [];

    t.context.repo.add(title, features).then(({ id }) => {
      const newTitle = 'My new dashboard';

      t.context.repo.on('edit', (newId: string, dashboard: DashboardNoKeys) => {
        t.is(newId, id);
        t.is(dashboard.title, newTitle);
        t.end();
      });

      t.context.repo.edit(
        id,
        async (dashboard) => ((dashboard.title = newTitle), dashboard)
      );
    });
  });

  test('Should not be able to edit a non-existent dashboard', async (t) => {
    const id = '_';
    const newTitle = 'My new dashboard';

    await t.context.repo.edit(
      id,
      async (dashboard) => ((dashboard.title = newTitle), dashboard)
    );

    const newDashboard = await t.context.repo.get(id);

    t.is(newDashboard, null);
  });

  test.afterEach.always((t) => {
    t.context.repo.close();
  });

  if (cleanupFunction)
    test.after.always(async () => {
      await cleanupFunction();
    });
}

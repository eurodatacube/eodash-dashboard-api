import anyTest, { CbMacro, TestInterface } from 'ava';
import getPort from 'get-port';
import { io, Socket } from 'socket.io-client';
import * as winston from 'winston';

import { Dashboard } from '../../domain/dashboard';
import {
  FEATURE_MAX_WIDTH,
  FEATURE_MIN_WIDTH,
  FEATURE_WIDTH_STEP,
} from '../../domain/feature';
import { DashboardDto } from '../../dto/dashboard';
import { FeatureNoWidth } from '../../dto/feature-no-width';
import { MemoryConnectionRepository } from '../../repo/connection/memory';
import { MemoryDashboardRepository } from '../../repo/dashboard/memory';

import { DashboardServer, ErrorType } from './server';

type ErrorOr<T> = T & {
  error: boolean | undefined;
};

type Context = {
  server: DashboardServer<
    MemoryDashboardRepository,
    MemoryConnectionRepository
  >;
  clients: [Socket, Socket];
};

const test = anyTest as TestInterface<Context>;

test.beforeEach(async (t) => {
  const host = 'localhost';
  const port = await getPort({ host });

  t.context.server = new DashboardServer(
    host,
    port,
    new MemoryDashboardRepository(8),
    new MemoryConnectionRepository(),
    winston.createLogger({
      level: 'debug',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
      silent: true,
    })
  );

  await t.context.server.start();

  const client = (): Promise<Socket> => {
    const socket = io(`http://${host}:${port}`, { autoConnect: false });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);

      socket.connect();
    });
  };

  t.context.clients = await Promise.all([client(), client()]);
});

test.cb('Should be able to create a dashboard', (t): void => {
  t.plan(5);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    (dashboard: ErrorOr<Dashboard>) => {
      t.is(dashboard.error, undefined);

      t.is(dashboard.title, title);
      t.is(typeof dashboard.id, 'string');
      t.is(typeof dashboard.editKey, 'string');
      t.deepEqual(dashboard.features, features);
      t.end();
    }
  );
});

test.cb('Should be able to listen to a dashboard', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    (dashboard: ErrorOr<Dashboard>) => {
      t.is(dashboard.error, undefined);

      t.context.clients[1].emit(
        'listen',
        {
          id: dashboard.id,
        },
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb(
  'Should not be able to listen to a non-existent dashboard',
  (t): void => {
    t.plan(2);

    t.context.clients[0].emit('listen', { id: '_' }, (response: any) => {
      t.true(response?.error);
      t.is(response.type, ErrorType.Execution);
      t.end();
    });
  }
);

test.cb(
  'Should be able to listen to a dashboard with editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
            editKey: dashboard.editKey,
          },
          (response: any) => {
            t.is(response?.error, undefined);
            t.end();
          }
        );
      }
    );
  }
);

test.cb(
  'Should not be able to listen to a dashboard with an incorrect editKey',
  (t): void => {
    t.plan(2);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: ErrorOr<Dashboard>) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
            editKey: '_',
          },
          (response: any) => {
            t.true(response?.error);
            t.is(response.type, ErrorType.Execution);
            t.end();
          }
        );
      }
    );
  }
);

test.cb(
  "Should be able to change a dashboard's title with editing privilege",
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
            editKey: dashboard.editKey,
          },
          () => {
            t.context.clients[1].emit(
              'change-title',
              'New title',
              (response: any) => {
                t.is(response?.error, undefined);
                t.end();
              }
            );
          }
        );
      }
    );
  }
);

test.cb(
  'Should be able to add a feature to a dashboard with editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
            editKey: dashboard.editKey,
          },
          () => {
            t.context.clients[1].emit(
              'add-feature',
              {
                id: '0',
                title: 'title',
              },
              (response: any) => {
                t.is(response?.error, undefined);
                t.end();
              }
            );
          }
        );
      }
    );
  }
);

test.cb(
  'Should be able to remove a feature from a dashboard with editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        const featureId = '0';
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
            editKey: dashboard.editKey,
          },
          () => {
            t.context.clients[1].emit(
              'add-feature',
              {
                id: featureId,
                title: 'title',
              },
              () => {
                t.context.clients[1].emit(
                  'remove-feature',
                  featureId,
                  (response: any) => {
                    t.is(response?.error, undefined);
                    t.end();
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);

test.cb('Should not be able to remove non-existent feature', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [
    { id: '1', title: 'title' },
    { id: '0', title: 'title' },
  ];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    (dashboard: Dashboard) => {
      t.context.clients[1].emit(
        'listen',
        {
          id: dashboard.id,
          editKey: dashboard.editKey,
        },
        () => {
          t.context.clients[1].emit('remove-feature', '-1', (response: any) => {
            t.true(response?.error);
            t.is(response.type, ErrorType.Execution);
            t.end();
          });
        }
      );
    }
  );
});

test.cb(
  "Should be able to change a dashboard's title as creator",
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        t.context.clients[0].emit(
          'change-title',
          'New title',
          (response: any) => {
            t.is(response?.error, undefined);
            t.end();
          }
        );
      }
    );
  }
);

test.cb(
  'Should be able to add a feature to a dashboard as creator',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        t.context.clients[0].emit(
          'add-feature',
          {
            id: '0',
            title: 'title',
          },
          (response: any) => {
            t.is(response?.error, undefined);
            t.end();
          }
        );
      }
    );
  }
);

test.cb(
  'Should be able to remove a feature from a dashboard as creator',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        const featureId = '0';

        t.context.clients[0].emit(
          'add-feature',
          {
            id: featureId,
            title: 'title',
          },
          () => {
            t.context.clients[0].emit(
              'remove-feature',
              featureId,
              (response: any) => {
                t.is(response?.error, undefined);
                t.end();
              }
            );
          }
        );
      }
    );
  }
);

test.cb(
  "Should not be able to change a dashboard's title without editing privilege",
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
          },
          () => {
            t.context.clients[1].emit(
              'change-title',
              'New title',
              (response: any) => {
                t.true(response?.error);
                t.end();
              }
            );
          }
        );
      }
    );
  }
);

test.cb(
  'Should not be able to add a feature to a dashboard without editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
          },
          () => {
            t.context.clients[1].emit(
              'add-feature',
              {
                id: '0',
              },
              (response: any) => {
                t.true(response?.error);
                t.end();
              }
            );
          }
        );
      }
    );
  }
);

test.cb(
  'Should not be able to remove a feature from a dashboard without editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        const featureId = 0;
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
          },
          () => {
            t.context.clients[0].emit(
              'add-feature',
              {
                id: featureId,
                title: 'title',
              },
              () => {
                t.context.clients[1].emit(
                  'remove-feature',
                  featureId,
                  (response: any) => {
                    t.true(response?.error);
                    t.end();
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);

test.cb('Should emit correct edit event when title changes', (t): void => {
  t.timeout(5000);
  t.plan(1);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    (dashboard: Dashboard) => {
      t.context.clients[1].emit(
        'listen',
        {
          id: dashboard.id,
        },
        () => {
          const newTitle = 'My new dashboard';
          t.context.clients[1].on('edit', (dashboard: DashboardDto) => {
            t.is(dashboard.title, newTitle);
            t.end();
          });
          t.context.clients[0].emit('change-title', newTitle);
        }
      );
    }
  );
});

test.cb('Should emit correct edit event when a feature is added', (t): void => {
  t.timeout(2000);
  t.plan(3);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    (dashboard: Dashboard) => {
      t.context.clients[1].emit(
        'listen',
        {
          id: dashboard.id,
        },
        () => {
          const newFeature = { id: '0', title: 'title' };
          t.context.clients[0].emit('add-feature', newFeature, () => {
            t.context.clients[1].on('edit', (dashboard: DashboardDto) => {
              t.is(dashboard.features.length, 1);
              t.is(dashboard.features[0].id, newFeature.id);
              t.true(
                Object.prototype.hasOwnProperty.call(
                  dashboard.features[0],
                  'width'
                )
              );
              t.end();
            });
          });
        }
      );
    }
  );
});

test.cb(
  'Should emit correct edit event when a feature is removed',
  (t): void => {
    t.timeout(2000);
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit(
          'listen',
          {
            id: dashboard.id,
          },
          () => {
            const newFeature = { id: '0', title: 'title' };
            t.context.clients[0].emit('add-feature', newFeature, () => {
              t.context.clients[0].emit('remove-feature', newFeature.id, () => {
                t.context.clients[1].on('edit', (dashboard: DashboardDto) => {
                  t.is(dashboard.features.length, 0);
                  t.end();
                });
              });
            });
          }
        );
      }
    );
  }
);

const validationMacro: CbMacro<[string], Context> = (t, callName) => {
  t.plan(3);
  t.context.clients[0].emit(callName, { __fail__: true }, (response: any) => {
    t.true(response?.error);
    t.is(response.type, ErrorType.Validation);
    t.true(response.details.length > 0);
    t.end();
  });
};

validationMacro.title = (_providedTitle, callName) =>
  `Should return an error for invalid ${callName} events`;

test.cb(validationMacro, 'create');
test.cb(validationMacro, 'listen');
test.cb(validationMacro, 'change-title');
test.cb(validationMacro, 'add-feature');
test.cb(validationMacro, 'remove-feature');
test.cb(validationMacro, 'feature-move-up');
test.cb(validationMacro, 'feature-move-down');
test.cb(validationMacro, 'feature-resize-shrink');
test.cb(validationMacro, 'feature-resize-expand');

test.cb(
  'Should be able to create a new dashboard while already listening to one',
  (t) => {
    t.plan(1);

    t.context.clients[0].emit(
      'create',
      { title: 'First dashboard', features: [] },
      () => {
        t.context.clients[0].emit(
          'create',
          { title: 'Second dashboard', features: [] },
          (response: any) => {
            t.is(response?.error, undefined);
            t.end();
          }
        );
      }
    );
  }
);

test.cb(
  'Should be able to listen to a new dashboard while already listening to one',
  (t) => {
    t.plan(1);

    t.context.clients[0].emit(
      'create',
      { title: 'First dashboard', features: [] },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit('listen', { id: dashboard.id }, () => {
          t.context.clients[0].emit(
            'create',
            { title: 'Second dashboard', features: [] },
            (dashboard: Dashboard) => {
              t.context.clients[1].emit(
                'listen',
                { id: dashboard.id },
                (response: any) => {
                  t.is(response?.error, undefined);
                  t.end();
                }
              );
            }
          );
        });
      }
    );
  }
);

test.cb('Should be able to move feature up', (t): void => {
  t.plan(1);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [
    { id: '1', title: 'title' },
    { id: '0', title: 'title' },
  ];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].emit('feature-move-up', '0', (response: any) => {
        t.is(response?.error, undefined);
        t.end();
      });
    }
  );
});

test.cb(
  'Should not be able to move feature up without editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [
      { id: '1', title: 'title' },
      { id: '0', title: 'title' },
    ];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit('listen', { id: dashboard.id }, () => {
          t.context.clients[1].emit('feature-move-up', '0', (response: any) => {
            t.true(response?.error);
            t.end();
          });
        });
      }
    );
  }
);

test.cb(
  'Should not do anything when attempting to move feature up if it is the first feature',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [
      { id: '1', title: 'title' },
      { id: '0', title: 'title' },
    ];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        t.context.clients[0].emit('feature-move-up', '1', (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        });
      }
    );
  }
);

test.cb('Should not be able to move non-existent feature up', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [
    { id: '1', title: 'title' },
    { id: '0', title: 'title' },
  ];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].emit('feature-move-up', '-1', (response: any) => {
        t.true(response?.error);
        t.is(response.type, ErrorType.Execution);
        t.end();
      });
    }
  );
});

test.cb('Should be able to move feature down', (t): void => {
  t.plan(1);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [
    { id: '1', title: 'title' },
    { id: '0', title: 'title' },
  ];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].emit('feature-move-down', '1', (response: any) => {
        t.is(response?.error, undefined);
        t.end();
      });
    }
  );
});

test.cb(
  'Should not be able to move feature down without editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [
      { id: '1', title: 'title' },
      { id: '0', title: 'title' },
    ];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit('listen', { id: dashboard.id }, () => {
          t.context.clients[1].emit(
            'feature-move-down',
            '1',
            (response: any) => {
              t.true(response?.error);
              t.end();
            }
          );
        });
      }
    );
  }
);

test.cb(
  'Should not do anything when attempting to move feature down if it is the last feature',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [
      { id: '1', title: 'title' },
      { id: '0', title: 'title' },
    ];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        t.context.clients[0].emit('feature-move-down', '0', (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        });
      }
    );
  }
);

test.cb('Should not be able to move non-existent feature down', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [
    { id: '1', title: 'title' },
    { id: '0', title: 'title' },
  ];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].emit('feature-move-down', '-1', (response: any) => {
        t.true(response?.error);
        t.is(response.type, ErrorType.Execution);
        t.end();
      });
    }
  );
});

test.cb('Should be able to shrink a feature', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    ({ features }: Dashboard) => {
      t.context.clients[0].on('edit', (newDashboard: Dashboard) => {
        t.is(
          features[0].width,
          features[0].width !== FEATURE_MIN_WIDTH
            ? newDashboard.features[0].width + FEATURE_WIDTH_STEP
            : newDashboard.features[0].width
        );
      });
      t.context.clients[0].emit(
        'feature-resize-shrink',
        '0',
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb('Should be able to expand a feature', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    ({ features }: Dashboard) => {
      t.context.clients[0].on('edit', (newDashboard: Dashboard) => {
        t.is(
          features[0].width,
          features[0].width !== FEATURE_MAX_WIDTH
            ? newDashboard.features[0].width - FEATURE_WIDTH_STEP
            : newDashboard.features[0].width
        );
      });
      t.context.clients[0].emit(
        'feature-resize-expand',
        '0',
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb(
  'Should not be able to shrink a feature without editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [{ id: '1', title: 'title' }];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit('listen', { id: dashboard.id }, () => {
          t.context.clients[1].emit(
            'feature-resize-shrink',
            1,
            (response: any) => {
              t.true(response?.error);
              t.end();
            }
          );
        });
      }
    );
  }
);

test.cb(
  'Should not be able to expand a feature without editing privilege',
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [{ id: '1', title: 'title' }];

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      (dashboard: Dashboard) => {
        t.context.clients[1].emit('listen', { id: dashboard.id }, () => {
          t.context.clients[1].emit(
            'feature-resize-expand',
            1,
            (response: any) => {
              t.true(response?.error);
              t.end();
            }
          );
        });
      }
    );
  }
);

test.cb('Should not be able to shrink a non-existent feature', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].emit(
        'feature-resize-shrink',
        '-1',
        (response: any) => {
          t.true(response?.error);
          t.is(response.type, ErrorType.Execution);
          t.end();
        }
      );
    }
  );
});

test.cb('Should not be able to expand a non-existent feature', (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].emit(
        'feature-resize-expand',
        '-1',
        (response: any) => {
          t.true(response?.error);
          t.is(response.type, ErrorType.Execution);
          t.end();
        }
      );
    }
  );
});

test.cb('Should be able to add marketing info to dashboard', (t) => {
  t.plan(2);
  t.context.clients[0].emit(
    'create',
    { title: 'My dashboard', features: [] },
    () => {
      const marketingInfo = {
        interests: ['whatever'],
      };

      t.context.clients[0].on('edit', (dto: DashboardDto) => {
        t.deepEqual(dto.marketingInfo, marketingInfo);
      });

      t.context.clients[0].emit(
        'add-marketing-info',
        marketingInfo,
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb(
  'Should not be able to add marketing info to dashboard without editing privilege',
  (t) => {
    t.plan(1);
    t.context.clients[0].emit(
      'create',
      { title: 'My dashboard', features: [] },
      ({ id }: any) => {
        t.context.clients[1].emit('listen', { id }, () => {
          t.context.clients[1].emit(
            'add-marketing-info',
            { interests: [] },
            (response: any) => {
              t.is(response?.error, true);
              t.end();
            }
          );
        });
      }
    );
  }
);

test.cb('Should do nothing when re-adding marketing info to dashboard', (t) => {
  t.plan(2);

  t.context.clients[0].emit(
    'create',
    { title: 'My dashboard', features: [] },
    () => {
      const originalMarketingInfo = {
        interests: ['whatever'],
      };

      // This gets called twice ;)
      t.context.clients[0].on('edit', (dto: DashboardDto) => {
        t.deepEqual(dto.marketingInfo, originalMarketingInfo);
      });

      t.context.clients[0].emit(
        'add-marketing-info',
        originalMarketingInfo,
        () => {
          t.context.clients[0].emit(
            'add-marketing-info',
            {
              interests: ['whatever'],
            },
            () => {
              t.end();
            }
          );
        }
      );
    }
  );
});

test.cb("Should be able to change feature's title", (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

  const newTitle = 'new title';

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].on('edit', (newDashboard: Dashboard) => {
        t.is(newDashboard.features[0].title, newTitle);
      });
      t.context.clients[0].emit(
        'feature-change-title',
        {
          id: features[0].id,
          newTitle,
        },
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb(
  "Should not be able to change feature's title without editing privilege",
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

    const newTitle = 'new title';

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        t.context.clients[0].emit(
          'feature-change-title',
          {
            id: features[0].id,
            newTitle,
          },
          (response: any) => {
            t.is(response?.error, undefined);
            t.end();
          }
        );
      }
    );
  }
);

test.cb("Should be able to change feature's map information", (t): void => {
  t.plan(2);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

  const mapInfo = {
    zoom: 10,
    center: {
      lat: 0,
      lng: 0,
    },
    dataLayerTime: '2020-01-22',
    compareLayerTime: '2021-12-22',
  };

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].on('edit', (newDashboard: Dashboard) => {
        t.deepEqual(newDashboard.features[0].mapInfo, mapInfo);
      });
      t.context.clients[0].emit(
        'feature-change-map-info',
        {
          id: features[0].id,
          ...mapInfo,
        },
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb(
  "Should not be able to change feature's map information without editing privilege",
  (t): void => {
    t.plan(1);

    const title = 'My dashboard';
    const features: FeatureNoWidth[] = [{ id: '0', title: 'title' }];

    const mapInfo = {
      zoom: 10,
      center: {
        lat: 0,
        lng: 0,
      },
      dataLayerTime: '2020-01-22',
      compareLayerTime: '2021-12-22',
    };

    t.context.clients[0].emit(
      'create',
      {
        title,
        features,
      },
      () => {
        t.context.clients[0].emit(
          'feature-change-map-info',
          {
            id: features[0].id,
            ...mapInfo,
          },
          (response: any) => {
            t.is(response?.error, undefined);
            t.end();
          }
        );
      }
    );
  }
);

test.cb('Should be able to add a text feature to a dashboard', (t): void => {
  t.plan(6);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [];
  const text =
    '# markdown is supported but we do not want no xss <script>alert("dumb boi")</script> ';

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      t.context.clients[0].on('edit', (dashboard: Dashboard) => {
        t.is(typeof dashboard.features[0].text, 'string');
        t.is(dashboard.features[0].text, text, dashboard.features[0].text);
        t.is(typeof dashboard.features[0].__generatedText__, 'string');
        t.true(
          dashboard.features[0].__generatedText__?.includes('<h1'),
          dashboard.features[0].__generatedText__
        );
        t.false(
          dashboard.features[0].__generatedText__?.includes('<script'),
          dashboard.features[0].__generatedText__
        );
      });

      t.context.clients[0].emit(
        'add-feature',
        {
          id: '0',
          title: 'title',
          text,
        },
        (response: any) => {
          t.is(response?.error, undefined);
          t.end();
        }
      );
    }
  );
});

test.cb('Should be able to change the text of a text feature', (t): void => {
  t.plan(8);

  const title = 'My dashboard';
  const features: FeatureNoWidth[] = [];

  const text =
    '# markdown is supported but we do not want no xss <script>alert("dumb boi")</script>';
  const newText =
    '# Some other text with another xss <script>alert("so lucky I actually wrote tests!")</script>';

  t.context.clients[0].emit(
    'create',
    {
      title,
      features,
    },
    () => {
      const featureId = '0';
      // This gets called twice ;)

      let triggered = false;
      t.context.clients[0].on('edit', (dashboard: Dashboard) => {
        t.is(
          dashboard.features[0].text,
          !triggered ? text : newText,
          dashboard.features[0].text
        );
        t.true(
          dashboard.features[0]?.__generatedText__?.includes('<h1'),
          dashboard.features[0]?.__generatedText__
        );
        t.false(
          dashboard.features[0]?.__generatedText__?.includes('<script'),
          dashboard.features[0]?.__generatedText__
        );

        triggered = true;
      });

      t.context.clients[0].emit(
        'add-feature',
        {
          id: featureId,
          title: 'title',
          text,
        },
        (response: any) => {
          t.is(response?.error, undefined);
          t.context.clients[0].emit(
            'feature-change-text',
            {
              id: featureId,
              text: newText,
            },
            (response: any) => {
              t.is(response?.error, undefined);
              t.end();
            }
          );
        }
      );
    }
  );
});
test.afterEach.always(async (t) => {
  await t.context.server.close();
});

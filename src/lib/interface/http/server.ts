import http from 'http';

import express from 'express';
import Joi from 'joi';
import marked from 'marked';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { Logger } from 'winston';
import xss from 'xss';

import { Dashboard } from '../../domain/dashboard';
import {
  Feature,
  FEATURE_MAX_WIDTH,
  FEATURE_MIN_WIDTH,
  FEATURE_WIDTH_STEP,
} from '../../domain/feature';
import { DashboardNoKeys } from '../../dto/dashboard-no-keys';
import { FeatureNoWidth } from '../../dto/feature-no-width';
import { noKeysToDtoMapper } from '../../mapper/noKeysToDto';
import { noWidthToFeatureMapper } from '../../mapper/noWidthToFeature';
import { ConnectionRepository } from '../../repo/connection';
import { DashboardRepository } from '../../repo/dashboard';

export enum ErrorType {
  Validation = 'validation',
  Execution = 'execution',
}

export class DashboardServer<
  DR extends DashboardRepository,
  CR extends ConnectionRepository
> {
  private readonly app = express();
  private readonly http = new http.Server(this.app);
  private readonly io = new IOServer(this.http);

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly dashboardRepository: DR,
    private readonly connectionRepository: CR,
    private readonly logger: Logger
  ) {
    this.app.set('port', port);

    this.io.on('connection', (socket: IOSocket) => {
      this.logger.verbose(`New connection with id ${socket.id}`);

      socket.on('disconnect', (reason: string) => {
        this.logger.verbose(
          `Connection with id ${socket.id} disconnected: ${reason}`
        );
        this.disconnectFromDashboard(socket.id);
      });

      // TODO: Create a function that abstracts socket.on and does Joi validation, error handling etc.

      socket.on('listen', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.object()
          .keys({
            id: Joi.string().required(),
            editKey: Joi.string().optional(),
          })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s listen call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(`Validation for ${socket.id}'s listen successful`);

        this.handleListen(socket, value.id, value.editKey)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('create', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.object()
          .keys({
            title: Joi.string().required(),
            // TODO: DDD violation. Move validation to domain.
            features: Joi.array().items(
              Joi.object({
                id: Joi.string().required(),
              }).options({ allowUnknown: true })
            ),
          })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s create call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(`Validation for ${socket.id}'s create successful`);

        this.handleCreate(
          socket,
          value.title,
          value.features.map((noWidth: FeatureNoWidth) =>
            noWidthToFeatureMapper(noWidth)
          )
        )
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('change-title', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.string().validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s change-title call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s change-title successful`
        );

        this.handleChangeTitle(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('add-feature', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        // TODO: DDD violation. Move validation to domain.
        const { error, value } = Joi.object({
          id: Joi.string().required(),
          title: Joi.string().required(),
        })
          .options({ allowUnknown: true })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s add-feature call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s add-feature successful`
        );

        this.handleAddFeature(socket, noWidthToFeatureMapper(value))
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('remove-feature', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.string().validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s remove-feature call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s remove-feature successful`
        );

        this.handleRemoveFeature(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-move-up', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.string().validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-move-up call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-move-up successful`
        );

        this.handleFeatureMoveUp(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-move-down', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.string().validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-move-down call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-move-down successful`
        );

        this.handleFeatureMoveDown(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-resize-shrink', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.string().validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-resize-shrink call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-resize-shrink successful`
        );

        this.handleFeatureResizeShrink(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-resize-expand', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.string().validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-resize-expand call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-resize-expand successful`
        );

        this.handleFeatureResizeExpand(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('add-marketing-info', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.object()
          .keys({
            interests: Joi.array().items(Joi.string()).min(1).required(),
          })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s add-marketing-info call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s add-marketing-info successful`
        );

        this.handleAddMarketingInfo(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-change-title', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.object()
          .keys({
            id: Joi.string().required(),
            newTitle: Joi.string().required(),
          })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-change-title call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-change-title successful`
        );

        this.handleFeatureChangeTitle(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-change-map-info', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.object()
          .keys({
            id: Joi.string().required(),
            zoom: Joi.number().optional(),
            center: Joi.object()
              .keys({
                lat: Joi.number().required(),
                lng: Joi.number().required(),
              })
              .optional(),
          })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-change-map-info call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-change-map-info successful`
        );

        this.handleFeatureChangeMapInfo(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });

      socket.on('feature-change-text', (payload, cb) => {
        if (typeof cb !== 'function') {
          if (typeof cb === 'undefined') cb = () => {};
          else return;
        }

        const { error, value } = Joi.object()
          .keys({
            id: Joi.string().required(),
            text: Joi.string().required(),
          })
          .validate(payload);

        if (error) {
          this.logger.debug(
            `Validation for ${socket.id}'s feature-change-text call failed: ${error.message}`
          );
          return cb({
            error: true,
            type: ErrorType.Validation,
            details: error.details,
          });
        }
        this.logger.debug(
          `Validation for ${socket.id}'s feature-change-text successful`
        );

        this.handleFeatureChangeText(socket, value)
          .then(cb)
          .catch((msg: string) =>
            cb({ error: true, type: ErrorType.Execution, message: msg })
          );
      });
    });

    this.dashboardRepository.on(
      'edit',
      async (id: string, dashboard: DashboardNoKeys) => {
        const connections = await this.connectionRepository.getConnectionsOfGroup(
          id
        );

        connections.forEach((connection) => {
          this.logger.debug(
            `Emitting edit event to ${connection.id} for dashboard ${id}`
          );
          this.io.to(connection.id).emit('edit', dashboard);
        });
      }
    );
  }

  async handleFeatureResizeExpand(socket: IOSocket, featureId: string) {
    this.logger.verbose(
      `Received resize:expand call from ${socket.id} for feature ${featureId}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to expand feature`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === featureId
      );

      if (index !== -1) {
        if (dashboard.features[index].width < FEATURE_MAX_WIDTH) {
          dashboard.features[index].width += FEATURE_WIDTH_STEP;
        }
      } else throw 'Feature not found';

      return dashboard;
    });

    this.logger.debug(
      `${socket.id} expanded ${featureId} from dashboard ${dashboardId}`
    );
  }

  async handleFeatureResizeShrink(socket: IOSocket, featureId: string) {
    this.logger.verbose(
      `Received resize:shrink call from ${socket.id} for feature ${featureId}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to shrink feature`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === featureId
      );

      if (index !== -1) {
        if (dashboard.features[index].width > FEATURE_MIN_WIDTH) {
          dashboard.features[index].width -= FEATURE_WIDTH_STEP;
        }
      } else throw 'Feature not found';

      return dashboard;
    });

    this.logger.debug(
      `${socket.id} shrank ${featureId} from dashboard ${dashboardId}`
    );
  }

  async handleFeatureMoveDown(socket: IOSocket, featureId: string) {
    this.logger.verbose(
      `Received move:down call from ${socket.id} for feature ${featureId}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to move feature down`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === featureId
      );
      if (index !== -1) {
        if (index !== dashboard.features.length - 1) {
          const temp = dashboard.features[index];
          dashboard.features[index] = dashboard.features[index + 1];
          dashboard.features[index + 1] = temp;
        }
      } else throw 'Feature not found';
      return dashboard;
    });

    this.logger.debug(
      `${socket.id} moved feature ${featureId} from dashboard ${dashboardId} down`
    );
  }

  async handleFeatureMoveUp(socket: IOSocket, featureId: string) {
    this.logger.verbose(
      `Received move:up call from ${socket.id} for feature ${featureId}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to move feature up`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === featureId
      );
      if (index !== -1) {
        if (index !== 0) {
          const temp = dashboard.features[index];
          dashboard.features[index] = dashboard.features[index - 1];
          dashboard.features[index - 1] = temp;
        }
      } else throw 'Feature not found';
      return dashboard;
    });

    this.logger.debug(
      `${socket.id} moved feature ${featureId} from dashboard ${dashboardId} up`
    );
  }

  async handleAddMarketingInfo(
    socket: IOSocket,
    marketingInfo: NonNullable<Dashboard['marketingInfo']>
  ) {
    this.logger.verbose(`Received add-marketing-info call from ${socket.id}`);
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to add marketing info`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      if (!dashboard.marketingInfo) {
        dashboard.marketingInfo = marketingInfo;
      }
      return dashboard;
    });

    this.logger.debug(
      `${socket.id} added marketing info to dashboard ${dashboardId}`
    );
  }

  private async handleListen(socket: IOSocket, id: string, editKey?: string) {
    this.logger.verbose(
      `Received listen call from ${socket.id} to dashboard ${id}, editKey: ${editKey}`
    );
    if (await this.connectionRepository.has(socket.id)) {
      this.disconnectFromDashboard(socket.id);
      this.logger.debug(`${socket.id} disconnected from connected dashboard`);
    }

    const dashboard = await this.dashboardRepository.get(id, editKey);

    if (!dashboard) {
      this.logger.debug(
        `${socket.id} provided incorrect id/editKey combination`
      );
      throw 'Dashboard with such id and editKey not found';
    }

    this.connectionRepository.add(id, socket.id, !!editKey);

    this.logger.debug(
      `Connected ${socket.id} to dashboard ${id}, editKey: ${editKey}`
    );

    return noKeysToDtoMapper(dashboard);
  }

  private async handleCreate(
    socket: IOSocket,
    title: string,
    features: Feature[]
  ) {
    this.logger.verbose(
      `Received create call from ${socket.id} with title ${title} and ${features.length} features`
    );
    if (await this.connectionRepository.has(socket.id)) {
      this.disconnectFromDashboard(socket.id);
      this.logger.debug(`${socket.id} disconnected from connected dashboard`);
    }

    const dashboard = await this.dashboardRepository.add(title, features);

    await this.connectionRepository.add(dashboard.id, socket.id, true);

    this.logger.debug(
      `${socket.id} created new dashboard ${dashboard.id}, editKey: ${dashboard.editKey}`
    );

    return dashboard;
  }

  private async handleChangeTitle(socket: IOSocket, title: string) {
    this.logger.verbose(
      `Received change-title call from ${socket.id} with new title ${title}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to edit title`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(
      dashboardId,
      async (dashboard) => ((dashboard.title = title), dashboard)
    );

    this.logger.debug(
      `${socket.id} changed title of dashboard ${dashboardId} to ${title}`
    );
  }

  private async handleAddFeature(socket: IOSocket, feature: Feature) {
    this.logger.verbose(
      `Received add-feature call from ${socket.id} with new feature with id ${feature.id}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to add feature`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    if (feature.text) {
      feature.__generatedText__ = xss(marked(feature.text));
    }

    await this.dashboardRepository.edit(
      dashboardId,
      async (dashboard) => (dashboard.features.push(feature), dashboard)
    );

    this.logger.debug(
      `${socket.id} added feature with id ${feature.id} to dashboard ${dashboardId}`
    );
  }

  private async handleRemoveFeature(socket: IOSocket, featureId: string) {
    this.logger.verbose(
      `Received remove-feature call from ${socket.id} with new feature with id ${featureId}`
    );

    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to remove feature`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex((f) => f.id === featureId);

      if (index === -1) throw 'Feature not found';

      dashboard.features.splice(index, 1);
      return dashboard;
    });

    this.logger.debug(
      `${socket.id} removed feature with id ${featureId} from dashboard ${dashboardId}`
    );
  }

  async handleFeatureChangeTitle(
    socket: IOSocket,
    { id, newTitle }: { id: string; newTitle: string }
  ) {
    this.logger.verbose(
      `Received change-title call from ${socket.id} for feature ${id}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(
        `${socket.id} not privileged to change feature's title`
      );
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === id
      );
      if (index !== -1) {
        dashboard.features[index].title = newTitle;
      } else throw 'Feature not found';
      return dashboard;
    });

    this.logger.debug(
      `${socket.id} changed feature ${id} from dashboard ${dashboardId} title to ${newTitle}`
    );
  }

  async handleFeatureChangeMapInfo(
    socket: IOSocket,
    mapInfo: Required<Feature['mapInfo']> & { id: string }
  ) {
    const { id, ...mapInfoWithoutId } = mapInfo;

    this.logger.verbose(
      `Received change-map-info call from ${socket.id} for feature ${id}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(
        `${socket.id} not privileged to change feature's map info`
      );
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === id
      );
      if (index !== -1) {
        dashboard.features[index].mapInfo = mapInfoWithoutId;
      } else throw 'Feature not found';
      return dashboard;
    });

    this.logger.debug(
      `${
        socket.id
      } changed feature ${id} from dashboard ${dashboardId} mapInfo to ${JSON.stringify(
        mapInfoWithoutId,
        null,
        2
      )}`
    );
  }

  async handleFeatureChangeText(
    socket: IOSocket,
    { id, text }: { id: string; text: string }
  ) {
    this.logger.verbose(
      `Received change-text call from ${socket.id} for feature ${id}`
    );
    if (!(await this.connectionRepository.hasPrivilege(socket.id))) {
      this.logger.debug(`${socket.id} not privileged to change feature's text`);
      throw 'User not privileged to perform this action';
    }

    const dashboardId = (await this.connectionRepository.getGroupOfConnection(
      socket.id
    ))!;

    await this.dashboardRepository.edit(dashboardId, async (dashboard) => {
      const index = dashboard.features.findIndex(
        (feature) => feature.id === id
      );
      if (index !== -1) {
        dashboard.features[index].text = text;
        dashboard.features[index].__generatedText__ = xss(marked(text));
      } else throw 'Feature not found';
      return dashboard;
    });

    this.logger.debug(
      `${socket.id} changed feature ${id} from dashboard ${dashboardId} text to ${text}`
    );
  }

  public async disconnectFromDashboard(id: string) {
    this.connectionRepository.remove(id);
  }

  public start(): Promise<void[]> {
    return Promise.all([
      this.connectionRepository.connect(),
      this.dashboardRepository.connect(),
      new Promise((resolve) => {
        this.http.listen(this.port, this.host, () => {
          this.logger.info(`Server listening on ${this.host}:${this.port}`);
          resolve();
        });
      }),
    ]);
  }

  public close(): Promise<void[]> {
    return Promise.all([
      new Promise((resolve, reject) => {
        this.io.close((error) => {
          if (error) {
            this.logger.error(`Could not shut down server: ${error.message}`);
            return reject(error);
          } else {
            this.logger.info('Server shut down gracefully');
            return resolve();
          }
        });
      }),
      this.dashboardRepository.close(),
      this.connectionRepository.close(),
    ]);
  }
}

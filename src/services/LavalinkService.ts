import type { Client } from "discord.js";
import { LavalinkManager } from "lavalink-client";
import type { AppConfig } from "../config/env";
import type { Logger } from "../config/logger";

export class LavalinkService {
  public readonly manager: LavalinkManager;

  public constructor(
    private readonly client: Client,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.manager = new LavalinkManager({
      nodes: [
        {
          id: "main",
          host: this.config.lavalink.host,
          port: this.config.lavalink.port,
          authorization: this.config.lavalink.password,
          secure: this.config.lavalink.secure,
          retryAmount: 10,
          retryDelay: 10_000,
        },
      ],
      sendToShard: (guildId, payload) => {
        this.client.guilds.cache.get(guildId)?.shard.send(payload);
      },
      client: {
        id: this.config.discord.clientId,
        username: "Spotify Sync Bot",
      },
      autoSkip: true,
      autoMove: true,
      autoSkipOnResolveError: true,
      queueOptions: {
        maxPreviousTracks: 25,
      },
      playerOptions: {
        defaultSearchPlatform: "ytmsearch",
        clientBasedPositionUpdateInterval: 250,
        volumeDecrementer: 1,
        useUnresolvedData: true,
        onDisconnect: {
          autoReconnect: true,
          destroyPlayer: false,
        },
        onEmptyQueue: {
          destroyAfterMs: 30_000,
        },
      },
    });

    this.registerEventLogging();
  }

  public async init(): Promise<void> {
    if (!this.client.user) {
      throw new Error("Discord client is not ready");
    }

    await this.manager.init({
      id: this.client.user.id,
      username: this.client.user.username,
    });
  }

  public sendRawData(payload: unknown): void {
    void this.manager.sendRawData(payload as never).catch((error) => {
      this.logger.warn({ error }, "Failed to forward Discord voice packet to Lavalink");
    });
  }

  private registerEventLogging(): void {
    this.manager.nodeManager.on("connect", (node) => {
      this.logger.info({ nodeId: node.id }, "Lavalink node connected");
      void node.updateSession(true, 300_000);
    });

    this.manager.nodeManager.on("disconnect", (node, reason) => {
      this.logger.warn({ nodeId: node.id, reason }, "Lavalink node disconnected");
    });

    this.manager.nodeManager.on("error", (node, error) => {
      this.logger.error({ nodeId: node.id, error }, "Lavalink node error");
    });

    this.manager.on("trackStart", (player, track) => {
      if (!track) {
        return;
      }

      this.logger.info(
        { guildId: player.guildId, title: track.info.title, author: track.info.author },
        "Track started",
      );
    });

    this.manager.on("trackError", (player, track, payload) => {
      if (!track) {
        return;
      }

      this.logger.warn(
        { guildId: player.guildId, title: track.info.title, payload },
        "Track failed",
      );
    });

    this.manager.on("queueEnd", (player) => {
      this.logger.info({ guildId: player.guildId }, "Queue ended");
    });
  }
}

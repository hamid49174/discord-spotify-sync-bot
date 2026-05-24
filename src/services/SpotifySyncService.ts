import type { User } from "discord.js";
import type { AppConfig } from "../config/env";
import type { Logger } from "../config/logger";
import type { SpotifyPlaybackSnapshot } from "../types/spotify";
import { UserFacingError } from "../utils/UserFacingError";
import { formatSpotifyTrack } from "../utils/format";
import type { MusicPlayerService } from "./MusicPlayerService";
import type { SpotifyAuthService } from "./SpotifyAuthService";

export interface StartSpotifySyncOptions {
  guildId: string;
  userId: string;
  voiceChannelId: string;
  textChannelId: string;
  requester: User;
}

export interface SpotifySyncSession {
  guildId: string;
  userId: string;
  voiceChannelId: string;
  textChannelId: string;
  requester: User;
  startedAt: number;
  updatedAt: number;
  lastSpotifyTrackId: string | undefined;
  lastPlaybackState: SpotifyPlaybackSnapshot | undefined;
  consecutiveFailures: number;
}

export interface SpotifySyncStatus {
  active: boolean;
  userId?: string;
  current?: string;
  isPlaying?: boolean;
  lastUpdatedAt?: number;
  failures?: number;
}

export class SpotifySyncService {
  private readonly sessions = new Map<string, SpotifySyncSession>();
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly locks = new Set<string>();

  public constructor(
    private readonly spotifyAuth: SpotifyAuthService,
    private readonly music: MusicPlayerService,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  public async start(options: StartSpotifySyncOptions): Promise<void> {
    if (!(await this.spotifyAuth.hasToken(options.userId))) {
      throw new UserFacingError("Spotify ist noch nicht verbunden. Nutze zuerst `/syncspotify login`.");
    }

    this.stop(options.guildId);

    const session: SpotifySyncSession = {
      guildId: options.guildId,
      userId: options.userId,
      voiceChannelId: options.voiceChannelId,
      textChannelId: options.textChannelId,
      requester: options.requester,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastSpotifyTrackId: undefined,
      lastPlaybackState: undefined,
      consecutiveFailures: 0,
    };

    this.sessions.set(options.guildId, session);
    await this.tick(options.guildId);

    const interval = setInterval(() => {
      void this.tick(options.guildId);
    }, this.config.spotify.syncIntervalMs);
    interval.unref();
    this.intervals.set(options.guildId, interval);
  }

  public stop(guildId: string): boolean {
    const interval = this.intervals.get(guildId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(guildId);
    }

    this.locks.delete(guildId);
    return this.sessions.delete(guildId);
  }

  public stopAll(): void {
    for (const guildId of this.sessions.keys()) {
      this.stop(guildId);
    }
  }

  public stopUser(userId: string): void {
    for (const [guildId, session] of this.sessions) {
      if (session.userId === userId) {
        this.stop(guildId);
      }
    }
  }

  public getStatus(guildId: string): SpotifySyncStatus {
    const session = this.sessions.get(guildId);
    if (!session) {
      return { active: false };
    }

    const status: SpotifySyncStatus = {
      active: true,
      userId: session.userId,
      lastUpdatedAt: session.updatedAt,
      failures: session.consecutiveFailures,
    };

    if (session.lastPlaybackState?.track) {
      status.current = formatSpotifyTrack(session.lastPlaybackState.track);
    }

    if (session.lastPlaybackState) {
      status.isPlaying = session.lastPlaybackState.isPlaying;
    }

    return status;
  }

  private async tick(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session || this.locks.has(guildId)) {
      return;
    }

    this.locks.add(guildId);
    try {
      await this.syncOnce(session);
      session.consecutiveFailures = 0;
    } catch (error) {
      session.consecutiveFailures += 1;
      this.logger.warn(
        { guildId, userId: session.userId, failureCount: session.consecutiveFailures, error },
        "Spotify sync tick failed",
      );

      if (session.consecutiveFailures >= 10) {
        this.stop(guildId);
        this.logger.error({ guildId, userId: session.userId }, "Spotify sync stopped after repeated failures");
      }
    } finally {
      this.locks.delete(guildId);
    }
  }

  private async syncOnce(session: SpotifySyncSession): Promise<void> {
    const playback = await this.spotifyAuth.getCurrentPlayback(session.userId);
    session.updatedAt = Date.now();
    session.lastPlaybackState = playback ?? undefined;

    if (!playback?.track) {
      const player = this.music.getPlayer(session.guildId);
      if (player && !player.paused) {
        await player.pause();
      }
      return;
    }

    const spotifyTrackChanged = playback.track.id !== session.lastSpotifyTrackId;
    if (spotifyTrackChanged) {
      await this.music.playSpotifyTrack({
        guildId: session.guildId,
        voiceChannelId: session.voiceChannelId,
        textChannelId: session.textChannelId,
        requester: session.requester,
        spotifyTrack: playback.track,
        positionMs: playback.progressMs,
        isPlaying: playback.isPlaying,
      });
      session.lastSpotifyTrackId = playback.track.id;
      return;
    }

    const player = this.music.getPlayer(session.guildId);
    if (!player) {
      session.lastSpotifyTrackId = undefined;
      return;
    }

    if (playback.isPlaying && player.paused) {
      await player.resume();
    } else if (!playback.isPlaying && !player.paused) {
      await player.pause();
    }

    const driftMs = Math.abs(player.position - playback.progressMs);
    if (playback.isPlaying && driftMs > this.config.spotify.seekThresholdMs) {
      await this.music.seekToSpotifyPosition(session.guildId, playback.progressMs);
    }
  }
}

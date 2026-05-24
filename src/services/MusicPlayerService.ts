import type { User } from "discord.js";
import type { Player, SearchPlatform, Track } from "lavalink-client";
import type { AppConfig } from "../config/env";
import type { Logger } from "../config/logger";
import type { SpotifyTrackSnapshot } from "../types/spotify";
import { UserFacingError } from "../utils/UserFacingError";
import { formatTrack } from "../utils/format";
import type { LavalinkService } from "./LavalinkService";

export interface PlaySpotifyTrackOptions {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  requester: User;
  spotifyTrack: SpotifyTrackSnapshot;
  positionMs: number;
  isPlaying: boolean;
  replaceCurrent?: boolean;
}

export interface QueueSnapshot {
  current: string | null;
  upcoming: string[];
  size: number;
  paused: boolean;
  positionMs: number;
}

export class MusicPlayerService {
  private readonly searchSources: SearchPlatform[] = ["ytmsearch", "ytsearch"];

  public constructor(
    private readonly lavalink: LavalinkService,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  public getPlayer(guildId: string): Player | undefined {
    return this.lavalink.manager.getPlayer(guildId);
  }

  public async ensureConnectedPlayer(
    guildId: string,
    voiceChannelId: string,
    textChannelId: string,
  ): Promise<Player> {
    const player = this.lavalink.manager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      volume: this.config.defaultVolume,
      selfDeaf: true,
      selfMute: false,
      instaUpdateFiltersFix: true,
    });

    if (!player.connected || player.voiceChannelId !== voiceChannelId) {
      await player.connect();
    }

    return player;
  }

  public async destroyPlayer(guildId: string, reason = "Command requested"): Promise<void> {
    const player = this.getPlayer(guildId);
    if (!player) {
      return;
    }

    await player.destroy(reason, true);
  }

  public async pause(guildId: string): Promise<void> {
    const player = this.requirePlayer(guildId);
    await player.pause();
  }

  public async resume(guildId: string): Promise<void> {
    const player = this.requirePlayer(guildId);
    await player.resume();
  }

  public async skip(guildId: string): Promise<void> {
    const player = this.requirePlayer(guildId);
    await player.skip();
  }

  public getQueue(guildId: string, limit = 10): QueueSnapshot {
    const player = this.requirePlayer(guildId);
    const upcomingTracks = player.queue.tracks.slice(0, limit);

    return {
      current: player.queue.current ? formatTrack(player.queue.current) : null,
      upcoming: upcomingTracks.map((track) => `${track.info.title} - ${track.info.author}`),
      size: player.queue.tracks.length,
      paused: player.paused,
      positionMs: player.position,
    };
  }

  public async playSpotifyTrack(options: PlaySpotifyTrackOptions): Promise<Track> {
    const player = await this.ensureConnectedPlayer(
      options.guildId,
      options.voiceChannelId,
      options.textChannelId,
    );

    const track = await this.findYoutubeTrack(player, options.spotifyTrack, options.requester);

    if (options.replaceCurrent !== false) {
      await player.stopPlaying(true, false);
    }

    player.queue.add(track);
    await Promise.resolve(
      player.play({
        position: Math.max(0, options.positionMs),
        paused: !options.isPlaying,
      }),
    );

    return track;
  }

  public async seekToSpotifyPosition(guildId: string, progressMs: number): Promise<void> {
    const player = this.requirePlayer(guildId);
    await player.seek(Math.max(0, progressMs));
  }

  private requirePlayer(guildId: string): Player {
    const player = this.getPlayer(guildId);
    if (!player) {
      throw new UserFacingError("Ich bin in diesem Server noch nicht mit einem Voice Channel verbunden.");
    }

    return player;
  }

  private async findYoutubeTrack(
    player: Player,
    spotifyTrack: SpotifyTrackSnapshot,
    requester: User,
  ): Promise<Track> {
    const queries = buildSearchQueries(spotifyTrack);

    for (const query of queries) {
      for (const source of this.searchSources) {
        const result = await player.search({ query, source }, requester, false);
        const track = result.tracks.find((candidate): candidate is Track =>
          this.lavalink.manager.utils.isNotBrokenTrack(candidate),
        );

        if (track) {
          this.logger.debug(
            { spotifyTrackId: spotifyTrack.id, query, source, youtubeTitle: track.info.title },
            "Matched Spotify track to YouTube track",
          );
          return track;
        }
      }
    }

    throw new UserFacingError(
      `Ich konnte keinen YouTube Treffer fuer "${spotifyTrack.name}" finden.`,
    );
  }
}

function buildSearchQueries(track: SpotifyTrackSnapshot): string[] {
  const artistString = track.artists.join(" ");
  return [
    `${track.name} ${artistString} official audio`,
    `${track.name} ${artistString}`,
    `${track.name} ${artistString} ${track.album}`,
  ];
}

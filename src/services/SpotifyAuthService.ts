import crypto from "node:crypto";
import SpotifyWebApi from "spotify-web-api-node";
import type { AppConfig } from "../config/env";
import type { Logger } from "../config/logger";
import type { FileTokenStore } from "../store/FileTokenStore";
import type { SpotifyPlaybackSnapshot, SpotifyTokenRecord, SpotifyTrackSnapshot } from "../types/spotify";
import { UserFacingError } from "../utils/UserFacingError";

interface PendingOAuthState {
  discordUserId: string;
  expiresAt: number;
}

const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-email",
];

export class SpotifyAuthService {
  private readonly pendingStates = new Map<string, PendingOAuthState>();

  public constructor(
    private readonly config: AppConfig,
    private readonly tokenStore: FileTokenStore,
    private readonly logger: Logger,
  ) {}

  public createAuthorizationUrl(discordUserId: string): string {
    this.prunePendingStates();

    const state = crypto.randomBytes(24).toString("base64url");
    this.pendingStates.set(state, {
      discordUserId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return this.createApi().createAuthorizeURL(SPOTIFY_SCOPES, state, true);
  }

  public async completeAuthorization(code: string, state: string): Promise<string> {
    const pending = this.pendingStates.get(state);
    this.pendingStates.delete(state);

    if (!pending || pending.expiresAt < Date.now()) {
      throw new UserFacingError("Spotify Login ist abgelaufen. Bitte starte `/syncspotify login` erneut.");
    }

    const api = this.createApi();
    const response = await api.authorizationCodeGrant(code);

    const refreshToken = response.body.refresh_token;
    if (!refreshToken) {
      throw new Error("Spotify did not return a refresh token");
    }

    await this.tokenStore.set({
      discordUserId: pending.discordUserId,
      accessToken: response.body.access_token,
      refreshToken,
      expiresAt: Date.now() + response.body.expires_in * 1000,
      updatedAt: Date.now(),
    });

    this.logger.info({ discordUserId: pending.discordUserId }, "Spotify OAuth completed");
    return pending.discordUserId;
  }

  public async hasToken(discordUserId: string): Promise<boolean> {
    return Boolean(await this.tokenStore.get(discordUserId));
  }

  public async revokeLocalToken(discordUserId: string): Promise<void> {
    await this.tokenStore.delete(discordUserId);
  }

  public async getCurrentPlayback(discordUserId: string): Promise<SpotifyPlaybackSnapshot | null> {
    const api = await this.getAuthorizedApi(discordUserId);
    const response = await api.getMyCurrentPlaybackState();
    const body = response.body as SpotifyApi.CurrentPlaybackResponse | undefined;

    if (!body || !body.item) {
      return null;
    }

    const isTrack = body.currently_playing_type === "track" && body.item.type === "track";
    const track = isTrack ? normalizeTrack(body.item as SpotifyApi.TrackObjectFull) : null;

    return {
      isPlaying: Boolean(body.is_playing),
      progressMs: body.progress_ms ?? 0,
      track,
      deviceName: body.device?.name,
    };
  }

  private async getAuthorizedApi(discordUserId: string): Promise<SpotifyWebApi> {
    const token = await this.tokenStore.get(discordUserId);
    if (!token) {
      throw new UserFacingError("Spotify ist noch nicht verbunden. Nutze zuerst `/syncspotify login`.");
    }

    const freshToken = token.expiresAt - Date.now() < 60_000 ? await this.refreshToken(token) : token;
    const api = this.createApi();
    api.setAccessToken(freshToken.accessToken);
    api.setRefreshToken(freshToken.refreshToken);
    return api;
  }

  private async refreshToken(token: SpotifyTokenRecord): Promise<SpotifyTokenRecord> {
    const api = this.createApi();
    api.setRefreshToken(token.refreshToken);

    const response = await api.refreshAccessToken();
    const updated: SpotifyTokenRecord = {
      ...token,
      accessToken: response.body.access_token,
      expiresAt: Date.now() + response.body.expires_in * 1000,
      updatedAt: Date.now(),
    };

    await this.tokenStore.set(updated);
    return updated;
  }

  private createApi(): SpotifyWebApi {
    return new SpotifyWebApi({
      clientId: this.config.spotify.clientId,
      clientSecret: this.config.spotify.clientSecret,
      redirectUri: this.config.spotify.redirectUri,
    });
  }

  private prunePendingStates(): void {
    const now = Date.now();
    for (const [state, pending] of this.pendingStates) {
      if (pending.expiresAt < now) {
        this.pendingStates.delete(state);
      }
    }
  }
}

function normalizeTrack(item: SpotifyApi.TrackObjectFull): SpotifyTrackSnapshot {
  return {
    id: item.id,
    uri: item.uri,
    name: item.name,
    artists: item.artists.map((artist) => artist.name),
    album: item.album.name,
    durationMs: item.duration_ms,
    externalUrl: item.external_urls.spotify,
  };
}

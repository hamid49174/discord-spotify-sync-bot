export interface SpotifyTrackSnapshot {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  externalUrl?: string;
}

export interface SpotifyPlaybackSnapshot {
  isPlaying: boolean;
  progressMs: number;
  track: SpotifyTrackSnapshot | null;
  deviceName?: string;
}

export interface SpotifyTokenRecord {
  discordUserId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  updatedAt: number;
}

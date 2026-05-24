import type { SpotifyTrackSnapshot } from "../types/spotify";

export interface AiMusicContext {
  guildId: string;
  userId: string;
  currentSpotifyTrack?: SpotifyTrackSnapshot;
  recentSpotifyTrackIds: string[];
}

export interface AiMusicAssistantPort {
  suggestNextQueries(context: AiMusicContext): Promise<string[]>;
}

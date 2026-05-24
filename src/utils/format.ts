import type { Track } from "lavalink-client";
import type { SpotifyTrackSnapshot } from "../types/spotify";

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTrack(track: Track): string {
  return `${track.info.title} - ${track.info.author}`;
}

export function formatSpotifyTrack(track: SpotifyTrackSnapshot): string {
  return `${track.name} - ${track.artists.join(", ")}`;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

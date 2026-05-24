import type { ChatInputCommandInteraction } from "discord.js";
import type { LavalinkService } from "../services/LavalinkService";
import type { MusicPlayerService } from "../services/MusicPlayerService";
import type { SpotifyAuthService } from "../services/SpotifyAuthService";
import type { SpotifySyncService } from "../services/SpotifySyncService";

export interface SlashCommandData {
  readonly name: string;
  toJSON(): unknown;
}

export interface CommandContext {
  lavalink: LavalinkService;
  music: MusicPlayerService;
  spotifyAuth: SpotifyAuthService;
  spotifySync: SpotifySyncService;
}

export interface BotCommand {
  readonly data: SlashCommandData;
  execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void>;
}

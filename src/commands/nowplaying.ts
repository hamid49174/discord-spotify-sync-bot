import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction } from "../utils/discord";
import { formatDuration } from "../utils/format";

export const nowPlayingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Zeigt den aktuell laufenden Track."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    const queue = context.music.getQueue(guildId, 0);
    const sync = context.spotifySync.getStatus(guildId);

    const lines = [
      `Discord: ${queue.current ?? "Nichts"}`,
      `Position: ${formatDuration(queue.positionMs)}`,
      `Spotify Sync: ${sync.active ? "aktiv" : "aus"}`,
    ];

    if (sync.current) {
      lines.push(`Spotify: ${sync.current}`);
    }

    await replyHidden(interaction, lines.join("\n"));
  },
};

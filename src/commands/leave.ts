import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction } from "../utils/discord";

export const leaveCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Stoppt die Musik und verlaesst den Voice Channel."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    context.spotifySync.stop(guildId);
    await context.music.destroyPlayer(guildId, "Leave command");
    await replyHidden(interaction, "Spotify Sync gestoppt und Voice Channel verlassen.");
  },
};

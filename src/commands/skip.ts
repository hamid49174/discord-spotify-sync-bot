import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction } from "../utils/discord";

export const skipCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Ueberspringt den aktuellen Queue Track."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    await context.music.skip(guildId);
    await replyHidden(interaction, "Track uebersprungen. In aktivem Spotify Sync gewinnt der Spotify Track beim naechsten Poll wieder.");
  },
};

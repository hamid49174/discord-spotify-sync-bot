import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction } from "../utils/discord";

export const resumeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Setzt die Discord Wiedergabe fort."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    await context.music.resume(guildId);
    await replyHidden(interaction, "Weiter geht's.");
  },
};

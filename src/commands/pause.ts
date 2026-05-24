import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction } from "../utils/discord";

export const pauseCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausiert die Discord Wiedergabe."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    await context.music.pause(guildId);
    await replyHidden(interaction, "Pausiert.");
  },
};

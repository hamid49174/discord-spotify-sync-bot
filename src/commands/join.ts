import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction, requireTextChannelId, requireVoiceChannelId } from "../utils/discord";

export const joinCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join deinem Voice Channel."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    const voiceChannelId = requireVoiceChannelId(interaction);
    const textChannelId = requireTextChannelId(interaction);

    await context.music.ensureConnectedPlayer(guildId, voiceChannelId, textChannelId);
    await replyHidden(interaction, "Ich bin im Voice Channel und bereit fuer Spotify Sync.");
  },
};

import {
  type ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  type TextBasedChannel,
} from "discord.js";
import { UserFacingError } from "./UserFacingError";

export function requireGuildInteraction(interaction: ChatInputCommandInteraction): string {
  if (!interaction.guildId) {
    throw new UserFacingError("Dieser Command funktioniert nur auf einem Discord Server.");
  }

  return interaction.guildId;
}

export function requireVoiceChannelId(interaction: ChatInputCommandInteraction): string {
  if (!(interaction.member instanceof GuildMember)) {
    throw new UserFacingError("Ich konnte deinen Voice-Status nicht lesen.");
  }

  const voiceChannelId = interaction.member.voice.channelId;
  if (!voiceChannelId) {
    throw new UserFacingError("Du musst zuerst einem Voice Channel beitreten.");
  }

  return voiceChannelId;
}

export function requireTextChannelId(interaction: ChatInputCommandInteraction): string {
  if (!interaction.channelId || !interaction.channel) {
    throw new UserFacingError("Ich brauche einen Text Channel fuer Statusmeldungen.");
  }

  return interaction.channelId;
}

export async function replyHidden(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
    return;
  }

  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export function isSendableTextChannel(channel: TextBasedChannel | null): boolean {
  return Boolean(channel && "send" in channel);
}

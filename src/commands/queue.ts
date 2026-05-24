import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction } from "../utils/discord";
import { formatDuration } from "../utils/format";

export const queueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Zeigt die aktuelle Queue."),

  async execute(interaction, context) {
    const guildId = requireGuildInteraction(interaction);
    const queue = context.music.getQueue(guildId);
    const upcoming = queue.upcoming.length
      ? queue.upcoming.map((track, index) => `${index + 1}. ${track}`).join("\n")
      : "Keine weiteren Tracks.";

    await replyHidden(
      interaction,
      [
        `Jetzt: ${queue.current ?? "Nichts"}`,
        `Status: ${queue.paused ? "pausiert" : "spielt"} bei ${formatDuration(queue.positionMs)}`,
        `Queue (${queue.size}):`,
        upcoming,
      ].join("\n"),
    );
  },
};

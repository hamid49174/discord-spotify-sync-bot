import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import type { BotCommand } from "../types/command";
import { replyHidden, requireGuildInteraction, requireTextChannelId, requireVoiceChannelId } from "../utils/discord";

export const syncSpotifyCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("syncspotify")
    .setDescription("Steuert den Spotify Sync.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("login")
        .setDescription("Verbindet deinen Spotify Account per OAuth."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Spiegelt deine Spotify Wiedergabe in deinen Voice Channel."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stop")
        .setDescription("Stoppt den Spotify Sync auf diesem Server."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Zeigt den Spotify Sync Status."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("logout")
        .setDescription("Loescht deine lokal gespeicherten Spotify Tokens."),
    ),

  async execute(interaction, context) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "login") {
      const authUrl = context.spotifyAuth.createAuthorizationUrl(interaction.user.id);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Spotify verbinden")
          .setStyle(ButtonStyle.Link)
          .setURL(authUrl),
      );

      await interaction.reply({
        content: "Oeffne Spotify Login, autorisiere den Bot und starte danach `/syncspotify start`.",
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === "logout") {
      context.spotifySync.stopUser(interaction.user.id);
      await context.spotifyAuth.revokeLocalToken(interaction.user.id);
      await replyHidden(interaction, "Deine lokal gespeicherten Spotify Tokens wurden geloescht.");
      return;
    }

    const guildId = requireGuildInteraction(interaction);

    if (subcommand === "start") {
      const voiceChannelId = requireVoiceChannelId(interaction);
      const textChannelId = requireTextChannelId(interaction);
      await context.spotifySync.start({
        guildId,
        userId: interaction.user.id,
        voiceChannelId,
        textChannelId,
        requester: interaction.user,
      });
      await replyHidden(interaction, "Spotify Sync laeuft. Starte, pausiere oder wechsel Songs direkt in Spotify.");
      return;
    }

    if (subcommand === "stop") {
      const stopped = context.spotifySync.stop(guildId);
      await replyHidden(interaction, stopped ? "Spotify Sync gestoppt." : "Hier laeuft gerade kein Spotify Sync.");
      return;
    }

    if (subcommand === "status") {
      const status = context.spotifySync.getStatus(guildId);
      if (!status.active) {
        await replyHidden(interaction, "Spotify Sync ist auf diesem Server aus.");
        return;
      }

      await replyHidden(
        interaction,
        [
          "Spotify Sync ist aktiv.",
          `Track: ${status.current ?? "Kein Spotify Track erkannt"}`,
          `Spotify spielt: ${status.isPlaying ? "ja" : "nein"}`,
          `Fehler in Folge: ${status.failures ?? 0}`,
        ].join("\n"),
      );
      return;
    }

    await replyHidden(interaction, "Unbekannter Spotify Subcommand.");
  },
};

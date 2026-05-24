import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config/env";
import { logger } from "./config/logger";
import { buildCommandCollection } from "./commands";
import { DiscordBot } from "./services/DiscordBot";
import { LavalinkService } from "./services/LavalinkService";
import { MusicPlayerService } from "./services/MusicPlayerService";
import { SpotifyAuthService } from "./services/SpotifyAuthService";
import { SpotifyOAuthServer } from "./services/SpotifyOAuthServer";
import { SpotifySyncService } from "./services/SpotifySyncService";
import { FileTokenStore } from "./store/FileTokenStore";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const tokenStore = new FileTokenStore(config.dataDir, logger.child({ service: "token-store" }));
const spotifyAuth = new SpotifyAuthService(config, tokenStore, logger.child({ service: "spotify-auth" }));
const lavalink = new LavalinkService(client, config, logger.child({ service: "lavalink" }));
const music = new MusicPlayerService(lavalink, config, logger.child({ service: "music" }));
const spotifySync = new SpotifySyncService(
  spotifyAuth,
  music,
  config,
  logger.child({ service: "spotify-sync" }),
);
const oauthServer = new SpotifyOAuthServer(
  config,
  spotifyAuth,
  logger.child({ service: "oauth-server" }),
);

const commands = buildCommandCollection();
const bot = new DiscordBot(client, commands, { lavalink, music, spotifyAuth, spotifySync }, config, logger);

process.on("unhandledRejection", (error) => {
  logger.error({ error }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

async function main(): Promise<void> {
  await oauthServer.start();
  await bot.start();
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  spotifySync.stopAll();
  await oauthServer.stop();
  client.destroy();
  process.exit(0);
}

void main().catch((error) => {
  logger.fatal({ error }, "Failed to start bot");
  process.exit(1);
});

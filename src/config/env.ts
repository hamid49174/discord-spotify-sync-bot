import path from "node:path";
import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const numberWithDefault = (defaultValue: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? defaultValue : value),
    z.coerce.number().int().positive(),
  );

const booleanWithDefault = (defaultValue: boolean) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === "") {
        return defaultValue;
      }
      if (typeof value === "string") {
        return ["1", "true", "yes", "on"].includes(value.toLowerCase());
      }
      return value;
    },
    z.boolean(),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: optionalString,

  SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
  SPOTIFY_REDIRECT_URI: z.string().url().default("http://127.0.0.1:3000/callback"),

  LAVALINK_HOST: z.string().min(1).default("127.0.0.1"),
  LAVALINK_PORT: numberWithDefault(2333),
  LAVALINK_PASSWORD: z.string().min(1).default("youshallnotpass"),
  LAVALINK_SECURE: booleanWithDefault(false),

  HTTP_HOST: z.string().min(1).default("127.0.0.1"),
  HTTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  DATA_DIR: z.string().min(1).default("data"),

  SPOTIFY_SYNC_INTERVAL_MS: numberWithDefault(3000),
  SPOTIFY_SYNC_SEEK_THRESHOLD_MS: numberWithDefault(5000),
  DEFAULT_VOLUME: numberWithDefault(80),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

const redirectUrl = new URL(parsed.data.SPOTIFY_REDIRECT_URI);

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  logLevel: parsed.data.LOG_LEVEL,
  discord: {
    token: parsed.data.DISCORD_TOKEN,
    clientId: parsed.data.DISCORD_CLIENT_ID,
    guildId: parsed.data.DISCORD_GUILD_ID,
  },
  spotify: {
    clientId: parsed.data.SPOTIFY_CLIENT_ID,
    clientSecret: parsed.data.SPOTIFY_CLIENT_SECRET,
    redirectUri: parsed.data.SPOTIFY_REDIRECT_URI,
    syncIntervalMs: parsed.data.SPOTIFY_SYNC_INTERVAL_MS,
    seekThresholdMs: parsed.data.SPOTIFY_SYNC_SEEK_THRESHOLD_MS,
  },
  lavalink: {
    host: parsed.data.LAVALINK_HOST,
    port: parsed.data.LAVALINK_PORT,
    password: parsed.data.LAVALINK_PASSWORD,
    secure: parsed.data.LAVALINK_SECURE,
  },
  http: {
    host: parsed.data.HTTP_HOST,
    port: parsed.data.HTTP_PORT ?? Number(redirectUrl.port || 3000),
  },
  dataDir: path.resolve(parsed.data.DATA_DIR),
  defaultVolume: Math.min(Math.max(parsed.data.DEFAULT_VOLUME, 1), 100),
} as const;

export type AppConfig = typeof config;

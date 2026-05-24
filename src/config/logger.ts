import pino from "pino";
import { config } from "./env";

const loggerOptions: pino.LoggerOptions = {
  level: config.logLevel,
  redact: {
    paths: [
      "discord.token",
      "spotify.clientSecret",
      "*.accessToken",
      "*.refreshToken",
      "access_token",
      "refresh_token",
    ],
    remove: true,
  },
};

if (config.nodeEnv === "development") {
  loggerOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}

export const logger = pino(loggerOptions);

export type Logger = typeof logger;

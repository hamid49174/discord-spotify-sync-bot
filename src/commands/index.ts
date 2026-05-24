import { Collection } from "discord.js";
import type { BotCommand } from "../types/command";
import { joinCommand } from "./join";
import { leaveCommand } from "./leave";
import { nowPlayingCommand } from "./nowplaying";
import { pauseCommand } from "./pause";
import { queueCommand } from "./queue";
import { resumeCommand } from "./resume";
import { skipCommand } from "./skip";
import { syncSpotifyCommand } from "./syncSpotify";

const commands: BotCommand[] = [
  joinCommand,
  leaveCommand,
  syncSpotifyCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  queueCommand,
  nowPlayingCommand,
];

export function buildCommandCollection(): Collection<string, BotCommand> {
  const collection = new Collection<string, BotCommand>();

  for (const command of commands) {
    collection.set(command.data.name, command);
  }

  return collection;
}

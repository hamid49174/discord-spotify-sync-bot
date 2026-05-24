import {
  Client,
  Collection,
  Events,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { AppConfig } from "../config/env";
import type { Logger } from "../config/logger";
import type { BotCommand, CommandContext } from "../types/command";
import { UserFacingError } from "../utils/UserFacingError";
import { replyHidden } from "../utils/discord";

export class DiscordBot {
  public constructor(
    private readonly client: Client,
    private readonly commands: Collection<string, BotCommand>,
    private readonly context: CommandContext,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  public async start(): Promise<void> {
    this.registerHandlers();
    await this.client.login(this.config.discord.token);
  }

  private registerHandlers(): void {
    this.client.on(Events.Raw, (payload) => {
      this.context.lavalink.sendRawData(payload);
    });

    this.client.once(Events.ClientReady, async (readyClient) => {
      await this.context.lavalink.init();
      await this.registerApplicationCommands(readyClient);
      this.logger.info({ tag: readyClient.user.tag }, "Discord bot ready");
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }

      const command = this.commands.get(interaction.commandName);
      if (!command) {
        return;
      }

      try {
        await command.execute(interaction, this.context);
      } catch (error) {
        await this.handleCommandError(interaction, error);
      }
    });
  }

  private async registerApplicationCommands(readyClient: Client<true>): Promise<void> {
    const payload = this.commands.map((command) =>
      command.data.toJSON(),
    ) as RESTPostAPIChatInputApplicationCommandsJSONBody[];

    if (this.config.discord.guildId) {
      const guild = await readyClient.guilds.fetch(this.config.discord.guildId);
      await guild.commands.set(payload);
      this.logger.info({ guildId: guild.id, commandCount: payload.length }, "Guild slash commands registered");
      return;
    }

    await readyClient.application.commands.set(payload);
    this.logger.info({ commandCount: payload.length }, "Global slash commands registered");
  }

  private async handleCommandError(
    interaction: Parameters<BotCommand["execute"]>[0],
    error: unknown,
  ): Promise<void> {
    if (error instanceof UserFacingError) {
      await replyHidden(interaction, error.message);
      return;
    }

    this.logger.error({ error, commandName: interaction.commandName }, "Command failed");
    await replyHidden(interaction, "Da ist etwas schiefgelaufen. Ich habe den Fehler geloggt.");
  }
}

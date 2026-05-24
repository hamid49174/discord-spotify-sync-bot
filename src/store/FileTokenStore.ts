import { promises as fs } from "node:fs";
import path from "node:path";
import type { Logger } from "../config/logger";
import type { SpotifyTokenRecord } from "../types/spotify";

interface TokenStoreFile {
  version: 1;
  users: Record<string, SpotifyTokenRecord>;
}

export class FileTokenStore {
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(
    dataDir: string,
    private readonly logger: Logger,
  ) {
    this.filePath = path.join(dataDir, "spotify-tokens.json");
  }

  public async get(discordUserId: string): Promise<SpotifyTokenRecord | undefined> {
    const data = await this.readFile();
    return data.users[discordUserId];
  }

  public async set(record: SpotifyTokenRecord): Promise<void> {
    await this.enqueueWrite(async () => {
      const data = await this.readFile();
      data.users[record.discordUserId] = record;
      await this.writeFile(data);
    });
  }

  public async delete(discordUserId: string): Promise<void> {
    await this.enqueueWrite(async () => {
      const data = await this.readFile();
      delete data.users[discordUserId];
      await this.writeFile(data);
    });
  }

  private async enqueueWrite(task: () => Promise<void>): Promise<void> {
    this.writeQueue = this.writeQueue.then(task, task);
    await this.writeQueue;
  }

  private async readFile(): Promise<TokenStoreFile> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as TokenStoreFile;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { version: 1, users: {} };
      }

      this.logger.error({ error }, "Failed to read Spotify token store");
      throw error;
    }
  }

  private async writeFile(data: TokenStoreFile): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

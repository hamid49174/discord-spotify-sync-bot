import http from "node:http";
import express from "express";
import type { AppConfig } from "../config/env";
import type { Logger } from "../config/logger";
import type { SpotifyAuthService } from "./SpotifyAuthService";

export class SpotifyOAuthServer {
  private readonly app = express();
  private server?: http.Server;

  public constructor(
    private readonly config: AppConfig,
    private readonly spotifyAuth: SpotifyAuthService,
    private readonly logger: Logger,
  ) {
    this.registerRoutes();
  }

  public async start(): Promise<void> {
    if (this.server) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.server = this.app.listen(this.config.http.port, this.config.http.host, () => resolve());
    });

    this.logger.info(
      { host: this.config.http.host, port: this.config.http.port },
      "Spotify OAuth server listening",
    );
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => (error ? reject(error) : resolve()));
    });
  }

  private registerRoutes(): void {
    this.app.get("/healthz", (_request, response) => {
      response.status(200).json({ ok: true });
    });

    this.app.get("/callback", async (request, response) => {
      const code = asString(request.query.code);
      const state = asString(request.query.state);
      const error = asString(request.query.error);

      if (error) {
        response.status(400).send(renderPage("Spotify Login abgebrochen", escapeHtml(error)));
        return;
      }

      if (!code || !state) {
        response.status(400).send(renderPage("Spotify Login fehlgeschlagen", "Code oder State fehlt."));
        return;
      }

      try {
        await this.spotifyAuth.completeAuthorization(code, state);
        response
          .status(200)
          .send(renderPage("Spotify verbunden", "Du kannst dieses Fenster schliessen und zu Discord zurueckgehen."));
      } catch (callbackError) {
        this.logger.error({ error: callbackError }, "Spotify OAuth callback failed");
        response
          .status(500)
          .send(renderPage("Spotify Login fehlgeschlagen", "Bitte starte `/syncspotify login` erneut."));
      }
    });
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111827; color: #f9fafb; }
    main { max-width: 560px; padding: 32px; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 0; color: #cbd5e1; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${body}</p>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

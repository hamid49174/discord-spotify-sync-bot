# Discord Spotify Sync Music Bot

TypeScript Discord bot that lets Spotify act as the remote control for a Discord voice channel. A user logs in with Spotify OAuth, runs `/syncspotify start`, and the bot mirrors the current Spotify track, pause/resume state, track changes, and playback position into Discord through Lavalink.

## Features

- Discord.js v14 slash commands: `/join`, `/leave`, `/syncspotify`, `/pause`, `/resume`, `/skip`, `/queue`, `/nowplaying`
- Spotify OAuth with local token persistence
- Spotify currently-playing polling with track, pause/play, and progress drift detection
- YouTube Music search first, normal YouTube search fallback second
- Lavalink v4 audio streaming with reconnect and queue handling
- Modular services ready for Redis/database stores and future AI music assistant logic
- Dockerfile, Docker Compose, Lavalink config, and typed environment validation
- Structured Pino logging and user-safe command errors

## Project Structure

```text
src/
  commands/             Slash command modules
  config/               Environment parsing and logger
  services/             Discord, Lavalink, Spotify OAuth, sync, player services
  store/                Local Spotify token store
  types/                Shared command and Spotify types
  utils/                Discord helpers, formatting, user-facing errors
lavalink/application.yml
Dockerfile
docker-compose.yml
.env.example
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. In the Spotify Developer Dashboard, add this redirect URI exactly:

```text
http://127.0.0.1:3000/callback
```

4. In the Discord Developer Portal, create a bot and enable these invite scopes:

```text
bot applications.commands
```

Recommended bot permissions:

```text
Connect, Speak, Use Voice Activity, Send Messages, View Channels
```

5. Start Lavalink and the bot locally:

```bash
docker compose up lavalink
npm run dev
```

Or run everything in Docker:

```bash
docker compose up --build
```

## Environment Variables

```text
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
DATA_DIR=data
SPOTIFY_SYNC_INTERVAL_MS=3000
SPOTIFY_SYNC_SEEK_THRESHOLD_MS=5000
DEFAULT_VOLUME=80
```

Use `DISCORD_GUILD_ID` during development for instant slash-command registration. Leave it blank for global commands.

## Usage

1. Join a Discord voice channel.
2. Run `/syncspotify login` and click the Spotify login button.
3. Start playback in Spotify.
4. Run `/syncspotify start`.
5. Control playback from Spotify. The bot follows track changes, pause, resume, and seeks when drift is detected.

Useful commands:

- `/syncspotify status` checks the active sync state.
- `/syncspotify stop` stops mirroring Spotify on the server.
- `/syncspotify logout` deletes your locally stored Spotify tokens.
- `/leave` stops sync and disconnects the bot.

## Lavalink Notes

The included Lavalink config uses the official Lavalink v4 Docker image and the `youtube-source` plugin for YouTube and YouTube Music search. The built-in Lavalink YouTube source is disabled because current Lavalink guidance points users to the plugin.

If YouTube begins requiring extra verification for your server/IP, check the `youtube-source` OAuth or `poToken` options in `lavalink/application.yml`.

## Production Notes

- Replace the file token store with Redis, Postgres, or another encrypted store for multi-instance deployments.
- Keep `DATA_DIR` on persistent storage if you use the local store.
- Put Lavalink behind private networking and do not expose port `2333` publicly unless it is protected.
- Use one Docker Compose project per environment, with separate Discord and Spotify apps for dev/prod.
- The `AiMusicAssistantPort` interface is included as the future integration point for recommendations, mood-aware queues, or assistant-driven search expansion.

## Scripts

```bash
npm run dev        # watch mode with tsx
npm run build      # compile TypeScript to dist/
npm run typecheck  # compile check without emitting
npm start          # run compiled bot
```

---

*Hinweis zur Historie: Dieses Projekt wurde am 07.09.2026 auf GitHub importiert. Die Commits davor sind aus den Änderungsdaten der Dateien rekonstruiert (ein Commit pro Arbeitstag) und zeigen, wann an welchen Dateien gearbeitet wurde.*

# LUX LIVE FOOTBALL

Starter project for a football website and Android streaming platform.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
1. Open this folder in a terminal.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Run `npm start`.
5. Open `http://localhost:10000`.

The site works without a stream configured. To enable video, set `LIVE_STREAM_URL` to an HTTPS HLS `.m3u8` stream that you own or are licensed to distribute. Set `LIVE_STREAM_TITLE` to the broadcast name.

## API endpoints
- `GET /api/health`
- `GET /api/matches`
- `GET /api/stream`

## Important
This starter does not provide football broadcasts, fixtures, scores, or streaming rights. Add authorized video providers and a licensed football data API before public launch. Do not use unauthorized streams.

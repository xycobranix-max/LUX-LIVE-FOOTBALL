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


## Redesign deployment notes

1. Before deploying, open the Supabase SQL Editor and run `supabase-live-stream-category.sql`.
2. This adds `category` to `public.live_streams`. Existing records are assigned `live_football` so they remain visible.
3. Commit and deploy the updated `server.js`, `public/index.html`, `public/styles.css`, `public/app.js`, and `public/streams-admin.html`.
4. In the Stream Manager, select LIVE TV for television channels or LIVE FOOTBALL for football broadcasts.
5. Public stream listings and manual highlights now require a valid member session. Keep the Supabase secret key on the server only.

The account dashboard stores favourites and saved-match labels in this browser's local storage. Browser notification permission is only a permission toggle; push alerts are not configured because the original project has no notification delivery service.

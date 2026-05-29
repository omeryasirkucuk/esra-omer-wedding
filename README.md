# Esra & Ömer — Wedding Microsite

A small, fully responsive wedding site for a single day (~100 concurrent guests).
Guests reach everything from one QR-linked home hub.

## Sections

- **Ana Sayfa (`/`)** — hub linking to the four sections. This is the QR target.
- **Davetiye (`/davetiye`)** — animated invitation: full-screen cover → cinematic
  open → scroll-snapping deck (countdown, add-to-calendar, families & program,
  location with directions, RSVP, closing). Background music plays only here,
  fading in after the guest opens the invitation; there is no on-screen control.
- **Anı Panosu (`/pano`)** — a live, public memory board. Guests post short
  notes with an optional photo/video; the feed polls for new posts.
- **Oyunlar (`/oyunlar`)** — games to pass the time before the ceremony
  (memory match, couple quiz, photo guess, slide puzzle, "who said it", spot the
  difference). No scores, no leaderboard — just for fun.
- **Albüm (`/album`)** — guests upload many photos/videos at once with per-file
  progress and see/manage only their own uploads (identified per device).

## Tech

- **Front-end:** Vite + React + Tailwind. The colour palette lives entirely in
  `src/theme/tokens.css`, wired into Tailwind — swapping the whole look is a
  one-file change.
- **Back-end:** a minimal Express API (`server/`) with a pluggable storage
  driver. RSVP and posts are JSON collections; uploads are stored per guest in
  their own folder with a `manifest.json` audit trail.

## Storage

The storage driver is selected with `STORAGE_DRIVER`:

- `local` (default) — writes under `./data`, served from `/media`.
- `s3` — Amazon S3. Bucket layout is identical to local
  (`rsvp.json`, `posts.json`, `uploads/<name-slug>-<id>/…`), so the couple can
  browse the bucket and see exactly who uploaded or removed what. Media is
  served through `/media`, which 302-redirects to a short-lived presigned URL,
  so the bucket can stay private and stored URLs never expire.

Configure via environment (see `.env.example`):

```
STORAGE_DRIVER=s3
S3_BUCKET=omer-esra-wedding
S3_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Develop & run

```bash
npm install
npm run dev      # Vite (5173) + API (8787) together
# or, to host the built site from one process:
npm start        # builds and serves the SPA + API on API_PORT (default 8787)
```

## Deployment notes

The invitation and games are static, but RSVP, the album and the memory board
need the API. For a static front-end host, build the front-end and set
`VITE_API_BASE` to the deployed API origin; otherwise run `npm start` on a host
that serves both (single origin, simplest).

## Drop in your music

Place the invitation track at `public/music/song.mp3`. It is referenced by the
invitation page only.

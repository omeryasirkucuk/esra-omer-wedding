<p align="center">
  <img src="docs/emblem.gif" alt="Esra & Ömer" width="220" />
</p>

<h1 align="center">Esra &amp; Ömer</h1>

<p align="center">A personal wedding microsite — built for our own wedding day.</p>

<p align="center"><a href="https://esraomer.com">esraomer.com</a></p>

---

Guests reach everything from one QR-linked hub: the invitation (with music and
a live countdown), a live memory board, a shared photo &amp; video album, and a
few light games with a per-game scoreboard.

**Built with** React + Vite + Tailwind CSS on the front end, a minimal Express
API on the back end, and a pluggable storage adapter (local filesystem or
Amazon S3) for all data and media. No database — JSON collections plus
per-uploader folders.

## Use it for your own wedding

The site is designed to be forked. Everything couple-specific is editable from
the admin dashboard at runtime; the code itself carries only fallback defaults.

### 1. Run it locally (zero config)

```bash
npm install
npm run dev
```

- Guest site: http://localhost:5173 — admin: http://localhost:5173/admin
- Default admin logins: `omer` / `esra` and `esra` / `omer` (override with
  `ADMIN_USERS`, see below).
- Data is written to `./data` (gitignored). No cloud account needed.

### 2. First 10 minutes in the admin

1. **Düğün Bilgileri** (wedding info) tab — set the couple's names, date &amp;
   time, venue (+ exact map coordinates), families, program, quotes, and under
   *Bağlantı Önizleme* the site title and public URL used for link previews.
2. **Sistem** (system) tab — upload the invitation music (MP3) and the square
   link-preview image, and walk the setup checklist. The tab also shows the
   active configuration with masked secrets (per-row reveal).
3. **Oyunlar** (games) tab — replace the quiz questions, "who said it" quotes
   and photo-guess rounds with your own.

Every guest-facing string that names the couple (board placeholder, game
labels, calendar files, admin title) follows the names you set — no code edits.

### 3. Configuration (`.env`)

Copy `.env.example` to `.env`. Real secrets stay in the environment; everything
else is admin-editable.

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_PORT` | `8787` | Express port (hosts inject `PORT` instead) |
| `STORAGE_DRIVER` | `local` | `local` (./data) or `s3` |
| `STORAGE_DIR` | `./data` | Local driver data root |
| `S3_BUCKET` / `S3_REGION` | — / `eu-central-1` | Required for `s3` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | — | IAM user with access to the bucket |
| `MUSIC_KEY` | `music/davetiye-music.mp3` | Storage key of the invitation music |
| `ADMIN_USERS` | `esra:omer,omer:esra` | `user:pass,user:pass` admin accounts — set your own |
| `ADMIN_SECRET` | built-in | HMAC key for admin session tokens — set your own |
| `VITE_API_BASE` | empty | Only when the front end is hosted apart from the API |

### 4. Production notes

- **Storage:** create a private S3 bucket and an IAM user limited to it
  (`s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`), then
  set `STORAGE_DRIVER=s3` plus the bucket/credentials. The bucket layout is
  identical to the local `./data` folder.
- **Hosting:** any Node host works (`npm run build`, then
  `node server/index.js` serves API + static build). `render.yaml` is a ready
  Render blueprint — rename the service, set your bucket name, and add the two
  AWS secrets in the dashboard.
- **Domain:** point your DNS at the host, then set the public URL in the admin
  (*Düğün Bilgileri › Bağlantı Önizleme*). The server injects it into the
  page's social/OG tags at runtime — no rebuild needed.
- **Identity model:** guests don't log in; a per-device id keys their uploads
  and scores, and the name is just a label.
- Rename `name`/`description` in `package.json` and replace `docs/emblem.gif`
  / `public/favicon.svg` if you want your own branding.

### Code defaults

Bundled fallbacks (used until the admin saves content) live in
`src/data/wedding.js` and `src/data/quiz.js` — edit them if you want your fork
to look right even with an empty storage.

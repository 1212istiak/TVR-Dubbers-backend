# TVR Dubbers

Bangla-dubbed donghua streaming site. Dark glassmorphism, a nine-stop color-cycle
signature effect, modal video player with dual-server fallback, comments,
reactions, and a full admin panel — built per the original spec, with a
handful of deliberate improvements called out below.

**Stack:** vanilla HTML/CSS/JS (Netlify) · Node/Express (Render) · Turso/libSQL (database)

---

## 1. Quick start (local, no cloud accounts needed)

```bash
cd backend
npm install
npm run setup      # creates local.db, applies the schema, seeds demo data
npm run dev        # API on http://localhost:3000
```

Then just open `frontend/index.html` directly in a browser — set
`API_BASE_URL = 'http://localhost:3000'` in `frontend/js/config.js` first
(it's empty by default, which runs the site entirely on demo data — see
§6). No Turso account, no Render account, nothing to deploy — this all runs
on your machine.

## 2. Project structure

```
tvr-dubbers/
├── backend/
│   ├── server.js              Express app, mounts every router
│   ├── db/
│   │   ├── schema.sql         7 tables, 5 indices
│   │   ├── client.js          libSQL client — local file or Turso, same code
│   │   ├── migrate.js         applies schema.sql
│   │   └── seed.js            admin account, default settings, voice artists, 1 demo episode
│   ├── middleware/             auth.js (JWT), rateLimit.js
│   ├── routes/                 episodes, trailer, comments, reactions, settings,
│   │                            voiceArtists, login, admin (all writes), share (OG proxy)
│   └── utils/                  embedUrl.js (Dailymotion/Rumble parser), validate.js
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/                      13 modules — config, api, mockData, theme, effects,
                                  countdown, episodes, search, player, comments,
                                  reactions, admin, app
```

## 3. Deploying for real

Do these in order — each step needs the value from the one before it.

### 3a. Database — Turso

```bash
curl -sSfL https://get.tur.so/install.sh | bash   # install the CLI
turso auth login
turso db create tvr-dubbers
turso db show tvr-dubbers            # → copy the URL as TURSO_DATABASE_URL
turso db tokens create tvr-dubbers   # → copy the token as TURSO_AUTH_TOKEN
```

### 3b. Backend — GitHub + Render

1. Push the `backend/` folder to a new GitHub repo.
2. On [render.com](https://render.com): **New → Web Service**, connect the repo.
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: **Free** (no card required — see the note in §7 about cold starts)
3. Add the environment variables from `.env.example`: `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, `JWT_SECRET` (any long random string), `ADMIN_SEED_PASSWORD`
   (optional — see §5), `FRONTEND_ORIGIN` (fill in after step 3c).
4. Once deployed, open a Render shell (or run locally against the Turso URL)
   and run `npm run setup` once to create tables and seed data.
5. Confirm it's alive: `https://your-service.onrender.com/api/health`.

### 3c. Frontend — Netlify

1. In `frontend/js/config.js`, set `API_BASE_URL` to your Render URL.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the
   `frontend` folder in. That's it — no build step, since it's already plain
   static files. (For updates later, the Netlify CLI — `netlify deploy` — is
   easier than re-dragging each time.)
3. Copy your `*.netlify.app` URL back into Render's `FRONTEND_ORIGIN` env var
   and redeploy the backend (this is what CORS uses to allow the frontend to
   call the API).

## 4. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `TURSO_DATABASE_URL` | Render | Turso database URL. Unset = local `backend/local.db` file. |
| `TURSO_AUTH_TOKEN` | Render | Turso auth token. Unset when using the local file DB. |
| `JWT_SECRET` | Render | Signs admin session tokens. Any long random string. |
| `ADMIN_SEED_PASSWORD` | Render (optional) | Sets the admin password on first `npm run seed`. Unset = a strong one is generated and printed once. |
| `FRONTEND_ORIGIN` | Render | Your Netlify URL — used for CORS and for the `/share/episode/:id` redirect target. |
| `PORT` | Render | Usually set automatically by Render; defaults to 3000 locally. |
| `API_BASE_URL` | `frontend/js/config.js` | Your Render URL. Empty = demo-data mode. |

## 5. Admin access

Click/tap the site title 5 times quickly. Log in with whatever
`ADMIN_SEED_PASSWORD` you set (or the generated one printed to the Render
logs / your terminal when you ran `npm run seed`) — then **change it
immediately** from Settings → Password. Sessions last 24 hours (JWT, spec
default).

## 6. Demo-data mode

`frontend/js/config.js` ships with `API_BASE_URL = ''`. With no backend
configured, the site runs entirely on `frontend/js/mockData.js` — a few
sample episodes, the real voice-artist roster from the spec, and working
(in-memory, non-persistent) comments and reactions. This is what you're
looking at if you're previewing the site before deploying a backend. The
admin panel still opens, but write actions show "connect a live backend"
instead of silently pretending to succeed. Filling in `API_BASE_URL`
switches everything to live data with no other code changes.

## 7. Decisions & deviations from the spec — and why

- **No hardcoded admin password.** The spec's password was partly redacted
  in the PDF anyway, but even a real one shouldn't live in source that's
  headed to GitHub. It's env-var-driven, with a generated fallback printed
  once. See §5.
- **bcryptjs instead of bcrypt.** Same hash format, pure JS — avoids native
  compilation occasionally failing on constrained free-tier build
  containers. Nothing else changes.
- **Color-cycle is one shared timer, not N independent CSS animations.**
  The spec wants the 9-stop cycle on every tile edge *and* every heading —
  potentially dozens of elements on a full grid. Running that many
  independent 60fps keyframe animations is exactly what jars on the
  low-budget phones the spec prioritizes. Instead, one JS interval updates
  two CSS custom properties on `<html>` every ~2.2s, and every element just
  transitions to the new value. One timer, same visual result. Full
  reasoning is in the comment block above `initColorCycle()` in `effects.js`.
- **Countdown timezone handling.** `<input type="datetime-local">` has no
  timezone — stored raw, the countdown would show a different time to every
  visitor depending on their own clock. The admin form now converts to a
  UTC instant on save and back to local time for display, so the countdown
  means the same moment for everyone.
- **`/share/episode/:id` proxy route.** The spec asks for per-episode Open
  Graph tags "served from the backend," but the frontend is a static
  Netlify site with no server-side rendering — a crawler hitting the
  Netlify URL directly only ever sees generic homepage tags. This backend
  route serves correct per-episode tags and redirects humans on to the real
  page. Point "Share" buttons at it instead of the Netlify URL.
- **Route layout.** All admin-authenticated writes live under `/api/admin/*`
  (one `requireAdmin` gate applied once), and public reads live under their
  own resource paths (`/api/episodes`, `/api/comments`, etc.) — rather than
  mixing public and admin routes on the same path per resource. Same
  behavior as the spec, just avoids any ambiguity about which router
  handles a given URL.
- **DB indices + `updated_at` column.** Not in the original schema; added
  because the frontend always sorts by newest-first and filters by
  genre/special, and comments/reactions are always looked up by episode —
  exactly the queries indices are for.
- **`/api/health` endpoint.** Render's free tier spins down after 15 minutes
  idle; this gives you (or a free uptime pinger) something to hit to keep
  it warm, or just to check it's alive after a deploy.

## 8. Assumptions made where the spec was ambiguous or redacted

- **Base theme hex color** — the PDF's `#` value was cut off. I used
  `#0a0a12` (near-black, faint blue-violet cast) to complement the
  color-cycle palette. It's the first line in `:root` in `styles.css` —
  one-line change if you had something else in mind.
- **Two Telegram links** — the spec lists a general "Telegram" social icon
  *and* a separate "Contact us on Telegram / Official Telegram Channel"
  footer line. I modeled these as two settings keys (`telegram_group_url`,
  `telegram_channel_url`), both defaulting to the same link, independently
  editable from the admin panel. If you meant one link shown twice, just
  set them to the same URL and ignore the second field.
- **Starting episode count** — the PDF's episode/season numbers didn't
  extract cleanly ("Season␣,␣episodes"). Rather than invent a specific
  number, the seed script adds one clearly-labeled `[DEMO]` episode so the
  grid isn't empty on first load, and you add real ones from the admin panel.
- **Genre list** — not specified beyond "dropdown." I used Action,
  Adventure, Fantasy, Martial Arts, Drama, Comedy, Supernatural (fitting
  for a cultivation/action donghua) — easy to edit in `index.html`'s two
  `<select>` blocks.
- **Fonts** — "bold, cinematic, eye-catching" without specific names. Went
  with Unbounded (display/headings), Plus Jakarta Sans (body), and Space
  Grotesk (countdown/episode numbers, for a HUD-like readout feel).
- **Exact color-cycle hex values** — the spec names colors ("deep pink,"
  "sea blue with sky blue glow") rather than hex codes. My mapping is
  documented directly above `CYCLE_STOPS` in `effects.js`.

## 9. Requirement checklist

**Frontend layout**
- [x] Sticky header, admin-editable title + motto
- [x] Search bar with floating live results, debounced, "Coming Soon" on no match
- [x] Dark/light toggle, system-preference detection on first load
- [x] Hero with badge, title, Watch Now / Upcoming Episode buttons → modal player
- [x] Admin-editable countdown, glassmorphism card
- [x] Special Collection: collapsed tile + strip, expand to fullscreen grid, ✕ to close
- [x] All Episodes grid: 4-column responsive, genre filters, skeleton loading, newest-first, lazy-loaded thumbnails
- [x] Footer: tagline, team lead, voice artists (admin add/delete), social links with "Coming Soon" fallback, copyright

**Styling & effects**
- [x] Dark/light themes, white shadow (dark) / black shadow (light)
- [x] 9-stop color-cycle on titles/headings/video titles/tile edges (see §7 for the performance approach)
- [x] Cinematic display font + readable body font
- [x] Desktop cursor: dot + lagging/orbiting ring, GPU-friendly (`transform`, `requestAnimationFrame`)
- [x] Mobile tap: glowing dot, float-and-fade
- [x] Particle background: canvas, adaptive count (`hardwareConcurrency`), FPS-based auto-reduction, pauses on hidden tab
- [x] Smooth scroll, fade-up on scroll (`IntersectionObserver`)
- [x] `prefers-reduced-motion` respected throughout (not in original spec — added)

**Video player**
- [x] Modal overlay, not a new page
- [x] Primary (Dailymotion) / Backup (Rumble) server tabs, built from validated URLs
- [x] Comments + reactions below player
- [x] Next Episode suggestion
- [x] Resume Watching badge (`localStorage`)

**Comments & reactions**
- [x] Comments only inside the episode modal, nickname optional, polling (8s)
- [x] Newest-first, admin moderation view grouped by episode
- [x] 4 reactions, float-up animation + counter bounce, one per visitor (`localStorage` UUID + DB `UNIQUE` constraint), rate-limited server-side

**Admin panel**
- [x] 5-tap/click hidden entry, bcrypt password, JWT session (24h)
- [x] A. Upload episode — all fields, embed URL validation, special-folder toggle
- [x] B. Upload trailer
- [x] C. Edit/delete episodes, delete confirmation
- [x] D. Site settings — title, motto, special folder thumb/label, countdown
- [x] E. Update links — all 7 platforms + WhatsApp
- [x] F. Voice artists — add/delete
- [x] G. Change password
- [x] H. Comment moderation — view grouped by episode, delete

**Database**
- [x] All 7 tables from the spec, on Turso/libSQL — schema verified by
      actually executing it against SQLite, including the `UNIQUE` and
      cascade-delete constraints (see the migration note in `schema.sql`)

**Security**
- [x] bcrypt-hashed password (bcryptjs, salt rounds 12), JWT sessions
- [x] Rate limiting: 3 comments/min/IP, 5 login attempts/15min
- [x] Input validation/sanitization on all admin fields
- [x] Embed URLs validated against Dailymotion/Rumble patterns, unit-tested
- [x] XSS protection — comments rendered via `textContent`/escaping, never `innerHTML` with raw text
- [x] CORS locked to `FRONTEND_ORIGIN`

**SEO & sharing**
- [x] Open Graph + Twitter Card tags per episode, dynamically served — via
      the `/share/episode/:id` proxy route (see §7 for why a plain static
      site needs this)

**Performance**
- [x] GPU-friendly animations (`transform`/`opacity`) everywhere except the
      color-cycle, which trades unavoidable paint cost for a single shared
      timer instead of many — see §7
- [x] Lazy-loaded thumbnails (`IntersectionObserver` + native `loading="lazy"`)
- [x] Skeleton loading states
- [x] No frontend framework, no bundler, no unnecessary libraries

**Nice-to-haves included**
- [x] Resume Watching, Next Episode, "New" badge (<24h), reduced-motion support, health-check endpoint

## 10. What I couldn't test end-to-end

This was built in a sandboxed environment with no network access, so I
couldn't `npm install` and boot the real server, or hit a real Turso/Render
instance. What I *could* do, and did:

- Ran the actual `schema.sql` against real SQLite — all tables, indices,
  the `UNIQUE` constraint, and cascade-delete all verified working.
- Unit-tested the Dailymotion/Rumble embed URL parser against 9 real-world
  input formats.
- Syntax-checked all 30 JS files (`node --check`).
- Cross-checked every `getElementById`/class selector the JS uses against
  the actual HTML — caught and fixed two real mismatches this way (a
  missing `.comments` wrapper, and a close-button class typo) before you
  ever saw them.
- Structurally validated the HTML (balanced tags).

What's left for a first real run: `npm install` in `backend/`, then
`npm run dev` and click through it locally against `local.db` before
deploying anywhere. I'd genuinely expect this to work close to as-is, but
a live smoke test is the one thing I have no way to fake from here.

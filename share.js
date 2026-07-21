// The spec asks for per-episode Open Graph/Twitter meta tags "served from
// the backend based on episode ID" — but the frontend is a static Netlify
// site with no server-side rendering, so a crawler hitting the Netlify URL
// directly would only ever see the generic homepage tags, not per-episode
// ones. This route is the fix: a small backend-rendered HTML page with the
// correct tags for one episode, which immediately redirects a human visitor
// on to the real frontend. Point "Share" buttons at
//   https://your-api.onrender.com/share/episode/:id
// instead of the Netlify URL, and link previews on Facebook/Telegram/
// Twitter will show the right title, description, and thumbnail.
const express = require('express');
const router = express.Router();
const db = require('../db/client');

const FRONTEND_URL = (process.env.FRONTEND_ORIGIN || 'https://your-site.netlify.app').replace(/\/$/, '');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

router.get('/episode/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM episodes WHERE id = ?', args: [req.params.id] });
    const ep = result.rows[0];
    const target = `${FRONTEND_URL}/#episode-${req.params.id}`;

    if (!ep) return res.redirect(302, FRONTEND_URL);

    const title = escapeHtml(ep.title);
    const image = escapeHtml(ep.thumbnail_url || '');
    const description = escapeHtml(`Watch ${ep.title} — Bangla dub, Episode ${ep.episode_number}. We Believe in Quality.`);

    res.set('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} — TVR Dubbers</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${FRONTEND_URL}/share/episode/${req.params.id}">
<meta property="og:type" content="video.episode">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>Redirecting to <a href="${target}">${title}</a>…</p>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.redirect(302, FRONTEND_URL);
  }
});

module.exports = router;

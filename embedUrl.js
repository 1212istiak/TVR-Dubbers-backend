// Turns whatever an admin pastes into "Primary/Backup server URL" — a plain
// watch-page URL, a share link, an embed URL, or a full <iframe> embed code —
// into one canonical, safe embed URL. Returns null for anything that isn't
// recognizably Dailymotion or Rumble, which routes/admin.js treats as a
// validation failure (spec: "reject anything else").

function extractSrcFromIframe(input) {
  const match = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : input;
}

function parseDailymotion(url) {
  const patterns = [
    /dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/i, // already an embed URL
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/i,          // watch-page URL
    /dai\.ly\/([a-zA-Z0-9]+)/i,                          // short share URL
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.dailymotion.com/embed/video/${m[1]}`;
  }
  return null;
}

function parseRumble(url) {
  const embedPattern = /rumble\.com\/embed\/([a-zA-Z0-9]+)/i; // already an embed URL
  const watchPattern = /rumble\.com\/(v[a-zA-Z0-9]+)-/i;       // watch-page URL, e.g. rumble.com/v4xyz1a-title.html

  let m = url.match(embedPattern);
  if (m) return `https://rumble.com/embed/${m[1]}/`;

  m = url.match(watchPattern);
  if (m) return `https://rumble.com/embed/${m[1]}/`;

  return null;
}

function parseEmbedUrl(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const url = extractSrcFromIframe(rawInput.trim());

  const dailymotion = parseDailymotion(url);
  if (dailymotion) return { platform: 'dailymotion', embedUrl: dailymotion };

  const rumble = parseRumble(url);
  if (rumble) return { platform: 'rumble', embedUrl: rumble };

  return null;
}

module.exports = { parseEmbedUrl };

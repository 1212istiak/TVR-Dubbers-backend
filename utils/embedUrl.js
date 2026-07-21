// Embed URL parser for Dailymotion and Rumble — accepts raw watch URLs,
// iframe embed HTML, or canonical embed URLs and returns a normalized
// embed src that the frontend can safely inject into an <iframe>.
const DM_REGEX = /(?:dailymotion\.com\/(?:video|embed)\/(?:video\/)?|dai\.ly\/)([A-Za-z0-9]+)/i;
const RUMBLE_REGEX = /(?:rumble\.com\/(?:v|embed)\/([A-Za-z0-9\-]+)|rumble.app\/embed\/v2\/([A-Za-z0-9\-]+))/i;

function parseEmbedUrl(input) {
  if (!input) return null;
  const s = String(input).trim();

  // If it's an iframe, try to extract the src attribute.
  const iframeMatch = s.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*><\/iframe>/i);
  const candidate = iframeMatch ? iframeMatch[1] : s;

  let m = candidate.match(DM_REGEX);
  if (m) return { provider: 'dailymotion', embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}` };

  m = candidate.match(RUMBLE_REGEX);
  if (m) {
    const id = m[1] || m[2];
    return { provider: 'rumble', embedUrl: `https://rumble.com/embed/v1/${id}` };
  }

  // If it's already an embed URL, accept it if it matches expected hostnames.
  try {
    const url = new URL(candidate);
    if (url.hostname.includes('dailymotion.com') && url.pathname.includes('/embed/')) return { provider: 'dailymotion', embedUrl: candidate };
    if (url.hostname.includes('rumble.com') && url.pathname.includes('/embed/')) return { provider: 'rumble', embedUrl: candidate };
  } catch (e) {
    // not a URL — fall through
  }

  return null;
}

module.exports = { parseEmbedUrl };

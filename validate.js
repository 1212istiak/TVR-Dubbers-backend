// Strips any HTML tags and trims to a max length. Used on every
// admin- and visitor-submitted text field before it touches the database.
// This is defense-in-depth: the frontend also escapes on render (never
// uses innerHTML with raw text), so a stored value would be neutralized
// even if something slipped past this layer.
function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  const stripped = input.replace(/<[^>]*>/g, '');
  return stripped.trim().slice(0, maxLength);
}

// Accepts any well-formed http(s) URL. Deliberately does NOT require a
// file extension — plenty of legitimate CDN/placeholder image URLs
// (signed URLs, query-string-based transforms) don't end in .jpg/.png.
function isValidImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { sanitizeText, isValidImageUrl };

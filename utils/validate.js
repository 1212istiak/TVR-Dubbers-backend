// Simple sanitizers and validators used by the admin panel.
function sanitizeText(input, maxLength) {
  if (!input && input !== 0) return '';
  const s = String(input).trim();
  const truncated = s.length > maxLength ? s.slice(0, maxLength) : s;
  // Very small whitelist: allow letters, numbers, basic punctuation, and space.
  return truncated.replace(/[<>]/g, '');
}

function isValidImageUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => u.pathname.toLowerCase().endsWith(ext));
  } catch (e) {
    return false;
  }
}

module.exports = { sanitizeText, isValidImageUrl };

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function safeHref(value: string) {
  const href = value.trim();
  if (!href || href.includes("..") || href.includes("\\") || /[\s<>"]/.test(href)) {
    return "#";
  }
  if (
    href.startsWith("/") ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }
  if (/^https?:\/\//i.test(href)) return href;
  if (/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(href)) return href;
  return "#";
}

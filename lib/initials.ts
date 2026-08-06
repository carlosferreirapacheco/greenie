// Pure, tested: derives 1-2 letter initials from a display name or
// username for the empty-avatar placeholder. Multi-word names use the
// first letter of the first and last word ("Carlos Pacheco" -> "CP");
// single-word names (usernames, which never contain spaces) use the
// first two characters ("cesar" -> "CE") so the placeholder always
// reads as a consistent 2-letter initial, not a lone letter.
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
}

/**
 * `User.avatarUrl` puede ser una URL remota o un glifo corto (p. ej. emoji).
 * Solo las URLs http(s) deben cargarse con `<Image source={{ uri }} />`.
 */
export function isRemoteAvatarUrl(url: string | null | undefined): boolean {
  const s = url?.trim();
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

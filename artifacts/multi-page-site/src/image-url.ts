export function getImageUrl(name: string, baseUrl: string): string {
  return `${baseUrl}images/${encodeURIComponent(name)}`;
}

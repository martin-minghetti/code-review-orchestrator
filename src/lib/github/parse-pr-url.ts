export interface PrRef {
  owner: string;
  repo: string;
  number: number;
}

const PR_URL_REGEX = /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

export function parsePrUrl(url: string): PrRef | null {
  const match = url.match(PR_URL_REGEX);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

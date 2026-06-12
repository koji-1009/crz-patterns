export interface FeedItem {
  id: number;
  title: string;
  body: string;
  seed: string;
}

export const PAGE_SIZE = 10;
export const TOTAL_PAGES = 10;

const TOPICS = [
  "Mountains",
  "Ocean",
  "Forest",
  "Desert",
  "City",
  "River",
  "Snow",
  "Sunset",
  "Lake",
  "Meadow",
] as const;

const BODIES = [
  "Statically generated at build time.",
  "Loaded on demand as you scroll.",
  "No framework runtime involved.",
  "Off-screen rows skip layout and paint.",
  "Plain HTML, CSS, and a few lines of script.",
] as const;

export function feedPage(page: number): FeedItem[] {
  return Array.from({ length: PAGE_SIZE }, (_, i) => {
    const id = (page - 1) * PAGE_SIZE + i + 1;
    const topic = TOPICS[(id - 1) % TOPICS.length] ?? "Item";
    return {
      id,
      title: `${topic} #${id}`,
      body: BODIES[(id - 1) % BODIES.length] ?? "",
      seed: `${topic.toLowerCase()}-${id}`,
    };
  });
}

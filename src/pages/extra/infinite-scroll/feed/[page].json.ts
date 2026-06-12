import type { APIRoute } from "astro";
import { feedPage, TOTAL_PAGES } from "../../../../data/feed";

// Page 1 is rendered into the HTML at build time; chunks 2..N are
// generated here as static JSON files, also at build time.
export function getStaticPaths() {
  return Array.from({ length: TOTAL_PAGES - 1 }, (_, i) => ({
    params: { page: String(i + 2) },
  }));
}

export const GET: APIRoute = ({ params }) => {
  return new Response(JSON.stringify(feedPage(Number(params.page))), {
    headers: { "Content-Type": "application/json" },
  });
};

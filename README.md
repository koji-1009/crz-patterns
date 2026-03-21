# CRZ Patterns

Interactive demo catalog proving that UI patterns commonly assumed to require SPA frameworks work with the web platform alone.

Built on [Crumple Zone Architecture](https://github.com/koji-1009/crumple-zone-architecture) (CRZ).

## Live Demo

[https://koji-1009.github.io/crz-patterns/](https://koji-1009.github.io/crz-patterns/)

## What This Proves

Every pattern in this catalog has a stated "AI's default choice" — the library or framework feature that SPA-trained AI tends to reach for. Each demo shows the same result achieved with browser-native APIs, HTML, and CSS.

| Pattern           | AI's Default Choice                  | Web Platform Technique               |
| ----------------- | ------------------------------------ | ------------------------------------ |
| Draft Persistence | useState + Context                   | sessionStorage                       |
| Input Validation  | Formik / react-hook-form             | HTML5 validation attributes          |
| Multi-step Form   | useState + Router                    | sessionStorage + URL path            |
| Tabs              | useState + onClick                   | URL path + Astro component           |
| Accordion         | useState + toggle                    | `<details>` + `interpolate-size`     |
| Dialog            | createPortal + useState + focus trap | `<dialog>` + `@starting-style`       |
| Tooltip           | Tippy.js / Floating UI               | CSS `:hover` + `::after`             |
| Toast             | react-toastify                       | Popover API + CSS transition         |
| Carousel          | Swiper.js                            | CSS `scroll-snap-type`               |
| Lightbox          | react-lightbox                       | `<dialog>` + CSS fade                |
| Hamburger Menu    | useState + toggle + click-outside    | `<details>` + container query        |
| Dark Mode         | ThemeProvider + Context              | CSS custom properties + localStorage |
| Loading Overlay   | isLoading useState + Suspense        | `<dialog>` + URL state               |
| Drag & Drop       | dnd-kit / react-beautiful-dnd        | HTML5 Drag and Drop API              |
| Clipboard         | useState + useRef                    | `navigator.clipboard`                |
| Autocomplete      | react-select / Downshift             | `<datalist>`                         |

## Architecture

* **Zero islands** — No React, Vue, or Svelte. All interactivity via `<script>` + CSS
* **URL as canonical source** — Tabs use URL path, loading overlay uses query params
* **sessionStorage for drafts** — Multi-step form and draft persistence
* **localStorage for preferences** — Dark mode only
* **Popover API / `<dialog>`** — Top layer for overlays, no `z-index` hacks
* **CSS animations at Layer 2** — `@starting-style`, `interpolate-size`, `::details-content`
* **ClientRouter with zero config** — One line in Layout, no `transition:animate` directives

## Tech Stack

* [Astro](https://astro.build/) 6 — Static output for GitHub Pages
* [Tailwind CSS](https://tailwindcss.com/) 4 — `@theme` tokens, no `@apply`
* No runtime dependencies beyond Astro and Tailwind

## Development

```bash
npm install
npm run dev
```

## Related

* [Crumple Zone Architecture](https://github.com/koji-1009/crumple-zone-architecture) — The architectural principles behind this catalog
* [Astronoha](https://github.com/koji-1009/astronoha) — A production application built with CRZ (Cloudflare Workers + D1)

## License

MIT

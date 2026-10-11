# CRZ Patterns

Interactive demo catalog proving that UI patterns commonly assumed to require SPA frameworks work with the web platform alone.

Built on [Crumple Zone Architecture](https://github.com/koji-1009/crumple-zone-architecture) (CRZ).

## Live Demo

[https://koji-1009.github.io/crz-patterns/](https://koji-1009.github.io/crz-patterns/)

## What This Proves

Every pattern in this catalog has a stated "SPA assumption" — the library or framework feature developers tend to reach for. Each demo shows the same result achieved with browser-native APIs, HTML, and CSS.

| Pattern           | SPA Assumption                       | Web Platform Technique               |
| ----------------- | ------------------------------------ | ------------------------------------ |
| Draft Persistence | useState + Context                   | sessionStorage                       |
| Input Validation  | Formik / react-hook-form             | HTML5 validation attributes          |
| Multi-step Form   | useState + Router                    | sessionStorage + URL path            |
| Tabs              | useState + onClick                   | URL path + `<nav>` + `aria-current`  |
| Accordion         | useState + toggle                    | `<details>` + `interpolate-size`     |
| Dialog            | createPortal + useState + focus trap | `<dialog>` + `command`/`commandfor` + `closedby` |
| Tooltip           | Tippy.js / Floating UI               | CSS `:hover` + `::after`             |
| Toast             | react-toastify                       | Popover API + `command`/`commandfor` |
| Carousel          | Swiper.js                            | CSS `scroll-snap-type`               |
| Lightbox          | react-lightbox                       | `<dialog>` + `command`/`commandfor`  |
| Hamburger Menu    | useState + toggle + click-outside    | `<details>` + container query        |
| Dark Mode         | ThemeProvider + Context              | CSS `light-dark()` + `color-scheme` + custom command (`--toggle-theme`) + localStorage |
| Loading Overlay   | isLoading useState + Suspense        | `<dialog>` + `closedby` + URL state  |
| Drag & Drop       | dnd-kit / react-beautiful-dnd        | HTML5 Drag and Drop API              |
| Clipboard         | useState + useRef                    | Custom command (`--copy`) + `navigator.clipboard` |
| Infinite Scroll (Feed) | useInfiniteQuery + react-infinite-scroll-component | IntersectionObserver + fetch + `<template>` |
| Seamless Pagination | SPA router + client-side query cache | Static pages + IntersectionObserver + `DOMParser` + `replaceState` |

## Architecture

* **Zero islands** — No React, Vue, or Svelte. All interactivity via `<script>` + CSS
* **URL as canonical source** — Tabs use URL path, loading overlay uses query params
* **sessionStorage for drafts** — Multi-step form and draft persistence
* **localStorage for preferences** — Dark mode only
* **Popover API / `<dialog>`** — Top layer for overlays, no `z-index` hacks
* **Declarative invocation** — `command` / `commandfor` bind a button to its dialog or popover in markup. The binding exists as soon as the element is parsed, so no click is lost waiting for a listener. `closedby="any"` gives light dismiss and `closedby="none"` refuses Esc, both without a `cancel` handler. Where a script still runs, it listens on the target and reads `event.source` — the browser owns the invocation, the script only owns what happens next
* **CSS animations at Layer 2** — `@starting-style`, `interpolate-size`, `::details-content`
* **Native view transitions** — CSS `@view-transition { navigation: auto }` for cross-document page transitions, no client-side router. An inline `<head>` script pins a stored theme (`.light` / `.dark`) on every page load, so preference survives navigation with no swap hook
* **Theme is CSS-first** — every color token is a `light-dark()` pair resolved by `color-scheme`, so the OS preference applies with JavaScript off. Filled surfaces pair with `on-*` text tokens (`text-on-primary`) for contrast in both themes

## Tech Stack

* [Astro](https://astro.build/) 7 — Static output for GitHub Pages
* [Tailwind CSS](https://tailwindcss.com/) 4 — the only styling method: `@theme` tokens, no `@apply`, no scoped `<style>`
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

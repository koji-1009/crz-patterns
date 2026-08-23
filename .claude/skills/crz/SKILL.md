---
name: crz
description: Implement Astro applications with Crumple Zone Architecture — trust the browser, design for failure modes, minimize client state. Use when writing or modifying Astro code (pages, components, islands, Actions, middleware, state placement, project structure).
---

<!-- Copy of skill/crz.md with Claude Code frontmatter. Edit skill/crz.md first, then mirror changes here. -->

# Astro Crumple Zone Implementation

Build healthy Astro applications with Crumple Zone Architecture. Trust the browser, design for failure modes, minimize framework dependency.

Prerequisite: Astro 7+ with `output: 'server'`. This architecture requires server-side rendering for middleware, API routes, and data fetching in frontmatter.

## Priorities

When concerns conflict, choose in this order:

1. Correctness > Experience
   * Data integrity and security are not traded for smoother interactions
2. Recoverability > Continuity
   * Ability to reconstruct state from canonical sources over never losing state
3. Visibility > Abstraction
   * Layer boundaries visible in code structure over boundaries hidden by framework
4. Simplicity > Richness
   * Fewer layers and less code over more features and interactivity

## Reliability Layers

1. HTML / Browser APIs
   * Never breaks. Use as foundation. Semantic correctness (`<button>`, not `<div onclick>`) is the precondition
   * Declarative invocation belongs here — `command` / `commandfor`, `popovertarget`, `<details>`, `<form method="dialog">`. Built-in commands are active as soon as the markup is parsed: no listener to attach, no hydration to wait for, no click lost in between
2. CSS
   * Breaks visually only. No functional impact. Interactions achievable with `:hover`, `:focus`, `::after`, or `:target` belong here — not in an island
3. Stateless island (props only)
   * Safe if inputs are correct. Guarantee inputs server-side
4. Stateful island (local state)
   * Highest risk. Minimize this layer

Rule: always ask "what happens if this breaks?" and implement in the lowest-numbered layer that accomplishes the task.

HTML output notes (Astro 7): unclosed tags are build errors. Invalid nesting (e.g., `<div>` inside `<p>`) is passed through as-is — the browser's error recovery restructures the DOM, so the rendered DOM diverges from the source. Author structurally valid HTML; the compiler does not correct it. Whitespace follows JSX rules by default (`compressHTML: 'jsx'`): whitespace within a single line is preserved (a space between two inline elements on the same line survives), while whitespace and line breaks around elements are removed. The one trap: inline elements separated by a line break lose their spacing — keep spaced inline elements on the same line, or write the space explicitly.

Islands in layers 3-4 should be wrapped in each framework's error boundary mechanism. If the island crashes, display a fallback UI instead of a blank space. This structurally enforces the isolation guarantee — the rest of the page remains intact.

Server-side errors: provide `pages/500.astro` for unhandled exceptions. In `---` frontmatter, catch expected errors (DB failures, external API errors) and render an error state in HTML. Action handlers throw `ActionError` with appropriate codes — the calling island or form receives the error and displays feedback.

Partial failure: when frontmatter fetches from multiple sources, catch each independently. Display successful results and show a warning banner for failed sources. Do not fail the entire page because one source is unavailable — this applies "Recoverability > Continuity" at the data level.

## Component Decisions

### Page Structure

Pages combine semantic HTML for structure with components at concern boundaries:

```astro
<Layout>
  <section>
    <h1>{title}</h1>
    <ItemFilter />
    <ItemTable items={items} />
  </section>
  <aside>
    <RecentActivity server:defer />
  </aside>
</Layout>
```

The page file holds frontmatter (data fetching, PRG handling), layout, the semantic HTML skeleton (landmarks, headings), and component composition — including conditional composition. Data display (lists, tables, cards, field groups) lives in extracted components. A page-level `<script>` is allowed only for behavior that spans multiple sections (see Script Behavior).

Extraction is the default, not the exception. When building a page, actively look for splittable components — any section you can name is a component. Signals, strongest first:

* It carries `<script>` behavior — repeated wiring is the strongest boundary marker (rule in Script Behavior)
* It fetches its own data (enables partial failure pattern)
* It has independent failure modes (limits blast radius)

Within a single page, extraction needs no reuse justification — decomposing `.astro` is free at runtime (compiles to HTML; props and slots are the only interface). Reuse across 2+ pages is the design-component context: promote to `shared/components/` (project-wide) or the feature's `components/` (feature-wide). Extraction bounds what an edit can touch — not runtime errors: an uncaught frontmatter error in any component still fails the whole SSR render (runtime containment comes from the partial failure pattern).

Inline HTML remains only for the skeleton and nameless structural glue (grid frames, dividers). Smell: an `.astro` file over ~100 lines — look for a boundary.

Guards — split wide, not deep:

* Compose one level per page (page → sections) by default. A deeper level needs its own nameable concern — never a pass-through component that only forwards props
* Do not extract what you cannot name — a component without a nameable concern is fragmentation, not decomposition

Use Astro (.astro) by default:

* Data display (tables, cards, lists)
* Navigation, layout, conditional rendering

Use islands only when local state is required:

* Forms with validation or dynamic fields
* Dialogs with internal state (validation, dynamic fields, multi-step) — the island owns the content, never the open/close
* Real-time calculations (price, filtering)
* Browser-native APIs (Geolocation, Web Speech)

Submit-only forms use `<form>` + `FormData` — no island needed.

Client directives:

* `client:idle` — default for most islands
* `client:load` — elements the user interacts with before scrolling (search box, primary navigation toggle)
* `client:visible` — for below-the-fold content

Server Islands (`server:defer`):

Defer server rendering of auxiliary components. The page loads with fallback content; the component renders asynchronously via a separate server request.

When to use frontmatter (default):

* Page's main content — block SSR to guarantee delivery
* Auxiliary content needed immediately — use partial failure pattern on error
* Content whose absence would mislead the user

When to use `server:defer`:

* Expensive computation where the user expects loading time (analytics charts, aggregated reports)
* Personalized content on an otherwise cacheable page (user profile widget on a public page)

Fallback design: if the Server Island fails, the fallback remains silently — no error UI, no retry. Design the fallback as content meaningful on its own, not just a loading indicator.

Decision test:

1. Can markup alone do it (open or close a dialog or popover, disclosure, submit)?
   * Yes → `command` / `commandfor`, `popovertarget`, `<details>`, `<form method="dialog">`. Layer 1. No script, no island
2. Does it need DOM manipulation without state (scroll-to-top, clipboard copy)?
   * Yes → `<script>` tag. Layer 1 (Browser API). No island needed
3. Does it declare local state? (useState / ref() / $state)
   * No → Astro component
   * Yes → Island. Group values that change together (e.g., form fields) into a single state object. Keep independently changing values as separate declarations. If the island's state serves more than one user interaction, split each interaction into its own island

Island verification — before writing an island, confirm each hook is necessary:

* useState holding server data → pass as props from frontmatter. No island needed
* useState for dialog/popover open state → `<dialog>` or `[popover]` driven by `command` / `commandfor`. No island needed
* useState for which accordion panel is open → `<details name="group">`. No island needed
* useState for tooltip/hover display → HTML `title` attribute or CSS `:hover`. No island needed
* useState for scroll/carousel position → CSS `overflow-x: auto`. No island needed
* useState for filter/sort selection → URL query params + server-side filtering. No island needed
* useEffect fetching data → move to frontmatter. Never fetch in islands
* useEffect syncing URL → URL is canonical. Use `<a>` or `window.location.assign()`
* useEffect for DOM manipulation without state → use `<script>` tag

If all state values are replaceable, the island is unnecessary — rewrite as `.astro` component or `<script>`.

For the fuller decision model including navigation-first evaluation, see architecture.md section 5.1.

### Declarative Invocation

Before reaching for `<script>` or an island, check whether markup already carries the behavior. `command` / `commandfor` binds a `<button>` to a target element by ID, and the browser handles activation, focus, top layer, and Esc.

```astro
---
const { item } = Astro.props;
const dialogId = `confirm-${item.id}`;
---
<button type="button" command="show-modal" commandfor={dialogId}>Delete</button>

<dialog id={dialogId}>
  <p>Delete {item.name}?</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
  </form>
  <form method="POST">
    <input type="hidden" name="id" value={item.id} />
    <button type="submit">Delete</button>
  </form>
</dialog>
```

Built-in commands: `show-modal`, `close`, `request-close` (fires a preventable `cancel` first), `show-popover`, `hide-popover`, `toggle-popover`. `value` on a closing button sets the dialog's `returnValue`.

Rules:

* Always write `type="button"` on a command button. Inside a `<form>` it is required: with the default type the browser returns from the button's activation behavior before it ever reads `commandfor`, so the command never runs and nothing is reported. Outside a form it costs nothing and keeps one rule
* Failures are silent by design. A `commandfor` naming no element, a command value that is neither built-in nor `--`-prefixed, and a dialog command aimed at something that is not a `<dialog>` all do nothing — no error, no event. IDs are derived from props here, so a bad interpolation fails this way
* The command event is cancelable and does not bubble. `preventDefault()` on it cancels the built-in action, and `preventDefault()` on the button's `click` stops the command event from firing at all. Not bubbling means document-level delegation receives nothing — wire each target
* That cancelation covers command buttons only. Esc, `<form method="dialog">`, and `close()` fire no command event, so a guard built on it lets those paths through. To hold every dismissal, close with `command="request-close"` and listen for the dialog's own `cancel` event, which Esc raises too — and keep `command="close"` and `<form method="dialog">` out of a dialog that needs guarding, since both close without raising it
* Do not open a dialog from a script when a button opens it. `dialog.showModal()` behind a click listener is the SPA-era form: it rebuilds in JS what the button already declares, and it stays inert until that listener attaches. Write `command="show-modal"`. The script form belongs in the project-level fallback below the support floor, and the fact that such a fallback is possible is not a reason to write one by hand
* Openings that no user action triggers are the exception — an Action failing, a session about to expire, a server-sent event. There is no button to declare, so the island that owns that outcome calls `showModal()`. This stays an exception because the trigger is a program event, not an interaction
* Dialog open/close is not state. An island holding `isOpen` moves a layer-1 construct into layer 4. The island owns dialog content only when that content needs validation, dynamic fields, or multi-step flow
* IDs are the binding. A component rendered N times needs N unique IDs — derive them from props, the same constraint as a component `<script>` running once for N instances
* Modal overlays use `<dialog>` + `show-modal`. Non-modal ones (menus, toasts, hint panels) use `popover` + `popovertarget` or `command="toggle-popover"`. Accordions and disclosure use `<details>` / `<details name>`. Never build any of these from a `div` plus class toggling
* `closedby="any"` (light dismiss) is not Baseline. Add it as an enhancement and always keep an explicit close control
* Behavior with no built-in command is a custom command, not a click listener on the button. The name starts with `--`, and the browser dispatches a `CommandEvent` on the target
* The support floor decides the fallback, not the calendar. `command` / `commandfor` shipped in every engine in 2025-12, so a project serving current browsers takes it as-is. Where the floor reaches older versions, add one feature-detected fallback script at the layout level (`'command' in HTMLButtonElement.prototype`) — one project-wide crumple zone, never per-component wiring, deleted when the floor clears

Custom commands:

```astro
---
const { token } = Astro.props;
const fieldId = `token-${token.id}`;
---
<button type="button" command="--copy" commandfor={fieldId}>Copy</button>
<output id={fieldId} data-token-field>{token.value}</output>

<script>
  document.querySelectorAll("[data-token-field]").forEach((field) => {
    field.addEventListener("command", (event) => {
      if (event.command === "--copy") {
        navigator.clipboard.writeText(field.textContent ?? "");
      }
    });
  });
</script>
```

* The listener goes on the target, so the script belongs to the target's component — not the button's. This is the same rule as behavior living with the markup it drives
* `event.command` distinguishes several commands on one target, replacing a set of separate click listeners. `event.source` identifies which button was pressed, so multiple triggers for one target need no extra wiring
* The listener is still ordinary JS, so this variant carries the same "inert until the script runs" gap as any listener. The gain is the binding and the wiring, not the removal of the gap

### Script Behavior

`<script>` handles layer-1 behavior that no markup declares: scroll, clipboard, focus moves, measurement. Opening and closing dialogs and popovers is not in this set — that is Declarative Invocation above. Keep each script next to the markup it drives:

* One component, one concern, one `<script>`. A page script wiring two unrelated widgets is the signal to split — extract each widget's markup together with its script into a dedicated component
* Repeated script behavior is a component-boundary detector. The same wiring appearing twice — across sections or pages — marks a component to extract, owning both the markup and the script
* Cross-cutting behavior that reads fields across sections is the parent's concern. Keep it at the parent — a page-level `<script>` is the legitimate home for section-spanning behavior. Pushing it into a child forces the child to query ancestor DOM
* The goal is locality of source, not DOM sandboxing. Astro `<script>` is module-scoped, and document-wide `querySelector` is acceptable. Do not add wrapper elements or `data-scope` attributes just to narrow queries
* A component's `<script>` runs once per page even when the component renders N times. Wire with `querySelectorAll` or `data-*` lookups and per-element listeners — never assume a single instance
* The moment a behavior needs local state, it becomes an island (see decision test) — split the markup, not the script

For the reasoning behind granularity and behavior locality, see architecture.md section 5.5.

## Pages and Data

Execution boundary: the `---` block runs on the server. The HTML below it is the output. No JavaScript reaches the browser unless explicitly added via `<script>` or an island. Do not define client-side functions in frontmatter.

* Fetch dynamic data (DB, API — changes per request) in `.astro` frontmatter. Never fetch in islands
* Static configuration may be imported directly in islands — no need to serialize through props. A module is static configuration if it requires no server-side execution (no I/O, no async, no secrets). Examples: `as const` objects, Zod schemas, enum definitions, display constants
* Pass only rendering data as props. Never pass auth tokens, API keys, or session data
* Use `Astro.locals` (set by middleware) for auth/role data

```astro
---
const role = Astro.locals.role;
if (!role) return Astro.redirect("/login");
const items = await getItems();
---
<Layout>
  <ItemTable items={items} />
  <EditForm client:idle initialData={items[0]} />
</Layout>
```

## State Placement

Canonical sources (same value on every read):

| State                                                      | Where                                           | Why                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auth / session                                             | HttpOnly Cookie                                 | Server-readable, hidden from JS                                                        |
| Current page                                               | URL path                                        | Browser-managed                                                                        |
| View state (filters, pagination, sort, search, active tab) | URL query params                                | Shareable, bookmarkable, reproducible — with or without authentication                 |
| In-progress data                                           | sessionStorage                                  | Per-tab, survives navigation                                                           |
| User preferences                                           | Server-side DB / HttpOnly Cookie / localStorage | DB if backend exists; cookie if BFF-only and server reads; localStorage if client-only |

URL vs cookie is not about authentication — it is about state type. View state (what you are looking at) always goes in the URL, even in authenticated apps. Identity state (who you are) goes in cookies. Preference state (how you want things) goes in DB or cookies. When URL params and cookie defaults overlap, URL params take precedence.

Transient state (lost on reload):

* Form input where the UI updates before submission (validation errors, dynamic fields, live preview) → component local state (controlled component)

A controlled component moves value from HTML to framework — higher to lower reliability. If the UI does not update before submission, use `<form>` + `FormData`.

Never use:

* Global state libraries (Redux, Zustand, Jotai, Pinia, Vuex, Svelte stores)
* Cross-island state sharing (Context, provide/inject)
* localStorage for auth/session

## Mutation Pattern

Server handles correctness, client provides feedback as a crumple zone.

Client-initiated mutations that accept user input requiring validation must use Astro Actions (`astro:actions`). Actions provide type-safe server functions with built-in Zod validation — the caller gets compile-time type errors if the contract is violated. Mutations without user input (logout, session clear) use `<form method="POST">` with PRG — no Action needed. Navigation without data change uses `<a>` — not an Action.

```typescript
// src/actions/index.ts
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";

export const server = {
  createItem: defineAction({
    accept: "form",
    input: z.object({ name: z.string().min(1) }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) throw new ActionError({ code: "UNAUTHORIZED" });
      return await saveItem(input, user);
    },
  }),
};
```

Choose the lowest layer that meets the requirement:

1. `<form method="POST">` with PRG — pure HTML. No Action, no JS. Use when the form carries no user-authored content (logout, deletion by ID, re-processing a previous result). POST processes the request, stores results in `Astro.session` if needed, and redirects. This avoids the browser's "resubmit form?" warning on reload
2. `<form action={actions.createItem}>` — HTML + Action. Still zero JS. Use when POST accepts user input that requires type-safe Zod validation and structured error handling
3. Island calls `actions.createItem()` — JS required. Use only when the mutation requires JS to modify the DOM (disable button, show spinner, display error, update list without reload)

PRG pattern (layer 1):

```astro
---
if (Astro.request.method === "POST") {
  const formData = await Astro.request.formData();
  const result = await analyze(formData);
  await Astro.session.set("result", result);
  return Astro.redirect(Astro.url.pathname);
}
const result = await Astro.session.get("result");
---
<form method="POST">
  <input name="query" />
  <button>Analyze</button>
</form>
{result && <ResultView data={result} />}
```

Action definition:

* `accept: "form"` — for `<form>` submissions (layer 2). Prefer this
* `accept: "json"` — for programmatic calls from islands (layer 3). Use when the island constructs the payload without a form element

Client feedback (crumple zone):

1. Submission starts → disable button, show progress
2. Success → reconstruct from canonical sources:
   * `window.location.reload()` — redisplay the same page
   * `window.location.assign(url)` — move to another page
3. Failure → re-enable button, show error

If feedback breaks, the action still completes or fails correctly on the server.

View/Wrapper separation — when an island calls Actions, separate View from integration:

* View (`react/ItemFormView.tsx`): pure React component. Receives data and callbacks as props. No `astro:actions` import
* Wrapper (`ItemForm.tsx`): imports `astro:actions`, manages state, passes props to View

The wrapper is the crumple zone between UI and server actions. View changes and action logic changes stay independent. Split when the View has enough complexity that framework integration (astro:actions, state management) should not live alongside rendering logic. A single-action button does not need separation.

`pages/api/` is only for external consumers (webhook receivers, SSE/streaming) — not for mutations initiated by the client. Client-initiated mutations — including file uploads — use Actions (`accept: "form"` handles FormData with files) with processing logic in `features/*/data/`. Mutations without user input (logout, session clear) use PRG.

## Security Boundary

The Astro server is a BFF — trust boundary between browser and backend.

Required for all applications:

* HTTPS in production
* All cookies: `HttpOnly` + `SameSite=Lax` + `Secure`
* External API calls only in `.astro` frontmatter or API routes
* Validate all API route inputs with Zod

When authentication is required:

* Middleware checks auth on every request

Forbidden:

* Islands fetching external APIs directly
* Secrets in `PUBLIC_` env vars
* Auth tokens or API keys as island props
* Auth data via `document.cookie`

Browser-native APIs (Geolocation, Chrome AI, Web Speech) belong to the HTML/Browser API layer. Browser choice is the user's responsibility.

Middleware:

```typescript
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const session = context.cookies.get("session")?.value;
  context.locals.user = session ? await resolveUser(session) : null;

  // API routes check context.locals.user and return HTTP status directly.
  // No redirect — they validate their own input (Zod).
  if (context.url.pathname.startsWith("/api/")) return next();

  if (!session && !isPublicPath(context.url.pathname)) {
    return context.redirect("/login");
  }

  return next();
});
```

Advanced routing (`src/fetch.ts`):

* `src/fetch.ts` is a reserved filename. Creating it replaces Astro's default request pipeline entirely — the exported `fetch()` must call the `astro()` handler (or compose `astro/fetch` handlers), otherwise middleware, Actions, and page rendering never run and every route breaks
* Do not create this file by default. Use it only for cross-cutting infrastructure that middleware cannot express (structured logging around pipeline phases, tracing, Hono interop), and always delegate to `astro()`
* Auth and authorization stay in middleware. Do not move them into `fetch.ts` — one visible security boundary, not two

## ViewTransition

Crumple zone — if transitions break or are unsupported, navigation still works.

Use browser-native cross-document view transitions. Do not add `<ClientRouter />` — it converts the MPA into an SPA at runtime, reintroducing the client-side routing layer this architecture minimizes.

```css
/* global stylesheet */
@view-transition {
  navigation: auto;
}
```

* The default crossfade applies to the entire page — no per-component directives needed
* Unsupported browsers (currently Firefox) fall back to standard MPA navigation — experience degradation, not functional failure
* Every navigation is a full page load. Use `DOMContentLoaded` (or `pagereveal` for transition timing), and write idempotent `<script>` initialization — scripts run on every page load
* Never call `history.pushState()` or `history.replaceState()` in islands — the URL is a canonical source. To update query params (filters, pagination), use `<a>` or `window.location.assign()` with the new query string
* Customize with standard CSS only: `view-transition-name`, `::view-transition-old()` / `::view-transition-new()`

## Project Structure

```
src/
  middleware.ts
  pages/
    api/                    — endpoints for external consumers only (webhook receivers, SSE/streaming)
  features/
    {feature}/
      types.ts
      data/                 — data I/O, server-only (backend boundary: swap internals without changing callers). API fetch, file processing, DB queries, storage writes. Only frontmatter and Action handlers call into data/. Islands must not import from this directory
      components/           — .astro (display) + island wrappers (Action integration)
        react/              — pure React views (no Astro imports, no framework integration)
  shared/
    layout/                 — AdminLayout, UserLayout
    components/             — project-specific shared components (Pagination, Badge). Built from ui/ primitives
    lib/                    — generic utilities only (date formatting, string helpers). Domain-specific logic belongs in features/
    types/                  — shared type definitions
  components/ui/            — third-party UI primitives (shadcn/ui, etc.). If not using a UI library, this directory is unnecessary — put primitives in shared/components/
```

## Test Strategy

Test effort follows the reliability layers:

1. Layer 1-2 (HTML/CSS, SSR output)
   * E2E tests (Playwright). Verify that server-rendered pages return correct content and structure
2. Server (Actions / data access)
   * Unit tests. Guarantee server-side correctness — validation, authorization, data mutations
3. Islands (layers 3-4)
   * Storybook for human visual/interaction review. Whether feedback is appropriate is a human judgment
   * Automated tests (Playwright, component tests) raise confidence but do not determine correctness — they verify mechanics (button disables, error shows), not UX quality

The implementation layer determines test stability. A control the browser drives (`command` / `commandfor`, `<form>`, `<a>`) is active as soon as the markup is parsed, so an E2E click on it needs no wait condition. A control a listener drives is inert until its script executes — an island's until hydration completes — so the test must wait for evidence that the listener exists, or it is flaky. A click that needs a retry or an arbitrary wait is a finding about the implementation layer, not about the test.

Test directory mirrors source structure:

```
tests/
  fixtures/                     — real API response samples
  features/
    {feature}/
      data/
        {module}.test.ts
  shared/
```

Test shared infrastructure (fetch wrappers, caching, rate limiting) in shared test files. Consumer tests should not re-test shared behavior — they test their own logic assuming the shared layer works.

The server is the source of correctness. Test the server thoroughly; verify islands with human eyes.

## Post-Application Review

After applying CRZ principles, review every change against these checks before finalizing:

1. **Blast radius check**
   * For each new layer or pattern introduced, answer: "What happens if this breaks?" If the answer is "nothing, because the layer below already handles it," the layer is redundant.
2. **Canonical source honesty**
   * Is the declared canonical source genuinely authoritative, or is it a derived cache being treated as one? A sessionStorage copy of server data is a cache, not a canonical source. Name the actual authority and acknowledge stopgaps as stopgaps.
3. **Dead code check**
   * Are all exported functions called? Unused initializers, sync functions, or cache hydration calls indicate an over-designed layer.
4. **Simplicity check**
   * Did the change add a layer, abstraction, or intermediate state? Is that layer actually needed, or does a simpler mechanism (SSR props, direct DOM update, existing browser API) already solve the problem? Remove any layer that exists only to satisfy a principle rather than to solve a real problem.
5. **Component decomposition check**
   * Pages hold frontmatter, layout, semantic skeleton, and composition — data display lives in components; a page-level `<script>` only for section-spanning behavior. Every nameable section is extracted; inline HTML remains for the skeleton and nameless glue. The same markup on 2+ pages → promote to `shared/components/` (design-component context). Repeated script wiring marks a missed component boundary. An `.astro` file over ~100 lines needs a boundary search. No pass-through components that only forward props.
6. **Island necessity check**
   * For each island, list every `useState` call. Can each value be a server prop, URL query param, HTML attribute, CSS rule, declarative invoker (`command` / `commandfor`, `popovertarget`, `<details>`), or `<script>` DOM call? If yes for all values, the island should be an `.astro` component. An `isOpen` boolean is answered by the invoker wherever a button opens the dialog, which is the usual case.
7. **Document consistency check**
   * Does the change add, remove, or rename a feature, route, or component? If yes, verify that CLAUDE.md, PROJECT.md, and any other project documentation reflect the current state. Deleted features must be removed from documentation.

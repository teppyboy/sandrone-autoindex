# AGENTS.md

These rules apply to any AI agent working in this repository.

## Project Aim

- This project is a nginx autoindex UI written in React with Vite.
- It does not replace nginx autoindex generation or act as a standalone file server.
- nginx (or Angie) still serves the native directory index HTML; this app enhances that output in the browser with a better interface.
- The main user-facing goals are better directory browsing, sorting, filtering, breadcrumbs, mobile usability, and theme customization.
- WebDAV is used for authenticated file operations (upload, create, rename, move, delete). The app itself does not serve files — nginx does.

## How It Works

- nginx is expected to keep `autoindex on` enabled and inject generated snippets with `add_before_body` and `add_after_body`.
- The build creates `dist/before.html` and `dist/after.html` from `vite.config.ts`; those snippets load the CSS, add the React mount node, and load the JS bundle.
- `src/main.tsx` mounts React only when `#autoindex-root` exists.
- `src/lib/parser.ts` reads the native nginx autoindex DOM, especially the `h1` and `pre` content, and converts it into structured entries used by the React UI.
- `src/App.tsx` is the main autoindex application (~2200+ lines). It renders the enhanced listing UI, hides the `_autoindex` directory from the display, and manages search, sort, layout, theme, palette, mobile behavior, file operations, multi-select, drag-and-drop, and client-side navigation.
- `src/index.css` hides the original nginx autoindex markup when the enhanced UI is active and defines the theme tokens, palettes, Sandrone background styling, drag-and-drop styles, checkbox animation styles, and navigation transition styles.
- WebDAV authentication is handled via `useWebDavSession` hook with Basic Auth. All file operations are gated behind `isAuthenticated`.
- Client-side navigation (`navigateToDirectory`) uses `fetch()` + `parseAutoindex` + `history.pushState` to avoid full page reloads when navigating directories.

## Repository Structure

### Core files

- `src/App.tsx`: main application shell (~2200+ lines). Contains inline components `FileRow`, `FileCard`, `BreadcrumbNav`, `BreadcrumbSegmentItem`, `BreadcrumbOverflowMenu`. Manages directory listing, search/filter, sort, layout switching (list/grid), breadcrumbs, theme, WebDAV auth integration, file operations (create/rename/move/delete), multi-select with bulk actions, drag-and-drop upload/move, and SPA-style navigation.
- `src/main.tsx`: app entry point and conditional mount.
- `src/lib/parser.ts`: parser for native nginx autoindex HTML, plus `parentHref()` and `pathSegments()` helpers. Exports `Entry`, `ParsedIndex`, `BreadcrumbSegment` types.
- `src/lib/types.ts`: shared UI types — `SortKey`, `SortDir`, `ViewMode`, `Theme`, `Palette`.
- `src/lib/utils.ts`: `cn()` utility (clsx + tailwind-merge).
- `src/lib/useIsMobile.ts`: hook returning boolean for viewport < 768px.
- `src/index.css`: global styles, theme tokens, palette variants, Sandrone glassmorphism theme, autoindex-specific CSS, drag-and-drop styles, multi-select checkbox animation, navigation transition.

### Autoindex components (`src/components/autoindex/`)

| Component | Purpose |
|-----------|---------|
| `AuthSheet.tsx` | WebDAV sign-in dialog with username/password, remember-me |
| `BulkActionBar.tsx` | Action bar shown when items are selected (move, delete, download, deselect) |
| `CreateFileSheet.tsx` | Dialog for creating empty files via WebDAV PUT |
| `CreateFolderSheet.tsx` | Dialog for creating directories via WebDAV MKCOL |
| `DeleteConfirmSheet.tsx` | Confirmation dialog before WebDAV DELETE |
| `DestinationPicker.tsx` | Shared breadcrumb + subdirectory picker (used by MoveSheet and UploadSheet) |
| `DropOverlay.tsx` | Full-screen overlay during OS file drag-and-drop |
| `EntryActions.tsx` | Per-entry kebab menu (rename, move, delete) |
| `FileIcon.tsx` | File type icon based on extension |
| `MobileSearchSheet.tsx` | Mobile-optimized search input sheet |
| `MoveSheet.tsx` | Dialog for moving entries via WebDAV MOVE, uses DestinationPicker |
| `RenameSheet.tsx` | Dialog for renaming entries via WebDAV MOVE |
| `SettingsSheet.tsx` | Theme, palette, view mode, background settings |
| `UploadSheet.tsx` | Upload queue manager with destination picker, progress, conflict handling |

### UI primitives (`src/components/ui/`)

shadcn/ui components: `badge`, `breadcrumb`, `button`, `button-variants`, `card`, `checkbox`, `dropdown-menu`, `input`, `scroll-area`, `separator`, `sheet`, `table`, `tooltip`. All use `@base-ui/react` as the headless foundation (NOT Radix).

### WebDAV integration (`src/lib/webdav/`)

| File | Purpose |
|------|---------|
| `auth.ts` | Basic Auth credential storage (localStorage/sessionStorage) |
| `client.ts` | All WebDAV HTTP operations — see below |
| `types.ts` | WebDAV types — session status, capability, upload items, file operation status |
| `useWebDavSession.ts` | React hook managing full auth lifecycle (sign-in, sign-out, capability checks) |
| `useUploadQueue.ts` | React hook managing upload file queue state |

**Exported functions in `client.ts`:**
- `WebDavError` — custom error class with HTTP status
- `getCurrentDirectoryUrl()`, `getWebDavAuthCheckUrl()` — URL builders
- `buildUploadUrl()`, `buildResourceUrl()`, `buildDestinationUrl()` — resource URL builders
- `detectWebDavServerSupport()` — OPTIONS/HEAD probe for WebDAV support
- `verifyWebDavCredentials()` — validates Basic auth header
- `probeWriteSupport()` — checks write capability for current directory
- `refreshAutoindexListing()` — re-fetches current page, returns `ParsedIndex`
- `fetchDirectoryListing(url)` — fetches arbitrary directory, returns `Entry[]`
- `checkResourceExists()` — HEAD request to check existence
- `uploadFile()` — XMLHttpRequest PUT with progress callback
- `moveResource()` — WebDAV MOVE with optional overwrite
- `deleteResource()` — WebDAV DELETE
- `createDirectory()` — WebDAV MKCOL
- `createEmptyFile()` — WebDAV PUT with empty body
- `getWebDavStatusMessage()` — maps HTTP status codes to user messages

### Other

- `public/*`: static assets copied into the build output.
- `dist/*`: generated build output for deployment. Treat this as generated output, not source of truth.

## Build And Deployment

- Use the scripts defined in `package.json`: `bun run dev`, `bun run build`, `bun run lint`, and `bun run preview`.
- The Vite base path is `/_autoindex/`. Keep that in mind when changing asset paths or deployment assumptions.
- The build intentionally writes stable asset names such as `assets/index.js` and `assets/index.css` because nginx snippet injection expects predictable filenames.
- For deployed behavior, the important artifacts are the built assets together with `dist/before.html` and `dist/after.html`.
- Do not manually edit generated files in `dist` when the real change belongs in source files like `src/*` or `vite.config.ts`.
- React Compiler (`babel-plugin-react-compiler`) is enabled — it automatically memoizes components. Do not add manual `useMemo`/`useCallback` unless the linter specifically requires it.

## Key Architectural Patterns

### Selection state

Multi-select uses three pieces of state:
- `selectedHrefs: Set<string>` — raw selected entry hrefs
- `selectionPath: string` — the path when selection was made
- `effectiveHrefs` — derived via `useMemo`, returns `selectedHrefs` only if current path matches `selectionPath`, otherwise empty set

This automatically clears selection when navigating to a different directory without needing effects. Toggle via `toggleSelect(href)`, `selectAll()`, `clearSelection()`.

### File operations pattern

All file operations follow a consistent pattern:
1. State: `target` (Entry | null), `status` (FileOperationStatus), `error` (string | null)
2. Handler: sets status to "loading", calls WebDAV function, refreshes listing on success, sets error on failure
3. Sheet component: receives target/status/error as props, calls handler on submit
4. Close handler: resets target to null, status to "idle", error to null

### Client-side navigation

`navigateToDirectory(href, replace?)` in App.tsx:
- Fetches HTML via `fetch()`, parses with `parseAutoindex()`, updates state
- Uses `history.pushState`/`replaceState` for URL updates
- Falls back to `window.location.assign()` on failure
- Content area has CSS class `.navigating` during navigation (fades to 50% opacity)
- `popstate` listener handles browser back/forward buttons

### Drag-and-drop

- Internal drags use custom MIME type `application/x/sandrone-entry` with JSON payload
- OS file drags detected via `dataTransfer.types.includes("Files")`
- Drag counter pattern (increment/decrement) prevents flicker on overlay
- `draggable={isAuthenticated}` — only authenticated users can drag
- Drop targets are directories only; entries filter out the dragged item from drop targets

### CSS animation patterns

- `.entry-checkbox`: collapsed via `max-width: 0`, expands on `.entry-row:hover` or `.entry-card:hover`
- `.drag-overlay`: full-page overlay with fade-in animation for OS file drops
- `.autoindex-content.navigating`: opacity fade during directory navigation
- `.dragging`: reduced opacity for dragged items
- `.drag-over-directory`: dashed ring highlight on valid drop targets

## Linter Rules & Known Issues

### Pre-existing lint error (do not fix unless asked)

`src/components/autoindex/AuthSheet.tsx:60` has a `react-hooks/set-state-in-effect` error from calling `setUsernameValue()` inside a `useEffect`. This was in the codebase before recent changes. Do not attempt to fix it unless the user explicitly asks.

### Strict rules enforced

The linter (`eslint-plugin-react-hooks`) enforces strict rules that will cause build failures:

1. **Never call `setState` synchronously in effects.** The `react-hooks/set-state-in-effect` rule will error. Alternatives:
   - Derive state from props using `useMemo` instead of syncing via effect
   - Use a `selectionPath`-style pattern where the effect is avoided entirely
   - Set state only inside async callbacks (`.then()`, event handlers)

2. **Never access refs during render.** The `react-hooks/refs` rule will error on `ref.current` reads/writes outside effects or event handlers.

3. **Never access variables before declaration.** Define functions/effects in the correct order. Move helper functions before the `useEffect` hooks that reference them.

### Running lint

```bash
bun run lint 2>&1
```

Expect the pre-existing `AuthSheet.tsx:60` error. All other files should pass clean.

## Component Conventions

### Sheet/dialog pattern

All dialogs use `Sheet` from `@/components/ui/sheet`:
- Mobile: `side="bottom"` with `max-h-[85dvh] overflow-y-auto rounded-t-2xl` or full-screen for UploadSheet
- Desktop: `side="right"` with `w-96 sm:max-w-96` or `w-[28rem]` for UploadSheet
- Mobile drag handle: `<div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />`

### Status pattern

Operations use:
```typescript
type FileOperationStatus = "idle" | "loading" | "error";
```
Along with a separate `error: string | null` for messages. Handlers set status to "loading" before the operation, "idle" on success, "error" on failure.

### Props drilling

- `isMobile` — from `useIsMobile()` hook, passed to most components
- `isAuthenticated` — from `useWebDavSession()`, gates file operations and drag-and-drop
- `disabled` — typically `!canUseUpload || !authorization`

### Button styling for non-Button elements

When styling a non-`Button` element (like `TooltipTrigger`) as a button, use `buttonVariants` from `@/components/ui/button-variants`:
```tsx
<TooltipTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "...")}>
```
Do NOT use `asChild` — the base-ui `TooltipTrigger` does not support it.

### Class merging

Always use `cn()` from `@/lib/utils` for conditional class merging. Never concatenate class strings manually.

## Agent Caveats

- Do not treat `index.html` as the production page structure. It is a local development/demo fixture that simulates nginx autoindex output with hardcoded sample data.
- `App.tsx` is very large (~2200+ lines) with many inline components (`FileRow`, `FileCard`, `BreadcrumbNav`, etc.). Read the full file before making changes to understand the structure.
- Changes to parsing behavior should be made carefully. `src/lib/parser.ts` depends on nginx autoindex formatting, including the `Index of ...` heading and the `pre` block layout.
- If you need to change snippet output such as the theme init script, mount markup, or generated include files, update `vite.config.ts` rather than editing `dist/before.html` or `dist/after.html` directly.
- The app persists UI preferences in `localStorage`, including theme, palette, view mode, background brightness, and blur. Keep the runtime app logic and the pre-mount theme init script in sync.
- The `_autoindex` directory is intentionally hidden from the rendered file listing so the deployed theme assets do not show up as a normal directory entry.
- The `loaded` variable in App.tsx is hardcoded to `true`. The loading screen branch is dead code.
- `refreshAutoindexListing()` fetches the current page URL. `fetchDirectoryListing(url)` fetches an arbitrary directory URL. Use the right one for your use case.
- The `DestinationPicker` component is shared between `MoveSheet` and `UploadSheet`. It handles breadcrumb navigation and subdirectory fetching.

## Tooling Defaults

- This project uses Bun with Vite + React.
- React Compiler is enabled via `babel-plugin-react-compiler` — it automatically handles memoization.
- For new UI work, prefer `shadcn/ui` unless the repository already has a different established UI system. The UI primitives use `@base-ui/react` as the headless foundation.
- When following setup docs or generator examples, use the latest stable official commands and packages. Do not use outdated or deprecated examples when newer official guidance exists.
- For regular package installs, use `bun add <pkg>` and `bun add -d <pkg>`.
- When using `bunx`, you MUST include `--bun` to force the Bun runtime.
- Always prefer commands in this form:

```bash
bun add <pkg>
bun add -d <pkg>
bunx --bun <tool>@latest ...
bunx --bun shadcn@latest init
bunx --bun shadcn@latest add <component>
```

- NEVER use commands in this form:

```bash
bunx <tool> ...
npx ...
pnpm dlx ...
yarn dlx ...
```

- Never use deprecated `shadcn-ui` CLI examples.
- Do not use `next`, `canary`, `beta`, or `rc` versions unless the repository already uses them or the user explicitly requests them.
- If the repository already pins a version or uses an established UI system, follow existing repo constraints instead of replacing them blindly.

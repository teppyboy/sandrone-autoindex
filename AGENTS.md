# AGENTS.md

These rules apply to any AI agent working in this repository.

## Project Aim

- This project is a nginx autoindex UI written in React with Vite.
- It does not replace nginx autoindex generation or act as a standalone file server.
- nginx (or Angie) still serves the native directory index HTML; this app enhances that output in the browser with a better interface.
- The main user-facing goals are better directory browsing, sorting, filtering, breadcrumbs, mobile usability, and theme customization.

## How It Works

- nginx is expected to keep `autoindex on` enabled and inject generated snippets with `add_before_body` and `add_after_body`.
- The build creates `dist/before.html` and `dist/after.html` from `vite.config.ts`; those snippets load the CSS, add the React mount node, and load the JS bundle.
- `src/main.tsx` mounts React only when `#autoindex-root` exists.
- `src/lib/parser.ts` reads the native nginx autoindex DOM, especially the `h1` and `pre` content, and converts it into structured entries used by the React UI.
- `src/App.tsx` is the main autoindex application. It renders the enhanced listing UI, hides the `_autoindex` directory from the display, and manages search, sort, layout, theme, palette, and mobile behavior.
- `src/index.css` hides the original nginx autoindex markup when the enhanced UI is active and defines the theme tokens, palettes, and Sandrone background styling.

## Repository Structure

- `src/App.tsx`: main application shell, directory listing UI, state, filtering, sorting, layout switching, and responsive behavior.
- `src/main.tsx`: app entry point and conditional mount.
- `src/lib/parser.ts`: parser for native nginx autoindex HTML, plus breadcrumb and parent-path helpers.
- `src/lib/types.ts`: shared UI types such as sort key, sort direction, theme, palette, and view mode.
- `src/components/autoindex/*`: feature-specific components for the autoindex UI, such as icons and mobile/settings sheets.
- `src/components/ui/*`: reusable UI primitives used by the app.
- `src/index.css`: global styles, theme tokens, palette variants, and autoindex-specific CSS behavior.
- `public/*`: static assets copied into the build output.
- `dist/*`: generated build output for deployment. Treat this as generated output, not source of truth.

## Build And Deployment

- Use the scripts defined in `package.json`: `bun run dev`, `bun run build`, `bun run lint`, and `bun run preview`.
- The Vite base path is `/_autoindex/`. Keep that in mind when changing asset paths or deployment assumptions.
- The build intentionally writes stable asset names such as `assets/index.js` and `assets/index.css` because nginx snippet injection expects predictable filenames.
- For deployed behavior, the important artifacts are the built assets together with `dist/before.html` and `dist/after.html`.
- Do not manually edit generated files in `dist` when the real change belongs in source files like `src/*` or `vite.config.ts`.

## Agent Caveats

- Do not treat `index.html` as the production page structure. It is a local development/demo fixture that simulates nginx autoindex output.
- Changes to parsing behavior should be made carefully. `src/lib/parser.ts` depends on nginx autoindex formatting, including the `Index of ...` heading and the `pre` block layout.
- If you need to change snippet output such as the theme init script, mount markup, or generated include files, update `vite.config.ts` rather than editing `dist/before.html` or `dist/after.html` directly.
- The app persists UI preferences in `localStorage`, including theme, palette, view mode, background brightness, and blur. Keep the runtime app logic and the pre-mount theme init script in sync.
- The `_autoindex` directory is intentionally hidden from the rendered file listing so the deployed theme assets do not show up as a normal directory entry.

## Tooling Defaults

- This project uses Bun with Vite + React.
- For new UI work, prefer `shadcn/ui` unless the repository already has a different established UI system.
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

# AGENTS.md

These rules apply to any AI agent working in this repository.

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

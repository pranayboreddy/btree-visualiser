# Tree Lab — B-tree & B+ tree Visualizer

An interactive, animated visualizer for **B-trees** and **B+ trees**. Built to fill the gaps
in existing tools: it supports **delete** and **update** (not just insert/search), switches
between B-tree and B+ tree on the same key set, scales to hundreds of keys with a pan/zoom
canvas, counts disk reads live, and includes a standalone cost calculator.

> Built with React 19 + TypeScript + Vite. Light/dark theme, fully typed core, unit-tested
> algorithms, and a Playwright render smoke test.

## Features

- **B-tree and B+ tree** in one app. Switch tabs to convert the _same keys_ between the two.
- **Insert · Delete · Update · Search**, each animated step-by-step with narration.
- **Auto-focus**: the canvas pans/zooms to the node where each step happens.
- **Read counter + height-bound formula**, recomputed live from the current tree.
- **Cost calculator** for arbitrary record counts (up to billions).
- **Bulk insert** with a system-aware cap (uses `navigator.deviceMemory` / cores when available).
- **Pan & zoom canvas** (pointer + wheel); **light / dark theme**; responsive layout.

## Tech stack

React 19 · TypeScript 5.9 · Vite 8 · Vitest 4 · Playwright · ESLint 10 (flat) + Prettier · CSS Modules.
No UI framework — styling is hand-rolled with CSS custom properties for theming.

## Getting started

Requires **Node 22+** and **pnpm** (via [Corepack](https://nodejs.org/api/corepack.html)).

```bash
corepack enable          # makes the pinned pnpm available
pnpm install
pnpm dev                 # dev server → http://localhost:5173
```

### Scripts

| Command          | What it does                                |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Start the Vite dev server                   |
| `pnpm build`     | Type-check (`tsc -b`) and build to `dist/`  |
| `pnpm preview`   | Preview the production build                |
| `pnpm test`      | Run the tree-invariant stress test (Vitest) |
| `pnpm test:e2e`  | Run the Playwright render smoke test        |
| `pnpm lint`      | Lint with ESLint                            |
| `pnpm typecheck` | Type-check without emitting                 |
| `pnpm format`    | Format the repo with Prettier               |

## Correctness

The tree algorithms in `src/core/trees.ts` are validated by `src/core/trees.test.ts`, which
runs thousands of random insert/delete sequences across every node size and checks all B-tree
invariants (key bounds, equal leaf depth, child counts), the B+ leaf chain and separators,
conversion between the two structures, and read counts. Run it with `pnpm test`.

`tests/smoke.spec.ts` mounts the real app in Chromium and asserts the DOM updates through the
insert / delete / build / convert loop, failing on any uncaught runtime error.

Nodes split at the **median** (guarantees valid trees). An adjustable split point is a possible
future toggle.

## Project layout

```
src/
  core/
    trees.ts            # BTree + BPlusTree (verified) with animation recorder
    trees.test.ts       # invariant stress test (Vitest)
    types.ts            # shared tree types
  layout/
    computeLayout.ts    # tree → node/edge/leaf-link positions
  hooks/
    useTreeEngine.ts    # live tree + animation frame queue + actions
    usePanZoom.ts       # canvas pan/zoom + auto-focus
    useSystemCap.ts     # device-aware bulk cap
    useTheme.ts         # light/dark theme
  components/           # Header, Toolbar, Canvas, NodeBox, Narration, StatsPanel, Calculator …
  lib/                  # small pure helpers (parsing, read-cost maths)
  theme/tokens.ts       # geometry constants + repo URL
  styles/global.css     # design tokens (light + dark) and reset
  App.tsx, main.tsx
tests/smoke.spec.ts     # Playwright render smoke test
```

## Contributing

Issues and PRs welcome. Good first issues: split-percentage toggle, keyboard shortcuts,
import/export a key set, side-by-side compare mode, and touch-gesture (pinch) zoom.

## License

MIT © 2026 Pranay Boreddy

# Douloom（豆织工坊）Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully rebrand the product and monorepo from Perlerloom/`perlerloom`/`@perlerloom/*` to 豆织工坊 / Douloom / `douloom` / `@douloom/*` with no localStorage or export-format migration.

**Architecture:** Mechanical identity rename in one branch: packages and imports first or in lockstep with persistence/i18n tests (red→green), then app entry rename, docs/CI, leftover grep, finally GitHub repository rename so Pages `basePath` becomes `/douloom`.

**Tech Stack:** pnpm workspaces, Next.js 16 static export, Vitest, GitHub Actions Pages, TypeScript.

**Spec:** `docs/superpowers/specs/2026-07-13-douloom-rename-design.md`

---

## File map

| Path | Role |
|------|------|
| `package.json`, `apps/web/package.json`, `packages/{core,palettes,ui}/package.json`, `pnpm-lock.yaml` | Workspace package names |
| `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/components.json` | `@douloom/*` aliases / transpile |
| All `*.ts`/`*.tsx` importing `@perlerloom/*` | Import path updates |
| `apps/web/src/lib/pattern-storage.ts` (+ test) | Storage key + export `format` |
| `apps/web/src/lib/pattern-export-metadata.ts` (+ test) | Attribution URL |
| `apps/web/src/i18n/{en,zh,config}.ts` (+ `config.test.ts`) | Brand strings + language key |
| `apps/web/src/features/pattern-editor/perlerloom-app.tsx(.test)` → `douloom-app.*` | App shell rename |
| `apps/web/src/app/{page,layout}.tsx` | Entry + metadata title |
| `apps/web/public/site.webmanifest` | PWA name |
| `README.md`, `README.zh-CN.md`, `AGENTS.md` | Docs brand |
| `.github/workflows/deploy-pages.yml` | Build filter `@douloom/web` |

---

### Task 1: Persistence and export identity (TDD)

**Files:**
- Modify: `apps/web/src/lib/pattern-storage.test.ts`
- Modify: `apps/web/src/lib/pattern-storage.ts`
- Modify: `apps/web/src/lib/pattern-export-metadata.ts`

- [ ] **Step 1: Update failing expectations in `pattern-storage.test.ts`**

Change attribution test to:

```ts
  it("includes attribution and QR payload in export metadata", () => {
    expect(createExportMetadata("https://lulu0119.github.io/douloom/share/demo")).toEqual({
      attributionUrl: "https://lulu0119.github.io/douloom",
      qrPayload: "https://lulu0119.github.io/douloom/share/demo"
    });
  });
```

Change import fixture `format` to `"douloom.patternRecord"`.

- [ ] **Step 2: Run the storage tests — expect FAIL**

Run: `pnpm --filter @perlerloom/web test src/lib/pattern-storage.test.ts`

Expected: FAIL on attribution URL and/or format string mismatches.

- [ ] **Step 3: Implement storage + metadata**

In `pattern-storage.ts`:

```ts
export type PatternRecordExportFile = {
  format: "douloom.patternRecord";
  // ...unchanged fields
};

export const PATTERN_LIBRARY_STORAGE_KEY = "douloom.patternLibrary";
```

Replace every `"perlerloom.patternRecord"` (type, serialize, validate) with `"douloom.patternRecord"`.

In `pattern-export-metadata.ts`:

```ts
export function createExportMetadata(shareUrl: string): ExportMetadata {
  return {
    attributionUrl: "https://lulu0119.github.io/douloom",
    qrPayload: shareUrl
  };
}
```

Do **not** read old `perlerloom.*` keys.

- [ ] **Step 4: Re-run storage tests — expect PASS**

Run: `pnpm --filter @perlerloom/web test src/lib/pattern-storage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/pattern-storage.ts apps/web/src/lib/pattern-storage.test.ts apps/web/src/lib/pattern-export-metadata.ts
git commit -m "refactor(web): switch storage and export identity to douloom"
```

---

### Task 2: i18n brand strings and language key (TDD)

**Files:**
- Modify: `apps/web/src/i18n/config.test.ts`
- Modify: `apps/web/src/i18n/config.ts`
- Modify: `apps/web/src/i18n/en.ts`
- Modify: `apps/web/src/i18n/zh.ts`

- [ ] **Step 1: Update `config.test.ts` expectations**

```ts
    localStorage.setItem("douloom.language", "zh-CN");
    // ...
    expect(i18n.t("meta.title")).toBe("Douloom");
```

- [ ] **Step 2: Run i18n config test — expect FAIL**

Run: `pnpm --filter @perlerloom/web test src/i18n/config.test.ts`

Expected: FAIL (old key / old title).

- [ ] **Step 3: Update config + dictionaries**

`config.ts`:

```ts
const LANGUAGE_STORAGE_KEY = "douloom.language";
```

`en.ts` brand strings:

```ts
meta: { title: "Douloom", /* description unchanged unless it names the product */ },
header: { logoAlt: "Douloom logo", /* ... */ },
status: {
  patternImportInvalid: "That file is not a valid Douloom chart export.",
  /* ... */
},
```

`zh.ts` brand strings (replace 珀勒鲁姆):

```ts
meta: { title: "豆织工坊", /* ... */ },
header: { logoAlt: "豆织工坊标志", /* ... */ },
status: {
  patternImportInvalid: "该文件不是有效的豆织工坊图纸导出。",
  /* ... */
},
```

- [ ] **Step 4: Re-run i18n config test — expect PASS**

Run: `pnpm --filter @perlerloom/web test src/i18n/config.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/i18n
git commit -m "refactor(web): rebrand i18n to Douloom / 豆织工坊"
```

---

### Task 3: Rename app shell component and its tests

**Files:**
- Rename: `apps/web/src/features/pattern-editor/perlerloom-app.tsx` → `douloom-app.tsx`
- Rename: `apps/web/src/features/pattern-editor/perlerloom-app.test.tsx` → `douloom-app.test.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/layout.tsx` (metadata title/description brand if hardcoded)

- [ ] **Step 1: Update test file for new names (before or with rename)**

In the test module:

- Import `DouloomApp` from `./douloom-app`
- Rename helpers/`describe` from `Perlerloom*` to `Douloom*`
- Logo: `/douloom logo/i` and `"Douloom logo"`
- Headings: Chinese `"豆织工坊"`, English `"Douloom"`

- [ ] **Step 2: Rename source file and export**

Use `git mv` for both files. In `douloom-app.tsx` rename `export function PerlerloomApp` → `export function DouloomApp`.

`page.tsx`:

```tsx
import { DouloomApp } from "@/features/pattern-editor/douloom-app";

export default function Home() {
  return <DouloomApp />;
}
```

`layout.tsx` metadata:

```ts
export const metadata: Metadata = {
  title: "Douloom",
  // keep existing English description text (no Perlerloom token)
  ...
};
```

- [ ] **Step 3: Run app shell tests — expect PASS**

Run: `pnpm --filter @perlerloom/web test src/features/pattern-editor/douloom-app.test.tsx`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/pattern-editor/douloom-app.tsx apps/web/src/features/pattern-editor/douloom-app.test.tsx apps/web/src/app/page.tsx apps/web/src/app/layout.tsx
git commit -m "refactor(web): rename PerlerloomApp to DouloomApp"
```

---

### Task 4: Workspace package scope `@douloom/*`

**Files:**
- Modify: root `package.json`
- Modify: `apps/web/package.json`
- Modify: `packages/core/package.json`
- Modify: `packages/palettes/package.json`
- Modify: `packages/ui/package.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/components.json`
- Modify: every source import of `@perlerloom/*` (all packages + apps)
- Refresh: `pnpm-lock.yaml`

- [ ] **Step 1: Rename package `name` fields**

Root:

```json
{
  "name": "douloom",
  "scripts": {
    "dev": "pnpm --filter @douloom/web dev"
  }
}
```

Set `"name": "@douloom/web" | "@douloom/core" | "@douloom/palettes" | "@douloom/ui"` in each package. In `apps/web` and `packages/core` dependencies, replace `@perlerloom/` with `@douloom/`.

- [ ] **Step 2: Repo-wide import / path replace**

From repo root (PowerShell):

```powershell
Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.json,*.yml,*.yaml,*.md,*.css |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.git\\' } |
  ForEach-Object {
    $c = Get-Content -Raw $_.FullName
    $n = $c -replace '@perlerloom/','@douloom/' -replace 'perlerloom','douloom' -replace 'Perlerloom','Douloom'
    if ($n -ne $c) { Set-Content -NoNewline -Path $_.FullName -Value $n }
  }
```

**Caution:** Run this only after Tasks 1–3 already use Douloom strings, OR tighten the replace to `@perlerloom` → `@douloom` plus selective brand replaces so you do not corrupt the design/plan docs’ historical “Perlerloom” mentions in “Old” columns. Prefer:

1. Replace `@perlerloom` → `@douloom` everywhere (safe).
2. Manually fix any remaining product-token leftovers outside `docs/superpowers/**` “Old” mapping tables.

Update `tsconfig.json` paths:

```json
"@douloom/core": ["../../packages/core/src/index.ts"],
"@douloom/palettes": ["../../packages/palettes/src/index.ts"],
"@douloom/ui": ["../../packages/ui/src/index.ts"],
"@douloom/ui/components": ["../../packages/ui/src/components"],
"@douloom/ui/components/*": ["../../packages/ui/src/components/*"]
```

`next.config.ts` `transpilePackages`: `["@douloom/core", "@douloom/palettes", "@douloom/ui"]`.

- [ ] **Step 3: Refresh lockfile**

Run: `pnpm install`

Expected: lockfile lists `@douloom/*` workspace links; exit 0.

- [ ] **Step 4: Typecheck + test**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: both PASS. If filter names in scripts still say `@perlerloom`, fix root/package scripts first.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename workspace packages to @douloom/*"
```

---

### Task 5: Docs, manifest, CI, leftover brand sweep

**Files:**
- Modify: `README.md`, `README.zh-CN.md`, `AGENTS.md`
- Modify: `apps/web/public/site.webmanifest`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: any remaining CSS comments / toast copy still naming Perlerloom
- Keep: `docs/superpowers/specs/2026-07-13-douloom-rename-design.md` “Old” column may still say Perlerloom (historical mapping — OK)

- [ ] **Step 1: Update human-facing docs**

- EN README title/body: **Douloom** (not Perlerloom).
- ZH README: **豆织工坊** as primary product name; English id Douloom where a Latin name is needed.
- `AGENTS.md` header: `douloom`.
- `site.webmanifest`: `"name"` / `"short_name"` → `"Douloom"` (manifest is Latin-script; Chinese UI still from i18n).

- [ ] **Step 2: CI filter**

In `.github/workflows/deploy-pages.yml`:

```yaml
- run: pnpm --filter @douloom/web build
  env:
    NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}
```

- [ ] **Step 3: Leftover search (tree, not git history)**

Run:

```powershell
rg -i "perlerloom|@perlerloom|珀勒鲁姆" --glob '!pnpm-lock.yaml' --glob '!docs/superpowers/**'
```

Expected: no matches (or only intentional historical “Old” rows if you include specs — prefer excluding `docs/superpowers/**` as above).

- [ ] **Step 4: Full verify**

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: all PASS. For local Pages-shaped build optional:

```bash
$env:NEXT_PUBLIC_BASE_PATH='/douloom'; pnpm --filter @douloom/web build
```

- [ ] **Step 5: Commit**

```bash
git add README.md README.zh-CN.md AGENTS.md apps/web/public/site.webmanifest .github/workflows/deploy-pages.yml
git commit -m "docs: rebrand READMEs and CI to Douloom / 豆织工坊"
```

---

### Task 6: Rename GitHub repository

**Files / remotes:** GitHub repo settings + local `origin`

- [ ] **Step 1: Rename on GitHub**

If `gh` is available:

```bash
gh repo rename douloom
```

Otherwise: GitHub → Settings → General → Repository name → `douloom` → Rename.

Expected: repo URL becomes `https://github.com/lulu0119/douloom`; old URL redirects for git.

- [ ] **Step 2: Update local remote**

```bash
git remote set-url origin https://github.com/lulu0119/douloom.git
git remote -v
```

Expected: fetch/push URLs show `.../douloom.git`.

- [ ] **Step 3: Push branch (when ready)**

```bash
git push -u origin HEAD
```

Expected: push succeeds; Pages workflow runs with `repository.name` = `douloom` → `NEXT_PUBLIC_BASE_PATH=/douloom`.

- [ ] **Step 4: Smoke-check Pages URL after deploy**

Open `https://lulu0119.github.io/douloom/` — title Douloom / 豆织工坊; no console errors from wrong asset base path.

- [ ] **Step 5: Commit remote note only if a tracked file changed**

Usually no file commit. Optional local folder rename is out of scope.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| `@douloom/*` packages + lockfile | Task 4 |
| `DouloomApp` / `douloom-app.*` | Task 3 |
| Storage + language keys, no migration | Task 1–2 |
| Export `douloom.patternRecord` | Task 1 |
| Attribution `https://lulu0119.github.io/douloom` | Task 1 |
| EN Douloom / ZH 豆织工坊 | Task 2, 5 |
| README / AGENTS / manifest / CI | Task 5 |
| GitHub rename + Pages base path | Task 6 |
| typecheck / test / build + leftover search | Task 5 |

## Notes for implementers

- User rule: do **not** use git worktrees for this work.
- Subagent implementers should use `composer-2.5` when the parent dispatches subagent-driven-development.
- Do not amend commits unless the user asks; prefer new commits per task.
- `pnpm --filter` package names change mid-plan: Tasks 1–3 may still use `@perlerloom/web` until Task 4; after Task 4 use `@douloom/web`.

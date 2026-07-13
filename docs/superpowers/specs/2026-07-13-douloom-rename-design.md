# Douloom（豆织工坊）rename design

Date: 2026-07-13  
Status: approved for planning (name revised)

## Goal

Remove the third-party brand token **Perler** from the product and repository identity. Rename everything in scope to **豆织工坊** / **Douloom** / `douloom` in a single mechanical change set (Approach 1).

## Decisions

| Topic | Choice |
|-------|--------|
| Chinese display name | 豆织工坊 |
| English display name | Douloom |
| New package / repo id | `douloom`, scope `@douloom/*` |
| Scope | Full rename (repo, packages, UI copy, storage keys, export format) |
| Local data | No migration — new keys only; old `perlerloom*` localStorage is ignored |
| Execution | Single PR / single session mechanical rename |
| Domain placeholder | Replace `https://perlerloom.app` with `https://douloom.app` (brand string only; runtime share URLs still use `window.location`) |
| i18n product title | `zh` → 豆织工坊；`en` → Douloom（logo alt 等同理） |

## Identity mapping

| Old | New |
|-----|-----|
| Perlerloom / perlerloom | Douloom / douloom（中文文案：豆织工坊） |
| `@perlerloom/{web,core,palettes,ui}` | `@douloom/{web,core,palettes,ui}` |
| `PerlerloomApp`, `perlerloom-app.tsx(.test)` | `DouloomApp`, `douloom-app.tsx(.test)` |
| `perlerloom.patternLibrary` | `douloom.patternLibrary` |
| `perlerloom.language` | `douloom.language` |
| Export `format`: `perlerloom.patternRecord` | `douloom.patternRecord` |
| Default attribution `https://perlerloom.app` | `https://douloom.app` |
| GitHub repository `perlerloom` | `douloom` (Pages `basePath` follows `github.event.repository.name`) |

## In scope

- Root and package `name` fields; workspace filter scripts; `pnpm-lock.yaml`
- TypeScript path aliases, `transpilePackages`, imports
- App entry component and test file rename
- i18n (`en` / `zh`), README (EN/ZH), `AGENTS.md`, `site.webmanifest`, product-name comments
- Pattern library / language storage keys and export format serialize + validate
- CI workflow package filter (`@douloom/web`)
- GitHub repository rename and local `origin` update
- Verification: typecheck, test, build; repo-wide search for leftover `perlerloom` / `Perlerloom` / `@perlerloom`

## Out of scope

- Migrating or dual-reading old localStorage keys
- Accepting old export `format` values
- Feature work, visual redesign, or logo artwork redraw (alt text / copy only)
- Registering the real domain `douloom.app`
- Renaming the local disk folder (optional, operator-side)
- Rewriting git history

## Execution order

1. Rename packages and workspace references; refresh lockfile.
2. Rename source identifiers and `douloom-app` files; update imports.
3. Update persistence keys, export format, and attribution placeholder.
4. Update brand copy and docs (EN: Douloom; ZH: 豆织工坊).
5. Update CI filter string.
6. Rename GitHub repository to `douloom`; point local remote at the new name.
7. Run `pnpm typecheck`, `pnpm test`, `pnpm build`; confirm zero brand-token leftovers in the tree (excluding git history).

## Acceptance criteria

- English UI title and logo alt show **Douloom**; Chinese UI shows **豆织工坊**.
- Fresh browser profile has empty library (no read of old keys).
- Exported JSON uses `format: "douloom.patternRecord"`; files with the old format fail import under existing strict validation.
- After repository rename, GitHub Pages build uses base path `/douloom`.
- Automated checks above pass.

## Known breaks (accepted)

- Previously saved browser library under `perlerloom.*` keys will not appear.
- Old `.patternRecord` exports will not import.
- Bookmarks to the old Pages path `/perlerloom` need updating after repo rename (GitHub may redirect the git remote; Pages URL still depends on the new repo name).

## Success state

Product name, repository name, package scope, storage keys, and export format are consistently **豆织工坊** / **Douloom** / `douloom`, with tests and build green.

## Revision note

Supersedes the earlier Fuseloom naming choice in the same brainstorming thread; execution approach and non-goals are unchanged.

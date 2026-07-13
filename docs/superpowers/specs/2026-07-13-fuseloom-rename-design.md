# Fuseloom rename design

Date: 2026-07-13  
Status: approved for planning

## Goal

Remove the third-party brand token **Perler** from the product and repository identity. Rename everything in scope to **Fuseloom** / `fuseloom` in a single mechanical change set (Approach 1).

## Decisions

| Topic | Choice |
|-------|--------|
| New display name | Fuseloom |
| New package / repo id | `fuseloom`, scope `@fuseloom/*` |
| Scope | Full rename (repo, packages, UI copy, storage keys, export format) |
| Local data | No migration — new keys only; old `perlerloom*` localStorage is ignored |
| Execution | Single PR / single session mechanical rename |
| Domain placeholder | Replace `https://perlerloom.app` with `https://fuseloom.app` (brand string only; runtime share URLs still use `window.location`) |

## Identity mapping

| Old | New |
|-----|-----|
| Perlerloom / perlerloom | Fuseloom / fuseloom |
| `@perlerloom/{web,core,palettes,ui}` | `@fuseloom/{web,core,palettes,ui}` |
| `PerlerloomApp`, `perlerloom-app.tsx(.test)` | `FuseloomApp`, `fuseloom-app.tsx(.test)` |
| `perlerloom.patternLibrary` | `fuseloom.patternLibrary` |
| `perlerloom.language` | `fuseloom.language` |
| Export `format`: `perlerloom.patternRecord` | `fuseloom.patternRecord` |
| Default attribution `https://perlerloom.app` | `https://fuseloom.app` |
| GitHub repository `perlerloom` | `fuseloom` (Pages `basePath` follows `github.event.repository.name`) |

## In scope

- Root and package `name` fields; workspace filter scripts; `pnpm-lock.yaml`
- TypeScript path aliases, `transpilePackages`, imports
- App entry component and test file rename
- i18n (`en` / `zh`), README (EN/ZH), `AGENTS.md`, `site.webmanifest`, product-name comments
- Pattern library / language storage keys and export format serialize + validate
- CI workflow package filter (`@fuseloom/web`)
- GitHub repository rename and local `origin` update
- Verification: typecheck, test, build; repo-wide search for leftover `perlerloom` / `Perlerloom` / `@perlerloom`

## Out of scope

- Migrating or dual-reading old localStorage keys
- Accepting old export `format` values
- Feature work, visual redesign, or logo artwork redraw (alt text / copy only)
- Registering the real domain `fuseloom.app`
- Renaming the local disk folder (optional, operator-side)
- Rewriting git history

## Execution order

1. Rename packages and workspace references; refresh lockfile.
2. Rename source identifiers and `fuseloom-app` files; update imports.
3. Update persistence keys, export format, and attribution placeholder.
4. Update brand copy and docs.
5. Update CI filter string.
6. Rename GitHub repository to `fuseloom`; point local remote at the new name.
7. Run `pnpm typecheck`, `pnpm test`, `pnpm build`; confirm zero brand-token leftovers in the tree (excluding git history).

## Acceptance criteria

- UI title and logo alt show **Fuseloom**.
- Fresh browser profile has empty library (no read of old keys).
- Exported JSON uses `format: "fuseloom.patternRecord"`; files with the old format fail import under existing strict validation.
- After repository rename, GitHub Pages build uses base path `/fuseloom`.
- Automated checks above pass.

## Known breaks (accepted)

- Previously saved browser library under `perlerloom.*` keys will not appear.
- Old `.patternRecord` exports will not import.
- Bookmarks to the old Pages path `/perlerloom` need updating after repo rename (GitHub may redirect the git remote; Pages URL still depends on the new repo name).

## Success state

Product name, repository name, package scope, storage keys, and export format are consistently **Fuseloom** / `fuseloom`, with tests and build green.

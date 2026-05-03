# Perlerloom

Perlerloom is a Next.js app for generating and editing bead patterns from uploaded images. The first MVP focuses on the free browser-based workflow: Mard palette matching, local image processing, an editable canvas pattern, and auth-gated cloud save/share.

## Stack

- Next.js app router in `apps/web`
- pnpm workspace packages in `packages/*`
- Tailwind CSS and shadcn-compatible UI primitives
- Vitest for package and UI tests
- Supabase for auth, saved patterns, shares, and future credits

## Setup

```bash
pnpm install
pnpm dev
```

Optional environment variables for cloud features:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The free converter and editor must work without Supabase credentials.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## MVP Scope

- Mard 291-color palette data.
- Browser-only photo to bead-pattern conversion with optional dithering.
- Web Worker for heavy conversion work.
- Editable pattern canvas with legend, tools, and undo/redo.
- Auth-gated Supabase save/share foundations.

Paid AI pixel-art conversion is only represented as a server-side boundary for future implementation.

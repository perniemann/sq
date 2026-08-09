# Docs

Index and writing conventions for `docs/`.

## User-facing

| Doc | Role |
|-----|------|
| [HOW-TO-PLAY.md](HOW-TO-PLAY.md) | Controls and scoring |
| [../README.md](../README.md) | Setup, scripts, versioning |

Brand lockup (`public/sq-lockup.svg` — letters **sq** + mark) belongs on user-facing titles only. In prose, spell the product **`sq_`**.

## Internal

| Path | Role |
|------|------|
| `discovery/` | Discovery specs |
| `plans/` | Implementation plans |
| `audits/` | Reviews, verify slices, checker notes |
| `media/`, `svg/` | Brand briefs and asset specs |
| `GAME_LOOP_AND_LOGIC_REVIEW.md` | Architecture notes |

## Heading grammar

1. **H1** — document title only (one per file). User-facing pages may use the lockup image as the H1 content (`alt="sq_"`); put the page job in a short centered line under the version, not a second H1/H2.
2. **H2** — major sections (`##`).
3. **H3** — subsections. Do not skip levels.
4. Sentence case for instructional titles (“How to play”). Title Case is fine for formal audit/plan names.
5. Reserve all-caps for short labels (≤20 chars), not body copy.
6. User-facing lockups use `public/sq-lockup.svg` (void plate + ink) so the mark stays legible on light hosts like GitHub.

## Type layers (HTML docs)

When authoring standalone HTML under `docs/` (e.g. media reviews):

| Layer | Role | Guidance |
|-------|------|----------|
| Display | Page title / lockup | Outfit (or Bahnschrift fallback), ≥1.5rem, weight 700–800 |
| Reading | Body / lede | ≥16px (`1rem`), line-height 1.4–1.7, brand ink |
| Utility | Captions, metadata | Monospace OK; muted ink `#9aadb2`; ~0.8125rem |

Load webfonts with `font-display: swap` (Google Fonts `&display=swap` or `@font-face`).

## Tables

Prefer **one-line cells**. Put narrative evidence under the table, not inside it.

| # | Gate | Result | Evidence |
|---|------|--------|----------|
| 1 | Demo completes best-of-3 | **PASS** | `gameStore.test.ts` match loop |

Then expand below if needed. Historical audits may keep denser cells; new and edited verify docs should follow this shape.

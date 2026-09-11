# CLAUDE.md — Month 1: the game

Global rules in `~/.claude/CLAUDE.md` apply. This file covers only this project.

## What we are building

A small browser game, then the same game with sign-in and a leaderboard, in this
same repo. Live at a real address. Month 1 gate, curriculum section "01".

Rules of the game are in `SPEC.md`. If `SPEC.md` is silent on something, ask before
choosing. Do not build anything the spec does not ask for.

Scope is deliberately tiny: one input, one integer score, three states (title,
playing, game over). Do not propose levels, multiplayer, physics engines, character
animation, camera controls, or procedural generation. If you think one is needed,
say so in one sentence and wait.

## Stack (chosen, not default)

- Vite + TypeScript + Three.js. Static site for the first half of the month.
- Vercel for hosting. Pushes to `main` deploy (you still ask before every push).
  Rollback is done from the Vercel dashboard.
- Supabase (Postgres + Auth) for sign-in and the leaderboard in the second half.
  Do not add it before I say.
- `npm run check` runs the four machines: `tsc`, ESLint, `npm audit`, gitleaks.
- Style: flat-shaded low-poly, one directional light, palette from `SPEC.md`.
  No textures yet; art arrives in weeks 3–4.

If you want to change any of this, argue for it against at least two alternatives.
I may refuse. That is the point.

## This project's never list

- Never store data in the browser (localStorage etc.) as a substitute for the
  database. The first half of the month stores nothing at all.
- Never let the score change after game over.
- Never submit a score from anywhere but the game-over transition.

## Files

- `SPEC.md` — the game, written by me. Source of truth for what to build.
- `OVERRULES.md` — my log. You do not write in it.

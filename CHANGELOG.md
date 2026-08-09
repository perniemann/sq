# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-09

### Added

- Playable browser squash demo on a WSF-dimension court with Rapier physics
- Demo-mode AI vs AI attract loop that hands off into a real match on input
- Two-button control scheme (charge/shot + chase) for keyboard, mouse, and touch
- PARS-11 scoring, best-of-3 games, serve and let handling aligned to WSF/PARS
- Neon Tron aesthetic with bloom, trails, and branded idle lockup
- Dynamic SemVer injection (`VITE_APP_VERSION`) shown on the start screen and document title
- Automated releases via Conventional Commits and Release Please

### Known gaps

- Player movement / action controller needs substantial work before pitch polish
- UX and UI overlays still need iteration
- Bundle size still dominated by Rapier

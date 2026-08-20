# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2](https://github.com/perniemann/sq/compare/v0.1.1...v0.1.2) (2026-08-20)


### Features

* simplify sq_ mark to frame and orange wedge ([985f2cb](https://github.com/perniemann/sq/commit/985f2cbbcfc76b37efea887ae77ffb8d669d645a))

## [0.1.1](https://github.com/perniemann/sq/compare/v0.1.0...v0.1.1) (2026-08-20)


### Features

* gate canHit on front-wall returnability and tighten serve/ready pose ([7163a39](https://github.com/perniemann/sq/commit/7163a3937d169327cbce1a60bd3cc44924022a2f))
* loft stick, length charge bands, assist, and teach tips ([cc3f7ce](https://github.com/perniemann/sq/commit/cc3f7ce6a5755999eda2a8179d1cdbb452f06597))
* side-wall-first aim, timing accuracy, and charge-ring shot hints ([ac37dd8](https://github.com/perniemann/sq/commit/ac37dd8263d8efb666fb48c673d8cdd89788a689))
* **theme:** add HUD fonts and black/white court palette ([2ff5efe](https://github.com/perniemann/sq/commit/2ff5efed0004192766992c96bd661bbe141a0574))
* **ui:** move match chrome to diegetic WorldHud ([73a5300](https://github.com/perniemann/sq/commit/73a53009f53c28969894492b34149fc050b84788))
* wire WorldHud, charge ring, and returnable ball into the scene ([b95e06d](https://github.com/perniemann/sq/commit/b95e06df1f85458891650b2eccc4d2e4c1c55494))

## [0.1.0] - 2026-08-09

### Changed

- Court substrate is black/white (`HEX.courtLine` `#f2f4f5` + bloom); cyan/orange reserved for athletes, ball, scores, tin-hit flash
- WorldHud tin plate contrast and bolder score type on the diegetic band

### Added

- Playable browser squash demo on a WSF-dimension court with Rapier physics
- Demo-mode AI vs AI attract loop that hands off into a real match on input
- Two-button control scheme (charge/shot + chase) for keyboard, mouse, and touch
- PARS-11 scoring, best-of-3 games, serve and let handling aligned to WSF/PARS
- Bloom, trails, and branded idle lockup on a minimal black/white court
- Dynamic SemVer injection (`VITE_APP_VERSION`) shown on the start screen and document title
- Automated releases via Conventional Commits and Release Please

### Known gaps

- Player movement / action controller needs substantial work before pitch polish
- UX and UI overlays still need iteration
- Bundle size still dominated by Rapier

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3](https://github.com/perniemann/sq/compare/v0.1.2...v0.1.3) (2026-08-21)


### Features

* fit-parity /design product catalog ([fd32806](https://github.com/perniemann/sq/commit/fd3280678af20623739a4eb59ea23df65bf2bd23))
* public /design reference catalog for sq_ ([#4](https://github.com/perniemann/sq/issues/4)) ([f3a52d5](https://github.com/perniemann/sq/commit/f3a52d56975ac9ba0beaf5532337fe378defeb8e))
* raise /design to fit-parity product catalog ([8f4091f](https://github.com/perniemann/sq/commit/8f4091f2e31d42ef75208e8c202c82d87d41abe7))
* re-author visual system and add /design reference ([de265a5](https://github.com/perniemann/sq/commit/de265a5854d3b72e2d24fc7c0f568358d2690f05))
* re-author visual system and add /design reference ([d6ce9f4](https://github.com/perniemann/sq/commit/d6ce9f460bfd2851d87ece8d6b60a511f2a83aef))


### Bug Fixes

* make SEO head tags crawler-parser friendly ([dfbe1df](https://github.com/perniemann/sq/commit/dfbe1df971530cecb7edf4bb5b9bad4286ef0408))
* raise SEO with static shell and discovery files ([f9f73f5](https://github.com/perniemann/sq/commit/f9f73f528ed7c5b9bd218919e5c674a056a1203e))
* serve OG preview as og-image.png to dodge CF 404 cache ([2292211](https://github.com/perniemann/sq/commit/22922115b7fa0f0d022ac785c06f23f3dd2b3807))
* use 1200x630 court shot for social OG previews ([6ec6ca1](https://github.com/perniemann/sq/commit/6ec6ca106d94b1451401c429c1146c5b7f9021c0))

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

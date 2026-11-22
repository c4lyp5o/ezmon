# Changelog

All notable changes to ezmon are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## [Unreleased]

## [1.0.1] - 2026-11-22

### Security
- Removed a hardcoded MongoDB connection string (with credentials) from `ecosystem.config.js`, which also overrode the runtime `MONGO_URI`. Set `MONGO_URI` in the environment.

### Changed
- The Docker image follows the ez standard: Alpine, runs as the unprivileged `bun` user (uid 1000), and a `HEALTHCHECK` that reports healthy within seconds of start.
- CI is two workflows, `test.yml` and `publish.yml`. Merging to `master` publishes `:<version>`, `:latest` and `:sha-<commit>` after the tests (and an image boot check) pass; a `vX.Y.Z` tag is optional and adds a GitHub Release.
- Every push to `development` publishes `:development` and `:sha-<commit>` after the tests, so unreleased changes can be tried without touching `master`.
- Images are now published to `ghcr.io/c4lyp5o/ezmon`. The container runs as `bun` and has a healthcheck.
- Header, sidebar and sign-in use the shared ez `Brand`: the ez icon and the lowercase name.
- Dependencies updated (majors kept only where the tests passed), Docker image on oven/bun 1.4.5, Biome as the linter, and the shared ez favicon.

## [1.0.0]

Baseline for this changelog. See the git history for earlier changes.

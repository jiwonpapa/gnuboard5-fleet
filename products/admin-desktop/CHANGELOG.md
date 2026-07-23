# Changelog

All notable changes to this workspace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- OpenAPI snapshot + manifest snapshots under `specs/contracts/` for standalone Rust-side contract verification.
- `pnpm contract:sync`, `pnpm contract:generate`, and `pnpm contract:check` in `g5-admin`.
- Generated Zod contract artifact at `g5-admin/contracts/generated/openapi-zod-client.ts`.
- GitHub Actions contract workflow for `g5-admin`.

### Changed
- `pnpm build` in `g5-admin` now fails fast when the OpenAPI snapshot, manifest, generated Zod artifact, or `core.ts` `apiTarget` set drifts from the PHP contract snapshot.

## [0.1.0] - 2026-03-08

### Added
- Rust workspace for Gnuboard5 admin tooling with `g5-admin` and `g5-api`.
- Tauri v2 desktop admin shell with React 19, TypeScript, and typed IPC.
- 140 registered Tauri IPC commands bound in `g5-admin/src-tauri/src/lib.rs`.
- Route-native admin flows for environment, members, boards, points, visits, FAQ, menus, mails, themes, and SMS domains.
- Shared testing and audit artifacts under `specs/`.

### Security
- IPC-first API access through Rust `reqwest`; no browser-side direct API calls.
- OS keychain and native clipboard plugin integration for desktop-sensitive flows.
- Request tracing, diagnostic logging, and structured error normalization.

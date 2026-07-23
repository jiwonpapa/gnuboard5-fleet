# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Deterministic OpenAPI contract manifest generation at `api/docs/openapi.contract-manifest.json`.
- `composer run contract:manifest` and `composer run contract:check` to keep the manifest aligned with `api/docs/openapi.yaml`.

### Changed
- Quality gates and CI now fail when the committed OpenAPI contract manifest is stale.
- OpenAPI manifest generation now rejects duplicate YAML keys so invalid contract edits fail immediately.

## [1.0.0] - 2026-03-08

### Added
- REST API coverage for Gnuboard5 admin domains with 180 documented `/admin/*` operations.
- OpenAPI 3.0 contract at `api/docs/openapi.yaml`.
- JWT authentication and refresh-token flow for admin endpoints.
- RFC 7807 Problem Details error responses with request tracing fields.
- Admin domains including config, members, boards, groups, contents, FAQ, menus, popups, points, polls, visits, SMS, themes, QA, maintenance, mail, popular, write-count, push, report, and layout.
- Repository-grounded validation and parity audits for legacy Gnuboard5 admin behavior.

### Security
- Admin guard middleware for protected `/admin/*` routes.
- Structured error logging with request, correlation, and server request IDs.
- Input validation and sanitization for write endpoints.

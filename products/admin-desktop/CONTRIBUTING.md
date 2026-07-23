# Contributing to G5 Headless Rust

Thank you for your interest in contributing. This workspace uses Constitution-Driven Development, and all changes must follow [.agent/Constitution.md](./.agent/Constitution.md).

## Getting Started

1. Fork the repository.
2. Create a feature branch, for example `git checkout -b feature/my-feature`.
3. Read [.agent/Constitution.md](./.agent/Constitution.md) before writing code.
4. Make your changes with tests.
5. Run the quality gates listed below.
6. Submit a pull request.

## Quality Gates

Run these commands before opening a pull request:

```bash
cargo check --workspace
cargo test --workspace
cd g5-admin && bun run lint
cd g5-admin && bun run test
cd g5-admin && bun run build
```

## Code Standards

- Rust production code must avoid `unwrap()` on runtime input paths.
- TypeScript must avoid `any` and direct API `fetch()` calls.
- React UI changes must stay within the route-native admin shell patterns.
- Contract changes must stay aligned with `/Users/neojins/workspace/gnuboard5/php/api/docs/openapi.yaml`.
- Debug diagnostics must preserve ownership and fault-domain information.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add sms contact group workspace
fix: correct member search field parity
docs: update trust infra audit
refactor: extract visit query mapper
```

## CLA

By submitting a pull request, you agree to the [Contributor License Agreement](./CLA.md).

## License

All contributions are licensed under [AGPL-3.0](./LICENSE).

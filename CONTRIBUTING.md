# Contributing to G5 Headless PHP API

Thank you for your interest in contributing. This project uses Constitution-Driven Development, and all changes must follow [.agent/Constitution.md](./.agent/Constitution.md).

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
composer test
composer analyse
./vendor/bin/php-cs-fixer fix api/ --dry-run --diff
```

## Code Standards

- PHP 8.1+ with `declare(strict_types=1)` is required.
- Controller, Service, Repository layering is mandatory.
- Repository-grounded DTO and enum rules in the constitution must be followed.
- Contract changes must update `api/docs/openapi.yaml`.
- Tests must cover new validation, repository, and service behavior.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add board group management
fix: correct member detail field mapping
docs: update API coverage audit
refactor: extract shared validation helper
```

## CLA

By submitting a pull request, you agree to the [Contributor License Agreement](./CLA.md).

## License

All contributions are licensed under [AGPL-3.0](./LICENSE).

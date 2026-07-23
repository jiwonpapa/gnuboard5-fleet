# G5 Admin Desktop

> **Reference-only:** 이 소스는 React UI와 Rust 소비 구현을 서버판으로 이관하기 위한 legacy snapshot입니다. G5 Fleet는 데스크톱 앱을 빌드·배포·지원하지 않습니다.

Tauri v2 기반으로 구현됐던 Gnuboard5 관리자 데스크톱 앱입니다.

## Stack

- Tauri v2
- Rust
- React 19
- TypeScript strict
- Tailwind CSS 4
- Vitest

## Development

```bash
bun install
bun run lint
bun run test
bun run build
bun run tauri dev
```

## License

This package is licensed under the [Apache License 2.0](LICENSE).

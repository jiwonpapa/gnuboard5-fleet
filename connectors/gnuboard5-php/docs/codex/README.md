# 코덱스 프롬프트 인덱스

이 디렉토리는 도메인별 Codex 실행 프롬프트와 결과를 보관합니다.

## 규칙

- 각 `docs/codex/{domain}/` 디렉토리에는 `PROMPT.md`가 필수입니다.
- `RESULT.md`는 실행 전에는 선택입니다.
- `RESULT.md`가 생기면 상태 또는 완료 범위를 문서 상단에 남깁니다.
- 디렉토리 추가/삭제/이동 시 이 인덱스를 같은 변경에서 갱신합니다.

## 공용 문서

- `docs/codex/MASTER_PROMPT.md`
- `docs/codex/PLUGIN_ARCHITECTURE_PROMPT.md`

## 현재 디렉토리 현황

| 경로 | PROMPT | RESULT | 비고 |
|------|--------|--------|------|
| `docs/codex/admin/` | ✅ | ✅ | 관리자 도메인 보강 |
| `docs/codex/audit-remediation/` | ✅ | - | 감사 시정조치 묶음 |
| `docs/codex/auth-member/` | ✅ | - | 회원/인증 보강 |
| `docs/codex/board/` | ✅ | ✅ | 게시판 보강 |
| `docs/codex/fidelity-remediation/` | ✅ | - | `PROMPT_HARDCODING.md` 보조 프롬프트 포함 |
| `docs/codex/memo/` | ✅ | ✅ | 메모 신규 구현 |
| `docs/codex/point/` | ✅ | ✅ | 포인트 리팩토링 |
| `docs/codex/qa/` | ✅ | ✅ | QA 신규 구현 |
| `docs/codex/swagger/` | ✅ | - | OpenAPI 구조 정리 |
| `docs/codex/type-safety/` | ✅ | - | 타입 안전성 강화 |

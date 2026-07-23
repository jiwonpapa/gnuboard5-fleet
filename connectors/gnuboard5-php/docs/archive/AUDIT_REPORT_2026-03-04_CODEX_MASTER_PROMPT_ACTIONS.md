# CODEX_MASTER_PROMPT 권장조치 이행 리포트 (2026-03-04)

## 1) 대상

- 입력 문서: `audit_codex_master_prompt.md.resolved` 권장 조치 1~4
- 반영 범위: 프롬프트 문서, 헌법 문서, 엔트리포인트 환경 파서, 테스트

## 2) 조치 결과 요약

- **권장 조치 1 (Phase 라벨링)**: 완료
- **권장 조치 2 (헌법 동기화 5건)**: 완료
- **권장 조치 3 (common.php / DependencyGuard 확인)**: 완료
- **권장 조치 4 (.env `=` 포함 값 검증)**: 완료

## 3) 상세 조치

### 3.1 `CODEX_MASTER_PROMPT.md` 정합성 개선

- 반영 파일: `docs/review/CODEX_MASTER_PROMPT.md`
- 반영 내용:
  - 현재 상태 섹션 추가 및 `Phase 0~7 [DONE]` 마킹
  - 실행 순서 요약에 완료 상태 반영
  - `FileService G5 상수 제거(Phase 3E)` 누락 보강
  - `.env` 파서 예시를 `EnvLoader::load()` 기준으로 교체
  - 오타 수정: `구造` → `구조`
  - 예시 네임스페이스를 현재 PSR-4(`Api\\`) 기준으로 정정

### 3.2 `Constitution.md` 동기화

- 반영 파일: `.agent/Constitution.md`
- 반영 내용:
  - 디렉토리 구조를 실제 도메인 기반 트리로 갱신
  - PHPStan 기준을 Level 8로 상향 고정
  - G5 함수 재사용 허용 문구를 “기본 금지 + 제한적 폴백(`LEGACY_SQL_FALLBACK=true`)”로 정정
  - 비밀번호 규칙을 API 독립 호환 방식(`password_verify` + `G5_ENCRYPT_FUNC` 폴백)으로 정정
  - `@package` 예시를 실제 PSR-4 규칙(`Api\...`)으로 정정

### 3.3 common.php / DependencyGuard 실증 확인

- 실행 확인:
  - `api/index.php` 내 `common.php` include 구문 없음
  - `api/` 내 `*DependencyGuard*.php`, `*G5CompatibilityChecker*.php` 파일 없음

### 3.4 `.env` 파서 강화 + 검증

- 신규 파일: `api/v1/Core/Config/EnvLoader.php`
  - `=` 포함 값, quoted 값, inline comment 처리 지원
- 수정 파일: `api/index.php`
  - 부트 시 `EnvLoader::load()` 사용
- 신규 테스트: `tests/Support/EnvLoaderTest.php`
  - `JWT_SECRET=abc=def==ghi` 파싱 검증
  - quoted/inline-comment 파싱 검증
  - `load()`가 `$_ENV` 반영까지 수행하는지 검증

## 4) 품질 게이트 결과

- `composer run test`: 통과
- `composer run analyse`: 통과
- `./scripts/check_hardcoding.sh`: 통과

## 5) 결론

- 입력 감사문서의 권장 조치 1~4를 모두 코드/문서/테스트 단위로 이행 완료.


---
description: 문서 생성/분류/갱신 표준 워크플로우
---
# 문서 관리 워크플로우

기준:
- `.agent/Constitution.md` §7
- `.agent/sub-constitutions/document-governance.md`

## 1. 현재 상태를 먼저 조사한다

1. 현재 문서 구조를 조사한다.
2. 기존 로드맵류 문서, TODO류 문서, HISTORY류 문서를 식별한다.
3. 활성 문서를 `SSOT / 지원 문서 / 기록 문서 / 아카이브 후보`로 나눈다.

## 2. 이 프로젝트의 canonical 문서

| 역할 | canonical 경로 |
|------|------|
| 문서 인덱스 | `docs/README.md` |
| 로드맵 SSOT | `docs/IMPLEMENTATION_ROADMAP.md` |
| 작업 상태 SSOT | `docs/TODO.md` |
| 영구 이력 | `docs/HISTORY.md` |
| 문서 분류표 | `docs/DOCUMENT_REGISTRY.md` |
| 공개 계약 | `api/docs/openapi.yaml` |
| 보조 계약 | `docs/API_SPEC.md` |
| 검색 인덱스 | `docs/docs.db` |

## 3. 갱신 순서

1. Runtime 변경이 있으면 먼저 코드와 테스트를 맞춘다.
2. 공개 API 계약은 `api/docs/openapi.yaml`을 먼저 갱신한다.
3. 사람용 설명은 `docs/API_SPEC.md`에 반영한다.
4. 저장소 계약이 바뀌면 `docs/ddls/*.md`와 `docs/ddls/README.md`를 갱신한다.
5. 우선순위 변경은 `docs/IMPLEMENTATION_ROADMAP.md`에만 반영한다.
6. 작업 상태 변경은 `docs/TODO.md`에만 반영한다.
7. 완료 작업은 `docs/HISTORY.md`에 Why와 함께 기록한다.
8. 문서 추가/삭제/이동 시 `docs/DOCUMENT_REGISTRY.md`, `docs/README.md`, 관련 인덱스를 갱신한다.

## 4. 상태 전이 규칙

- `Inbox`: 아직 순서 미확정인 후보
- `Next`: 다음 착수 순서
- `In Progress`: 현재 작업 중
- `Blocked`: 외부 의존이나 결정 대기
- `Done`: 최근 완료 작업

주의:
- `Done`는 임시 완충 영역이다.
- 영구 보관은 `docs/HISTORY.md`가 맡는다.

## 5. 정리 프로세서와 인덱서

문서 정리 또는 구조 변경이 있었다면 아래를 순서대로 실행한다.

```bash
cd ${PROJECT_ROOT}
python3 scripts/doc-processor.py --write
python3 scripts/doc-index.py
python3 scripts/archive_old_audits.py --check --days 7
./scripts/docs-check.sh
```

## 6. 종료 조건

- `docs/IMPLEMENTATION_ROADMAP.md`가 유일한 로드맵 SSOT다.
- `docs/TODO.md`가 유일한 작업 상태 SSOT다.
- `docs/DOCUMENT_REGISTRY.md`가 최신 분류를 반영한다.
- `docs/docs.db`가 생성된다.
- `./scripts/docs-check.sh`가 통과한다.

# 릴리스 버전과 변경 기록

## 정본

G5 Fleet 제품 릴리스는 [Keep a Changelog 1.1.0](https://keepachangelog.com/ko/1.1.0/)과
[Semantic Versioning 2.0.0](https://semver.org/lang/ko/)을 따릅니다.

- 제품 버전 정본: 루트 `Cargo.toml`의 `workspace.package.version`
- 사용자 변경 기록 정본: 루트 `CHANGELOG.md`
- Git tag: 제품 버전 앞에 `v`를 붙인 `vX.Y.Z`
- 버전 값·OCI label·manifest: `v` 접두어가 없는 `X.Y.Z`
- 날짜: `YYYY-MM-DD`

Admin Server, Admin Web과 같은 release의 PHP Connector 패키지는 하나의 제품
버전을 사용합니다. `openapi.yaml`의 `info.version`은 Connector 계약 버전이고,
계약 변경은 아래 제품 버전 판정에 반드시 반영합니다. Commerce 구현과 제3자
플러그인은 별도 저장소에서 독립 버전을 유지합니다. 봉인된
`products/admin-desktop` changelog는 이관 출처 기록일 뿐 제품 changelog가 아닙니다.

## 공개 API

SemVer 판정의 공개 API에는 다음이 포함됩니다.

- canonical OpenAPI의 HTTP operation, request·response·error 계약
- Fleet 서버의 공개 HTTP·WebSocket 경로와 인증 동작
- 공개 Rust/Commerce SDK 계약
- CLI, 환경 변수, Compose 설치·업그레이드 입력
- backup, release manifest, Connector package의 지속 포맷

문서 오탈자나 내부 refactor처럼 사용자가 관찰할 수 없는 변경은 공개 API 변경이
아닙니다. 판단이 애매하면 더 큰 버전 변경을 선택하고 changelog에 영향과
마이그레이션 방법을 명시합니다.

## 버전 증가

`1.0.0` 이후에는 다음 규칙을 강제합니다.

- `MAJOR`: 공개 API의 호환되지 않는 변경·제거
- `MINOR`: 호환되는 기능 추가 또는 deprecation 선언
- `PATCH`: 호환되는 오류·보안 수정

현재 `0.y.z`는 초기 개발 단계입니다. 이 단계에서는 호환 기능 추가와 호환되지
않는 공개 API 변경 모두 `MINOR`를 올리고, 호환 오류·보안 수정은 `PATCH`를
올립니다. 호환되지 않는 변경은 반드시 `Changed` 또는 `Removed` 항목에
`BREAKING`과 마이그레이션 방법을 적습니다.

정식 배포 전 버전은 `-alpha.N`, `-beta.N`, `-rc.N` 순서를 사용합니다.
SemVer 자체는 `+build.N` 빌드 메타데이터를 허용하지만 OCI tag와의 단일 표현을
유지하기 위해 공식 제품 릴리스 버전에는 사용하지 않습니다. 빌드 식별은 release
manifest의 Git revision으로 기록합니다. 이미 배포하거나 tag한 버전의 소스와 산출물은 수정하지 않습니다.
문제가 있으면 새 버전을 배포하고 심각한 버전은 changelog에 `[YANKED]`로
표시합니다.

## CHANGELOG 작성 규칙

- `[Unreleased]`를 항상 첫 버전 섹션으로 둡니다.
- 사용자에게 의미 있는 변경만 기록하고 커밋 로그를 그대로 복사하지 않습니다.
- `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`만 사용합니다.
- 최신 릴리스를 위에 두고 모든 릴리스에 ISO 날짜를 기록합니다.
- breaking change, deprecation, 제거와 보안 영향을 생략하지 않습니다.
- 각 릴리스와 `[Unreleased]`에 비교 또는 탐색 링크를 둡니다.
- GitHub Release는 `CHANGELOG.md`에서 생성하며 별도 정본으로 사용하지 않습니다.

## 릴리스 절차

1. 변경 성격으로 다음 SemVer를 결정합니다.
2. 루트 `Cargo.toml`, `apps/admin-web/package.json`,
   `deploy/compose/.env.example`을 같은 버전으로 바꿉니다.
3. Cargo lock의 workspace package 버전을 갱신하고 diff를 검토합니다.
4. `[Unreleased]` 항목을 `## [X.Y.Z] - YYYY-MM-DD` 아래로 이동하고 새 빈
   `[Unreleased]` 섹션 및 비교 링크를 만듭니다.
5. 다음 게이트를 통과시킵니다.

```bash
make test-versioning
make check-versioning
python3 tools/release/check_versioning.py --release-version X.Y.Z
make check
```

6. clean commit에서 `make package-build VERSION=X.Y.Z`를 실행합니다.
7. package·staging 증거가 같은 commit과 version을 가리키는지 확인합니다.
8. 승인된 release commit에 annotated tag `vX.Y.Z`를 만들고 GitHub Release를
   changelog 항목으로 게시합니다.

`check_versioning.py --release-version`은 정본 버전과 릴리스 인자가 다르거나,
해당 버전·날짜가 changelog에 확정되지 않았으면 패키지 생성을 거부합니다.

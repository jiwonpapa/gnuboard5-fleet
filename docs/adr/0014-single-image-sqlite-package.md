# ADR-0014: 단일 애플리케이션 이미지와 SQLite 운영 패키지

- 상태: Accepted
- 배치: B09

## 결정

G5 Fleet 서버판은 React 정적 산출물과 Axum 바이너리를 하나의 OCI
image로 배포합니다. 기본 Compose는 `app`과 `caddy` 두 service만
사용하며 PostgreSQL, MySQL, Redis 같은 별도 데이터 service를 두지
않습니다. 제어 평면 데이터는 bind-mounted SQLite에 보존합니다.

image는 non-root, read-only root filesystem, capability drop,
`no-new-privileges`와 자체 readiness healthcheck를 기본값으로 사용합니다.
Caddy만 호스트 HTTP/TLS 진입점을 소유하고 브라우저는 same-origin으로
Fleet API와 WebSocket에 접근합니다.

## 데이터 보존

최초 설치는 빈 data directory에서만 명시적으로 SQLite를 초기화합니다.
identity가 없는데 기존 파일이 하나라도 있으면 자동 초기화하지 않습니다.
업그레이드는 서비스를 정지하고 `VACUUM INTO` snapshot, SHA-256,
`integrity_check`, foreign-key check와 핵심 row readback을 완료한 뒤에만
새 image를 시작합니다.

새 image의 version 또는 핵심 row readback이 다르면 이전 image version을
복원하고 검증된 snapshot을 별도 data directory에 복원합니다. 실패한
data directory와 수동 restore 전 기존 data directory는 즉시 삭제하지
않고 운영자가 확인할 수 있도록 보존합니다.

## 비밀 복구

SQLite backup만으로 AES-GCM으로 암호화된 site secret을 해독할 수 없으므로
수동 backup은 master key와 installation ID를 별도 recovery passphrase로
암호화합니다. 암호화 archive 안의 파일별 SHA-256과 snapshot binding을
restore 전에 검사합니다. passphrase는 Fleet state, Git, env file에
저장하지 않으며 운영자가 별도 보관합니다.

## 릴리스 산출물

- Axum+React image archive
- image SPDX SBOM
- production dependency만 포함한 deterministic PHP Connector archive
- PHP Connector CycloneDX SBOM
- 모든 산출물 SHA-256, image ID와 version/revision readback manifest

Shop 26개 provider 계약은 PHP Connector에 보존하지만 Fleet Core image는
Commerce 구현을 포함하거나 import하지 않습니다.

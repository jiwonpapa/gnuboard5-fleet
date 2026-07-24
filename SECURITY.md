# Security Policy

보안 취약점은 공개 이슈에 비밀값이나 재현용 자격 증명을 올리지 말고 저장소 소유자에게 비공개로 제보해야 합니다.

현재 마이그레이션 기준선은 출시 인증 상태가 아닙니다. B04에서 사용자 session·사이트 격리, CSRF·SSRF·DNS rebinding, AES-GCM secret 저장과 SQLite 복구 경계의 로컬 자동 테스트를 닫았습니다. 실제 배포 전에는 다음 상위 증거가 더 필요합니다.

- PHP Connector 서명·체크섬·원자적 전환·rollback
- WebSocket origin·ticket·connection 격리
- 실제 connector/SSH/notification adapter의 로그 마스킹
- 설치·업그레이드·백업·복원·rollback rehearsal
- staging 환경의 multi-user browser E2E

비밀값은 Git에 저장하지 않으며 secret file 또는 배포 환경의 비밀 저장소로만 주입합니다. 런타임·감사 `output/`은 개인정보 포함 가능성이 있으므로 모든 reachable commit에서 금지하며, `make check`의 `migration.secret_history_hygiene`와 추가 `make secret-scan`을 공개 push 전에 통과해야 합니다.

기존 설치의 SQLite DB가 없거나 손상되면 빈 DB를 자동 생성하지 않습니다. 원본을 보존하고 마지막으로 검증된 backup과 별도 master key를 사용해 복구합니다.

Fleet password는 Argon2id, session·CSRF 원문은 hash-only DB 저장, site secret은 사용자·사이트·용도를 AAD로 결속한 AES-256-GCM을 사용합니다. 서버 master key는 `G5_FLEET_MASTER_KEY_BASE64`로 주입하며 브라우저·DB·로그에 반환하지 않습니다.

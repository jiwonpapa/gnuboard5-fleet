# Security Policy

보안 취약점은 공개 이슈에 비밀값이나 재현용 자격 증명을 올리지 말고 저장소 소유자에게 비공개로 제보해야 합니다.

현재 마이그레이션 기준선은 출시 인증 상태가 아닙니다. 실제 배포 전 다음 증거가 모두 필요합니다.

- 사용자 세션·사이트 격리
- CSRF, SSRF, DNS rebinding, WebSocket origin 방어
- PHP Connector 서명·체크섬·원자적 전환·rollback
- Telegram/VAPID/SSH/G5 자격 증명 암호화와 로그 마스킹
- 설치·업그레이드·백업·복원·rollback rehearsal
- SQLite WAL·FULL 동기화, 무결성 검사, checksum backup과 실제 restore/readback

비밀값은 Git에 저장하지 않으며 secret file 또는 배포 환경의 비밀 저장소로만 주입합니다. 런타임·감사 `output/`은 개인정보 포함 가능성이 있으므로 모든 reachable commit에서 금지하며, `make check`의 `migration.secret_history_hygiene`와 추가 `make secret-scan`을 공개 push 전에 통과해야 합니다.

기존 설치의 SQLite DB가 없거나 손상되면 빈 DB를 자동 생성하지 않습니다. 원본을 보존하고 마지막으로 검증된 backup과 별도 master key를 사용해 복구합니다.

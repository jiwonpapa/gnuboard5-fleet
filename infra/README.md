# Infrastructure Boundary

서버 OCI/Docker Compose와 PHP Connector 배포는 별도 산출물입니다. 이 디렉터리는 향후 Axum 서버, React 정적 PWA, SQLite data volume, 기본 Caddy reverse proxy, secret file, backup, upgrade, rollback, staging manifest를 소유합니다.

Tauri 앱, 데스크톱 설치 패키지, 코드 서명·공증과 native updater는 배포 산출물에 포함하지 않습니다. 서버 HTTPS TLS는 reverse proxy 또는 외부 운영 proxy가 담당합니다.

v1은 외부 DB 서버, Redis와 별도 queue를 요구하지 않습니다. SQLite online backup API 또는 동등한 방식으로 일관된 DB snapshot과 SHA-256을 만들고 secret file과 함께 실제 복원·readback을 검증합니다. 기존 DB 손상·누락 시 자동으로 빈 DB를 만들지 않습니다.

운영 host 기본값, 원격 `--delete`, world-writable 권한, G5 코어 덮어쓰기를 금지합니다.

# Infrastructure Boundary

서버 OCI/Docker Compose와 PHP Connector 배포는 별도 산출물입니다. 이 디렉터리는 향후 compose, reverse proxy, secret file, backup, upgrade, rollback, staging manifest를 소유합니다.

운영 host 기본값, 원격 `--delete`, world-writable 권한, G5 코어 덮어쓰기를 금지합니다.

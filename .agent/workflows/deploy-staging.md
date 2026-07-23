---
description: 스테이징 서버(Ubuntu 24.04) 배포
---
# 스테이징 배포 워크플로우

## 1. 서버 정보

| 항목 | 값 |
|------|-----|
| 호스트 | `neojins@192.168.0.127` |
| 웹루트 | `/home/neojins/public_html` |
| API 경로 | `/home/neojins/public_html/api/` |
| DB 호스트 | `localhost` |
| DB 사용자 | `neojins` |
| DB 비밀번호 | 서버 로컬 `.env` 또는 외부 env 파일에만 저장 |
| DB 이름 | `wolchuck` |
| PHP 버전 | `8.1+` |

## 2. 로컬 품질 게이트

배포 전에는 반드시 표준 품질 게이트를 실행합니다.

```bash
composer run quality-gate
```

현재 게이트에는 아래가 모두 포함됩니다.

- `php -l`
- `schema:check`
- `contract:check`
- `check_hardcoding.sh`
- `docs-check.sh`
- `composer audit`
- `phpstan`
- `phpunit coverage`
- service coverage threshold
- plugin isolation

## 3. 빌드/배포 실행

표준 배포는 수동 `rsync` 대신 스크립트를 사용합니다.

```bash
./scripts/deploy_staging.sh
```

사전 확인만 할 때는:

```bash
./scripts/deploy_staging.sh --dry-run
```

리허설은:

```bash
./scripts/deploy_staging.sh --rehearsal
```

원격 파일 삭제와 런타임 권한 보정을 피해야 하는 제한 조건에서는:

```bash
make deploy-staging MODE=prod DEPLOY_ARGS="--no-delete --skip-permission-fix"
```

## 4. `.env` 배치 원칙

### 권장

가장 안전한 배치는 `.env`를 웹루트 밖에 두고 서버가 경로를 주입하는 방식입니다.

- Apache: `SetEnv APP_ENV_FILE /srv/secrets/gnuboard5-api.env`
- Nginx/PHP-FPM: `fastcgi_param APP_ENV_FILE /srv/secrets/gnuboard5-api.env;`

앱은 `APP_ENV_FILE` 또는 `API_ENV_FILE`가 있으면 그 경로를 우선 사용하고, 없으면 기본값으로 웹루트의 `.env`를 읽습니다.

### 차선

호스팅 제약 때문에 웹루트에 둘 수밖에 없으면 `/home/neojins/public_html/.env`를 사용하되, 반드시 웹 접근 차단 규칙을 같이 둡니다.

## 5. Apache 루트 `.htaccess` 규칙

`/home/neojins/public_html/.htaccess`에 최소한 아래 deny 규칙이 있어야 합니다.

예시 파일:

```text
resources/deploy/apache-webroot.htaccess.example
```

배포 스크립트는 Apache 서버 헤더가 보이면 루트 `.htaccess` 존재와 민감 파일 deny 패턴을 확인합니다.

`api/.htaccess`는 프론트 컨트롤러 라우팅 전용이고, 루트 `.env` 차단 용도가 아닙니다.

## 6. Nginx 민감 파일 차단 규칙

Nginx를 쓰면 `.htaccess`가 무효이므로 서버 블록에 deny 규칙을 직접 넣어야 합니다.

예시 파일:

```text
resources/deploy/nginx-sensitive-files.conf.example
```

핵심은 아래 네 가지입니다.

- `/.env`, `/.env.example`, 숨김 파일 차단
- `/composer.json`, `/composer.lock`, `/.deploy_last_staging_backup` 차단
- `/setup` 잠금
- `/api/docs/`가 404 HTML로 떨어지지 않도록 `/api/docs/index.html`로 고정

## 7. 배포 스크립트의 원격 보안 프리플라이트

`./scripts/deploy_staging.sh`는 실제 배포 전에 아래를 확인합니다.

- `${STAGING_ROOT}/.env` 존재 및 읽기 가능 여부
- 공개 URL 기준 `/.env`, `/.env.example`, `/composer.json`, `/composer.lock` 접근 차단 여부
- `/setup`가 `404`로 잠겨 있는지
- Apache 응답이면 루트 `.htaccess` deny 규칙 존재 여부

공개 루트 URL은 기본적으로 `STAGING_HEALTH_URL` 또는 `STAGING_DOCS_URL`에서 유도하고, 필요하면 `STAGING_PUBLIC_BASE_URL`로 직접 지정합니다.

## 8. 수동 점검 명령

```bash
curl -I https://gnurestapi.cc/.env
curl -I https://gnurestapi.cc/.env.example
curl -I https://gnurestapi.cc/composer.json
curl -I https://gnurestapi.cc/composer.lock
curl -I https://gnurestapi.cc/setup
curl -s https://gnurestapi.cc/api/v1/health | jq .
curl -I https://gnurestapi.cc/api/docs/index.html
```

기대값:

- 민감 파일: `401`, `403`, `404` 중 하나
- `/setup`: `404`
- `/api/v1/health`: `{"status":"ok", ...}`
- `/api/docs/index.html`: `200`

## 9. 배포 후 로그 확인

```bash
ssh neojins@192.168.0.127 "tail -20 /home/neojins/public_html/api/logs/error.log"
```

# 서버 패키지 설치·백업·업그레이드

## 전제

- Docker Engine과 Docker Compose plugin
- `curl`, `openssl`, `awk`, `tar`
- 공개 HTTPS 운영에서는 Caddy 주소와 도메인을 운영 환경에 맞게 설정
- 기본 서버 release platform은 `linux/amd64`

기본 Compose에는 `app`, `caddy`만 있습니다. PostgreSQL·Redis 설치는
필요하지 않습니다. data, backup, secret은 지정한 state directory 아래
bind mount로 보존됩니다.

## 신규 설치

```bash
deploy/scripts/install.sh VERSION /absolute/g5-fleet /absolute/fleet.env
```

설치기는 빈 data directory, 32-byte master key와 installation ID를 만든
뒤 image health와 내장 version을 재조회합니다. 기존 identity 또는 env
file이 있으면 설치를 중단하며 upgrade로 자동 전환하지 않습니다.

## 검증 백업

state directory 밖에 recovery passphrase file을 만들고 권한을 `0600`으로
제한합니다.

```bash
deploy/scripts/backup.sh /absolute/recovery-passphrase /absolute/fleet.env
```

결과는 다음 세 파일입니다.

- `manual-*.sqlite3`
- `manual-*.sqlite3.manifest.json`
- `manual-*.sqlite3.recovery.enc`

DB snapshot은 integrity, foreign key, schema, installation identity와 핵심
row를 재조회합니다. recovery archive는 master key와 installation ID를
PBKDF2 기반 AES-256-CBC로 암호화하며 내부 checksum을 restore 전에 다시
검사합니다. passphrase와 세 파일을 서로 다른 장애 영역에 보관합니다.

## 복원

현재 master key를 유지하는 DB 복원:

```bash
deploy/scripts/restore.sh manual-TIMESTAMP.sqlite3 /absolute/fleet.env
```

master key까지 복구하는 재해 복원:

```bash
deploy/scripts/restore.sh manual-TIMESTAMP.sqlite3 /absolute/fleet.env \
  /absolute/recovery-passphrase
```

복원은 새 data directory에서 checksum·integrity·readback을 통과한 뒤
서비스를 시작합니다. 실패하면 원래 data와 secret을 되돌립니다. 성공한
경우에도 이전 directory는 자동 삭제하지 않습니다.

## 업그레이드와 rollback

```bash
deploy/scripts/upgrade.sh NEW_VERSION /absolute/fleet.env
```

업그레이드는 구버전 image로 snapshot을 만들고 전후 핵심 row JSON과 새
image의 내장 version을 비교합니다. pull, health, version, readback 중
하나라도 실패하면 env의 이전 version과 검증 snapshot을 자동 복원합니다.

## 릴리스 빌드와 패키지 스모크

버전 판정과 changelog 확정 절차는
[`RELEASE_VERSIONING.md`](RELEASE_VERSIONING.md)를 먼저 따릅니다. `VERSION`은
`v` 접두어 없는 SemVer여야 하며 루트 정본 버전 및 확정된 changelog 릴리스
항목과 일치하지 않으면 빌드가 중단됩니다.

```bash
tools/package/build_release.sh X.Y.Z
tools/package/package_smoke.sh
```

첫 명령은 clean Git revision에서 image archive, SPDX, PHP Connector
archive, CycloneDX와 SHA-256 manifest를 만듭니다. 두 번째 명령은 임시
state에서 clean install, 사용자 row 보존 upgrade, 암호화 master-key
복원과 존재하지 않는 image로의 실패 upgrade rollback을 실행합니다.
두 명령은 기본적으로 `linux/amd64` image를 만들고 실행합니다. ARM64
서버용 release가 필요할 때만 두 gate에 동일한 platform을 명시합니다.

```bash
G5_FLEET_RELEASE_PLATFORM=linux/arm64 tools/package/build_release.sh VERSION
G5_FLEET_PACKAGE_PLATFORM=linux/arm64 tools/package/package_smoke.sh
```

release manifest의 `platform`은 실제 OCI image의 OS/architecture
readback과 일치해야 하며 staging rehearsal도 실행 중 container의 image
ID와 platform을 같은 manifest에 대조합니다.

이 로컬 package 증거는 staging 또는 live 인증을 대신하지 않습니다.

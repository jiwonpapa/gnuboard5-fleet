# SQLite 내구성·백업 기준

G5 Fleet v1은 별도 DB 서버 없이 내장 SQLite를 사용합니다. 가벼운 설치가 데이터 무결성 완화를 뜻하지는 않습니다. 이 문서는 서버 상태 DB가 전원 장애, 강제 종료, 디스크 부족과 업그레이드 실패 뒤에도 검증·복구 가능하도록 하는 필수 기준입니다.

## 1. 저장 범위

Fleet SQLite에는 다음 control-plane 정보만 저장합니다.

- Fleet 사용자와 서버 세션
- 관리 사이트 registry
- application-level로 암호화한 G5·SSH/SFTP 자격 증명
- notification outbox, retry, dedupe, dead-letter
- 장기 작업 상태, 설정과 감사 로그

G5 게시글, 회원, 주문과 원본 사이트 데이터는 각 G5 사이트 DB에 남기며 Fleet SQLite로 복제하지 않습니다.

## 2. 필수 SQLite 설정

모든 서버 connection은 다음 조건을 검증한 뒤 사용합니다.

```text
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

- DB, WAL과 SHM은 로컬 영구 volume에 둡니다.
- NFS, SMB, 동기화 폴더와 임시 container filesystem을 DB 경로로 사용하지 않습니다.
- write는 짧은 transaction과 하나의 application write coordinator를 거칩니다.
- process 종료 시 신규 write를 중단하고 진행 중 transaction을 마감한 뒤 종료합니다.
- 디스크 부족, I/O 오류와 checksum 불일치를 성공으로 처리하지 않습니다.

## 3. 최초 설치와 기존 설치 구분

- 최초 설치에서만 migration으로 새 DB를 생성합니다.
- 설치 identity가 존재하는데 DB가 없거나 열리지 않으면 빈 DB를 자동 생성하지 않습니다.
- schema version이 예상과 다르거나 integrity 검사가 실패하면 서버를 제한 모드로 시작하거나 종료하고 복구 절차를 안내합니다.
- 손상 의심 원본 DB, WAL과 SHM을 삭제·덮어쓰지 않고 별도 보존합니다.

## 4. Migration 안전성

- 모든 schema migration은 versioned source로 관리합니다.
- upgrade 전에 일관된 backup과 SHA-256을 생성합니다.
- 가능한 migration은 단일 transaction에서 실행합니다.
- migration 실패 시 새 버전 서비스를 열지 않고 이전 image와 backup으로 rollback합니다.
- destructive migration은 expand → migrate/readback → contract 순서로 분리합니다.

## 5. Backup

실행 중인 `.db`, `-wal`, `-shm` 파일을 각각 복사하지 않습니다. SQLite online backup API 또는 `VACUUM INTO`처럼 일관된 snapshot을 보장하는 방식만 사용합니다.

각 backup은 다음 정보를 함께 가집니다.

- DB snapshot SHA-256
- 생성 시각
- G5 Fleet version과 Git SHA
- schema version
- SQLite version
- backup method

기본 정책은 upgrade 전 backup과 일일 순환 backup입니다. 운영자는 backup 경로를 DB와 다른 volume 또는 off-host 저장소에 mount할 수 있어야 합니다. 같은 디스크의 backup만으로 디스크 고장을 복구할 수 있다고 표현하지 않습니다.

암호화된 자격 증명을 복구하려면 DB backup과 별도로 보관한 server master key가 모두 필요합니다. master key를 DB 안에 저장하지 않습니다.

## 6. 무결성 검사와 복구

- 정상 시작 전 `PRAGMA quick_check`를 실행합니다.
- 예약 maintenance와 release 검증에서는 `PRAGMA integrity_check`와 foreign key 검사를 실행합니다.
- backup 생성 후 별도 임시 DB로 열어 integrity, schema version과 핵심 row readback을 검증합니다.
- 검증되지 않은 backup을 최신 정상 backup으로 표시하지 않습니다.
- 손상 감지 시 자동 초기화하지 않고 마지막 검증 backup 복원을 기본 복구 경로로 사용합니다.

## 7. 필수 장애 테스트

다음 검증을 통과하기 전에는 backup·upgrade를 인증하지 않습니다.

1. write transaction 중 process 강제 종료 후 재시작
2. migration 중 오류와 rollback
3. 디스크 공간 부족
4. DB page 손상 감지와 fail-closed
5. online backup 생성, checksum 검증, 별도 경로 복원
6. 복원 DB의 사용자·사이트·outbox readback
7. 이전 image와 schema 호환 rollback

SQLite 자체나 단일 디스크가 물리적 고장을 절대 일으키지 않는다고 보장할 수는 없습니다. 제품이 보장해야 하는 것은 손상을 조용히 무시하거나 빈 DB로 덮어쓰지 않고, 손상을 감지하며, 검증된 backup으로 복구 가능한 운영 경계입니다.

## 8. 구현 위치와 시작 정책

- schema: `crates/fleet-store/migrations/0001_control_plane.sql`
- 저장·시작 검증: `crates/fleet-store/src/lib.rs`
- backup·restore: `crates/fleet-store/src/backup.rs`
- 장애 증적: `crates/fleet-store/tests/durability.rs`

최초 설치만 다음 명령을 한 번 실행합니다.

```bash
G5_FLEET_DATA_DIR=/var/lib/g5-fleet \
G5_FLEET_INSTALLATION_ID=fleet-production-01 \
cargo run -p g5-fleet-admin-server -- init-store
```

이후 `serve`는 동일 경로의 `installation.json`과 `fleet.sqlite3`를 기존 상태로 열며 누락되면 종료합니다. Backup·restore 운영 명령과 upgrade orchestration은 B09 패키징 배치에서 이 검증 API에 연결합니다.

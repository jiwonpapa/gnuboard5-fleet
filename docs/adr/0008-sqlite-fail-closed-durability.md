# ADR-0008: SQLite fail-closed 저장·복구 경계

- 상태: Accepted
- 결정일: 2026-07-24
- 배치: B03

## 결정

Fleet control-plane 저장소는 `crates/fleet-store`가 단독 소유합니다. 최초 설치는 명시적 `init-store` 명령에서만 DB를 만들고, 정상 서버 시작은 설치 identity와 기존 DB를 모두 요구합니다. DB 누락·손상·schema 불일치 시 빈 DB를 생성하지 않습니다.

모든 활성 connection은 WAL, `synchronous=FULL`, foreign key와 5초 busy timeout을 강제합니다. 쓰기는 process data-directory lock과 application 단일 writer를 거치는 짧은 transaction으로 수행합니다.

Backup은 실행 중 파일 복사가 아니라 `VACUUM INTO` snapshot으로 만들고 SHA-256 manifest, integrity·foreign key·schema·설치 identity·핵심 row readback을 검증합니다. Restore는 별도 경로에서 snapshot을 다시 검증한 뒤 DB를 게시하고 installation identity를 마지막에 기록합니다.

## 근거

별도 PostgreSQL 서비스 없이 작은 self-hosted 설치를 유지하면서도 손상을 조용히 무시하거나 자동 초기화하지 않기 위해서입니다. SQLite나 단일 디스크의 물리적 무고장을 주장하지 않으며, 검출과 검증 복구 경계를 제품 보장으로 둡니다.

## 검증

`crates/fleet-store/tests/durability.rs`가 강제종료, migration rollback, `SQLITE_FULL`, page 손상, online backup·checksum·별도 restore와 사용자·사이트·outbox readback을 검증합니다.

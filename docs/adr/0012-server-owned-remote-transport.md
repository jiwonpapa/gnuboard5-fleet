# ADR-0012: 서버 소유 SSH·SFTP transport

- 상태: Accepted
- 날짜: 2026-07-24

## 결정

SSH와 SFTP는 브라우저가 원격 G5 호스트에 직접 연결하지 않고
`apps/admin-server`가 고정된 OpenSSH 실행 파일로 중계합니다.

- SSH 개인키와 사전 검증한 `known_hosts`는 사용자·사이트에 귀속해
  서버 암호화 저장소에만 보관합니다.
- 연결 전 호스트를 public IP로 해석하고 DNS를 재검증한 뒤 그 IP로
  연결합니다. `StrictHostKeyChecking=yes`와 `HostKeyAlias`를 강제합니다.
- 터미널 WebSocket은 사용자 session과 `site_id`에 더해 60초
  hash-only 일회성 ticket을 요구합니다. ticket은 URL이 아니라
  `Sec-WebSocket-Protocol`로 전달하고 서버는 ticket을 echo하지 않습니다.
- SFTP 명령은 구조화된 allowlist와 절대 경로 검증을 통과해야 합니다.
  shell 문자열 실행을 허용하지 않습니다.
- 업로드·다운로드는 서버 임시 파일을 거쳐 bounded stream으로 처리하고,
  전송 상태는 SQLite `jobs`에 사용자·사이트 단위로 기록합니다.
- 터미널 disconnect 시 자식 OpenSSH process를 종료합니다.

## 결과와 증거 한계

브라우저 응답에는 개인키, `known_hosts`, 서버 로컬 경로가 포함되지
않습니다. B07은 내부 상태 전이·HTTP/WebSocket 계약과 mock 경계를
검증하며 실제 외부 SSH/SFTP 연결 성공은 B10 local/staging 인증에서
별도로 증명합니다.

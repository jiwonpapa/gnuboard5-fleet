---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-30
review_cycle_days: 30
bounded_context: multisite
---
# xterm SSH Performance Audit

## 현재 구조 요약

- 프론트 진입점
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshSessionPage.tsx`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshTerminalSurface.tsx`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshXtermSurface.tsx`
- 프론트 SSH 브리지
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/use-site-ssh-shell.ts`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/api/client/ssh-shell.ts`
- Tauri command / app_state
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/site/ssh_session.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_session_service.rs`
- SSH 런타임
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin-ssh/src/connection.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin-ssh/src/shell.rs`

현재 흐름은 `xterm onData -> frontend local echo -> localhost websocket bridge -> app_state bridge host -> russh shell.write queue` 와 `backend shell stream task -> blocking read -> websocket push -> xterm write batch flush` 구조입니다. `cmd_ssh_shell_read`와 `g5:ssh-shell-output` Tauri event는 websocket bridge가 붙지 못한 fallback 경로로만 남아 있습니다.

## 병목 후보 목록

### P0

1. 키 입력마다 `cmd_ssh_shell_write`가 전체 `SshSessionStatusResponse`를 반환함
   - 입력 1회마다 불필요한 상태 직렬화/역직렬화가 붙었습니다.
   - 실제 키 입력 경로에는 필요 없는 payload입니다.

2. SSH 출력이 frontend polling으로 당겨지는 구조였음
   - 빠른 타이핑 시 원격 echo가 늦게 보이면, 입력이 누락된 것처럼 체감됩니다.
   - 키 입력 자체보다 `readShell` 왕복 지연이 체감 병목이었습니다.

3. xterm 출력이 `term.write`로 즉시 밀어넣어짐
   - 작은 chunk 남발과 큰 burst가 모두 메인 스레드를 점유할 수 있습니다.
   - 출력 폭주 시 입력 이벤트 처리와 경쟁합니다.

4. `fit()`와 resize 전파가 레이아웃 burst마다 바로 실행됨
   - `ResizeObserver`, window resize, fit 요청이 겹치면 중복 layout path가 발생합니다.

### P1

5. `SiteSshShellCard` 입력 flush가 write in-flight 상황에서 대기 키를 다시 밀어넣는 보장이 약했음
   - 느린 왕복 상황에서 지연 체감이 커지고, 마지막 글자가 늦게 반영되는 증상으로 보일 수 있습니다.

6. `xterm` 옵션이 성능 기준으로 명시되어 있지 않았음
   - `cursorBlink`, `smoothScrollDuration`, `allowTransparency`, `drawBoldTextInBrightColors` 등 기본값 의존이 있었습니다.

### P2

6. transcript persistence가 프론트 상태 경로를 계속 건드림
   - 출력 누적이 live React state를 바꾸면, 무거운 출력 상황에서 터미널 주변 UI까지 재렌더됩니다.
   - transcript는 복구용인데 hot path에서 live state로 다루면 입력 체감까지 나빠질 수 있습니다.

## 원인 분석

- 입력 랙의 주원인은 `xterm.js 자체`보다 `frontend -> Tauri write invoke -> backend read -> frontend poll` 왕복 구조였습니다.
- 키 입력은 바이트 몇 개만 보내면 되는데, 기존 구현은 매번 연결 상태 전체를 다시 계산하고 반환했습니다.
- 출력은 poll 기반이라도 괜찮다는 가정을 두었지만, 실제 체감상 `readShell` 고정 poll 때문에 원격 echo가 늦게 보이는 것이 더 큰 문제였습니다.
- 들어온 chunk를 그대로 즉시 `term.write`하면 대량 출력 시 프레임 드랍이 생깁니다.
- 리사이즈는 UX상 자주 일어나므로 `fit()`를 한 프레임으로 접는 것이 중요합니다.

## 개선안

1. 입력은 즉시 전달하되, write 응답은 `void`로 줄인다.
2. frontend polling을 제거하고, backend shell task가 출력이 올 때마다 Tauri event로 밀어준다.
3. 출력은 `requestAnimationFrame` 단위 batch queue로 흘려보낸다.
4. backend write도 즉시 network flush가 아니라 queue + batch로 흘려보내 write hot path를 얇게 만든다.
5. `fit()`와 terminal resize 보고는 animation frame 단위로 합친다.
6. xterm 옵션은 성능과 네이티브 감각 기준으로 명시한다.
7. transcript persistence는 복구용 ref로 돌리고, live append는 React re-render를 일으키지 않게 분리한다.
8. 빠른 타이핑 체감은 로컬 즉시 에코와 원격 echo 정합으로 보강한다.
9. 최대화는 브라우저/Tauri fullscreen보다 앱 내부 overlay 작업면으로 처리해 레이아웃 간섭을 끊는다.
10. 마지막 남은 `invoke-per-write`는 localhost websocket bridge로 치환해 터미널 입력을 장기 채널처럼 다룬다.
11. bridge reconnect 시 snapshot이 비어 있으면 지연 타이머 대신 즉시 prompt refresh를 보내 새로고침 후 수동 Enter 의존을 줄인다.

## 적용 내용

### 1. write / resize command payload 축소

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_session_service.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/site/ssh_session.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/api/client/ssh-shell.ts`
- 변경
  - `cmd_ssh_shell_write`, `cmd_ssh_shell_resize`는 더 이상 `SshSessionStatusResponse`를 반환하지 않습니다.
  - 입력 hot path에서 불필요한 상태 serialization을 제거했습니다.

### 2. backend shell event push

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin-ssh/src/shell.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_runtime.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/api/client/ssh-shell.ts`
- 변경
  - `SshShell`에 `Notify`를 추가해 새 stdout/stderr/close 이벤트가 오면 기다리던 read를 즉시 깨웁니다.
  - `shell.read()`는 버퍼가 비어 있으면 짧게 대기하고, 새 출력이 오면 바로 반환합니다.
  - `SshSessionService`가 셸 open 시 backend task를 하나 띄워 `shell.read()`를 계속 대기하고, 출력이 생기면 `g5:ssh-shell-output` 이벤트로 frontend에 push 합니다.
  - 프런트는 반복 `readShell` loop를 제거하고 listener 하나만 유지합니다.

### 2-2. localhost websocket terminal bridge

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_terminal_bridge.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_terminal_bridge_service.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/site/ssh_terminal_bridge.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/site-ssh-terminal-bridge.ts`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`
- 변경
  - shell이 열려 있으면 site 단위 일회용 티켓으로 localhost websocket bridge를 연다.
  - xterm 입력은 bridge가 준비된 뒤부터 `cmd_ssh_shell_write` 대신 websocket `input` frame으로 backend writer queue에 직접 전달한다.
  - resize도 같은 bridge를 타서 `invoke-per-resize` 경로를 줄인다.
  - bridge subscriber가 붙은 동안에는 backend가 동일 출력을 Tauri event로 한 번 더 emit하지 않아 불필요한 cross-bridge 비용을 줄인다.
  - bridge `ready(snapshot="")`인 경우에는 frontend가 즉시 `\r`을 한 번 보내 prompt를 복구한다. 이전처럼 느슨한 timeout에 기대지 않아 새로고침 후 수동 Enter 필요성을 줄인다.

### 2-1. backend shell write queue / blocking read

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin-ssh/src/shell.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/core/ports.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/core/port_adapters.rs`
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_session_service.rs`
- 변경
  - `SshShell::write`는 이제 SSH writer를 직접 await 하지 않고 bounded queue에 적재합니다.
  - writer task는 연속 입력을 최대 16 KiB 단위로 묶어 write/flush 하므로, 빠른 타이핑에서 invoke hot path가 network flush를 직접 기다리지 않습니다.
  - resize도 문자열 write와 같은 writer command queue를 타서 순서를 보장합니다.
  - shell stream task는 timed `read()` 대신 `read_blocking()`을 사용해, 출력이 올 때까지 대기했다가 즉시 event push 합니다.

### 3. xterm 출력 batching

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshXtermSurface.tsx`
- 변경
  - `pendingOutputChunksRef` + `requestAnimationFrame` flush queue 도입
  - 한 프레임당 약 32 KiB 수준으로 batch write
  - write callback 이후 잔여 queue가 있으면 다음 frame에서 이어서 flush

### 4. fit / resize 중복 억제

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshXtermSurface.tsx`
- 변경
  - `fit()`를 바로 호출하지 않고 animation frame 단위로 합침
  - 마지막 전송한 `cols x rows`를 기억해 동일 resize는 다시 backend로 보내지 않음

### 5. 입력 flush 보강

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`
- 변경
  - write 완료 후 pending input이 남아 있으면 즉시 다음 flush를 예약
  - 일반 타이핑은 timer batching 대신 microtask flush로 바꾸고, `Enter`/`Ctrl+C`/`Ctrl+D`는 같은 턴에서 즉시 flush합니다.
  - 빠른 타이핑 시 화면이 원격 echo를 기다리느라 늦게 보이는 체감을 줄이기 위해, 짧은 printable input은 xterm surface에 먼저 로컬 에코하고 뒤늦게 도착한 원격 echo는 prefix 정합으로 제거합니다.

### 6. xterm 옵션 명시화

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshXtermSurface.tsx`
- 적용 옵션
  - `scrollback: 5000`
  - `fastScrollModifier: "alt"`
  - `fastScrollSensitivity: 5`
  - `smoothScrollDuration: 0`
  - `cursorBlink: false`
  - `convertEol: false`
  - `allowTransparency: false`
  - `drawBoldTextInBrightColors: false`
  - `fontFamily: ui-monospace 계열`
  - `fontSize: 13`
  - `lineHeight: 1.15`
  - `letterSpacing: 0`
  - `WebGL addon` 우선, 실패 시 기본 렌더러 fallback

### 7. transcript state / persistence 완화

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/use-site-ssh-terminal-workspace.ts`
- 변경
  - transcript append는 React Query/live state를 전혀 건드리지 않고 ref에만 누적
  - 복구용 transcript는 최초 load/clear 시점에만 state로 다루고, live append는 localStorage debounce로만 저장
  - keep-connected semantics는 그대로 유지

### 8. 앱 내부 작업면 최대화

- 수정 파일
  - `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshShellCard.tsx`
- 변경
  - 브라우저/Tauri fullscreen API 의존을 제거하고 `document.body` 기준 fixed overlay 작업면으로 최대화합니다.
  - 상위 레이아웃 배경/스크롤이 같이 흔들리는 문제를 줄이고, 에디터형 앱과 비슷한 최대화 동선을 제공합니다.

## 남은 리스크

1. transcript는 이제 복구용 ref 중심으로 분리됐지만, 장시간 세션에서 메모리 상 transcript 문자열은 계속 커질 수 있습니다.
   - 현재는 `MAX_SSH_TRANSCRIPT_CHARS`로 잘라 유지합니다.
2. 출력은 이제 Tauri event push 기반이고, backend write도 queue로 얇아졌지만 입력은 여전히 invoke 1회당 1 write enqueue 구조입니다.
   - 따라서 남은 체감 병목은 `invoke 자체 비용`과 원격 PTY echo 자체입니다.
3. IME/조합 입력은 xterm 표준 경로를 유지했지만, macOS 특정 조합키 회귀는 실기 확인이 필요합니다.
4. 남은 체감 랙의 가장 큰 후보는 이제 `invoke 기반 write`가 아니라, websocket 위에서 여전히 `WebView DOM -> xterm.js -> JS bridge -> Rust -> SSH PTY`를 거치는 다층 구조 자체입니다.
   - 다른 xterm 기반 제품이 더 빠르게 느껴지는 이유는 대개 websocket/event push stream으로 stdout/stderr를 직접 밀고, 입력도 더 얇은 채널로 처리하기 때문입니다.
   - 현재 구조의 차기 근본 개선은 websocket bridge 위에서 IME/paste/local echo 정합을 더 다듬고, 필요하면 output flow control을 한 단계 더 세분화하는 것입니다.

## 추후 네이티브 터미널로 갈 경우 분리 포인트

- 현재 분리 경계는 이미 다음처럼 나뉘어 있습니다.
  - xterm UI surface: `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-ssh/SiteSshXtermSurface.tsx`
  - frontend command bridge: `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/api/client/ssh-shell.ts`
  - Tauri command/app_state: `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/commands/site/ssh_session.rs`, `/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/ssh_session_service.rs`
  - SSH runtime: `/Users/neojins/workspace/gnuboard5/rust/g5-admin-ssh/src/shell.rs`
- 따라서 나중에 네이티브 terminal widget으로 바꾸더라도 `frontend surface`만 교체하고 backend/runtime은 유지할 수 있습니다.

---
doc_type: support
status: active
owner: rust-admin
source_of_truth: false
ai_default_include: true
last_reviewed: 2026-03-27
review_cycle_days: 30
bounded_context: multisite
---
# SSH Terminal Performance Test Checklist

## 빠른 타이핑

- `ls -la`, `clear`, `pwd`, `cd /var/www && ls`를 빠르게 연속 입력해도 글자가 중간에 빠지지 않는지 확인
- `clear`를 평소 속도로 입력하고 바로 `Enter`를 쳤을 때, 화면상 텍스트가 `cle`/`clea`까지만 보인 채 엔터가 먼저 들어가지 않는지 확인
- shell open 직후 websocket bridge가 붙은 뒤에는 같은 테스트를 한 번 더 반복해 fallback invoke 경로가 아니라 bridge 경로에서도 동일하게 반응하는지 확인
- 길게 누른 자동 반복 입력에서도 커서가 밀리지 않는지 확인

## 한글 입력 / IME

- 한글 IME를 켠 상태에서 조합 입력이 깨지지 않는지 확인
- 조합 중 `Backspace`, `Space`, `Enter` 동작이 비정상적으로 중복 전송되지 않는지 확인

## 대량 출력

- `ls -R`
- `find . -maxdepth 4`
- `journalctl -n 500`
- `tail -f` 유사 연속 출력
- 출력이 쏟아지는 동안에도 새 키 입력이 즉시 반응하는지 확인

## 붙여넣기

- 짧은 명령 붙여넣기
- 여러 줄 스크립트 붙여넣기
- 긴 환경 변수/JSON 문자열 붙여넣기
- 붙여넣기 직후 UI가 멈추지 않고 shell에 그대로 전달되는지 확인

## 창 리사이즈

- 창 폭/높이를 연속으로 크게/작게 조절
- `stty size`로 원격 PTY resize가 실제로 따라오는지 확인
- 전체화면 진입/해제 후 줄바꿈과 커서 위치가 정상인지 확인

## 세션 재연결 / 탭 전환

- 다른 페이지로 이동했다가 돌아와도 `접속 유지` 설정에 맞게 상태가 복원되는지 확인
- 새로고침 직후 셸이 멈춘 화면처럼 보이지 않고, 프롬프트가 자동으로 다시 살아나는지 확인
- shell close -> reopen 후 이전 listener가 중복되지 않는지 확인
- disconnect -> reconnect 후 이전 출력/입력이 중복 재생되지 않는지 확인

## 메모리 / 리소스

- shell reopen를 여러 번 반복해도 입력 지연이 누적되지 않는지 확인
- 긴 출력 후 메모리 사용량이 계속 증가만 하지 않는지 확인
- WebGL 사용 실패 시 fallback 이후에도 dispose 누락이나 중복 listener가 없는지 확인

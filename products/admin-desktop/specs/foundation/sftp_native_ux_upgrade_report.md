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
# SFTP Native UX Upgrade Report

## 결론

- `Tauri + React` 스택을 유지한 채로도 SFTP를 충분히 `앱처럼` 만들 수 있다.
- `1~4단계` 핵심 축은 이미 구현됐다. 현재는 `좌측 트리 / 우측 가상화 목록 / 하단 Rust 전송 큐` 구조, batch selection/action, recursive upload/download, pause/retry/cancel까지 갖춘 상태다.
- 다만 현재 구현은 아직 `FileZilla/Transmit`처럼 완전히 다듬어진 파일 클라이언트라기보다, `앱형 작업면으로 승격된 원격 파일 탐색기`에 가깝다. 다음 보강 포인트는 행/패널 밀도, 멀티선택 단축키, 컨텍스트 메뉴, 작업 반응/오류 통합 정리다.
- 외부 라이브러리는 `하나의 만능 파일매니저`를 들여오는 것보다, `분할 패널 + 가상화 목록 + 탐색기형 트리`를 조합하는 쪽이 현재 코드베이스와 더 잘 맞는다.
- 추천 조합은 아래와 같다.
  - 분할 패널: `react-resizable-panels`
  - 파일 목록 가상화: `@tanstack/react-virtual`
  - 디렉터리 트리: `react-arborist`
  - 컨텍스트 메뉴: 기존 `@radix-ui/react-context-menu` 유지
  - 파일 선택/저장: 기존 `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs` 유지
- 업로드/다운로드/복사/이동/삭제는 프런트 `useState`가 아니라 Rust `app_state` 전송 매니저로 승격해야 제품급 품질이 나온다.

## 현재 구조 진단

### 1. 작업면은 앱형 split-pane으로 승격됐지만, 아직 완전한 듀얼 파일 클라이언트는 아니다

- 현재 SFTP 화면은 [`/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpWorkspaceSurface.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpWorkspaceSurface.tsx) 기준으로 `좌측 트리 / 우측 파일 목록 / 하단 작업 큐` split-pane 작업면으로 동작한다.
- panel 비율은 site별 local storage에 저장되고, queue 패널도 독립 영역으로 분리돼 더 이상 웹 폼 카드처럼 섞이지 않는다.
- 다만 현재는 `원격 한쪽 패널` 중심이라, `FileZilla`의 `로컬/원격 2pane` 감각까지는 아직 의도적으로 가지 않았다.

### 2. 파일 목록은 virtualization과 batch selection이 들어갔지만, 밀도/단축키/컨텍스트는 더 다듬을 여지가 있다

- 목록은 [`/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpBrowserList.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpBrowserList.tsx) 에서 `@tanstack/react-table + @tanstack/react-virtual`로 렌더링한다.
- `..` 상위 이동, 체크박스 기반 멀티선택, 헤더 전체선택, 다중 다운로드/복사/이동/삭제는 이미 동작한다.
- 최근 밀도 조정으로 row/header/action 폭과 높이를 더 줄였고, 선택 툴바/작업 큐도 한 줄 중심으로 압축해 이전보다 FileZilla류 정보량에 더 가깝게 맞췄다.
- 최근 작업으로는 SFTP 툴바에 `- / +` 목록 폰트 조절을 넣어, 좌측 트리와 우측 목록을 site별로 즉석 조절할 수 있게 했다.
- 현재 선택 모델은 `checkbox-only batch selection + directory row single-click open`으로 정리돼 있다. 즉 체크박스는 batch 작업만 담당하고, 좌측 트리 sync는 현재 디렉터리/포커스 기준으로만 움직인다.
- 또 SFTP 작업면 자체는 `master unlocked + authenticated site session`일 때만 query를 활성화해, 잠금/로그아웃 직후 중앙 오류 모달이 먼저 뜨는 회귀를 막았다.
- 현재 남은 과제는 `FileZilla` 수준의 마지막 시각 밀도 조정과, 전송 패널/선택 표현을 더 탐색기답게 다듬는 polish다. 최근 기준으로는 `checkbox-only selection`, `directory row single-click open`, `no directory double-click open`, `checkbox does not affect tree selection`, `S/M/L viewport presets`까지 고정했다.

### 3. 트리는 `react-arborist`로 교체됐고, 기본 탐색기 동작은 확보됐다

- 트리는 [`/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpDirectoryTree.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpDirectoryTree.tsx) 에서 `react-arborist` 기반으로 동작한다.
- 현재 path, open state, lazy load, 현재 노드 강조, panel 높이 대응은 이미 연결됐다.
- 남은 개선 포인트는 트리 포커스와 목록 선택 상태가 더 자연스럽게 이어지는 마지막 polish 정도다.

### 4. 전송 큐는 Rust 승격까지 완료됐고, batch 작업의 중심축이 됐다

- upload/download/copy/move/delete 큐는 이제 [`/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/sftp_transfer_service.rs`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/sftp_transfer_service.rs), [`/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/sftp_transfer_queue.rs`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src-tauri/src/app_state/sftp_transfer_queue.rs) 기준으로 Rust `app_state`가 소유한다.
- 동시 작업 수 제한, `pause / retry / cancel`, recursive upload/download, live snapshot fanout은 이미 들어갔다.
- 셀프감사에서 드러난 초기 snapshot hydrate race와 과거 성공 항목 오판도 보정했다. 즉 queue state hydration 안정성은 차단 이슈 없이 닫힌 상태다.

### 5. 에러와 작업 반응은 작업 큐 중심으로 옮겨졌지만, 제품형 작업센터로 더 다듬을 수 있다

- blocking 오류는 중앙 다이얼로그로 통일했고, 진행 중/완료/실패 작업은 하단 [`/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpTransferQueuePanel.tsx`](/Users/neojins/workspace/gnuboard5/rust/g5-admin/src/features/server-files/SiteSftpTransferQueuePanel.tsx) 에서 확인할 수 있다.
- 다만 `FileZilla/Transmit`처럼 더 촘촘한 로그 밀도, batch 완료 요약, 실패 항목 펼침 상세 보기는 아직 남아 있다.

## 적용 현황

### 완료된 항목

1. `react-resizable-panels` 기반 split-pane 작업면
2. `@tanstack/react-virtual` 기반 파일 목록 virtualization
3. `react-arborist` 기반 디렉터리 트리 교체
4. Rust 전송 매니저 승격
5. batch selection / batch copy / batch move / batch delete / batch download
6. selection-aware 우클릭 컨텍스트 메뉴
7. `Cmd/Ctrl+A`, `Delete`, `Enter`, `Escape` 기본 단축키
8. `ArrowUp/ArrowDown/Home/End` 목록 선택 이동과 follow-scroll
9. 셀프감사 기준 queue hydrate race 차단

### 남은 제품형 polish 과제

1. 전송 패널 실패 상세 보기와 batch 완료 요약의 시각 밀도 polish
2. 행/컬럼 밀도와 트리 폭을 실제 스크린샷 기준으로 1~2회 더 튜닝
3. 필요 시 local pane 또는 local-path quick actions 검토

## 현재 코드베이스에서 바로 활용 가능한 외부 라이브러리

### 이미 사용 중이며 유지해야 하는 것

1. `@tanstack/react-table`
   - 현재 목록 렌더링 기반으로 이미 들어가 있다.
   - 목록 자체를 갈아엎기보다 virtualization만 붙이는 것이 합리적이다.
   - 공식 문서도 Table 자체엔 virtualization이 내장되어 있지 않고, 다른 virtualization 라이브러리와 함께 쓰라고 안내한다.
   - 출처: [TanStack Table Virtualization Guide](https://tanstack.com/table/latest/docs/guide/virtualization)

2. `@radix-ui/react-context-menu`
   - 현재 앱의 상호작용 계열과 잘 맞는다.
   - 우클릭 메뉴는 새 라이브러리로 갈 필요 없이 유지하는 것이 맞다.

3. `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`
   - 시스템 파일 열기/저장, 다중 선택, 저장 다이얼로그는 이미 공식 플러그인이 충분히 지원한다.
   - 출처: [Tauri Dialog Plugin](https://v2.tauri.app/plugin/dialog/), [Tauri File System Plugin](https://v2.tauri.app/plugin/file-system/)

## 신규 도입 후보와 판단

### 1. `@tanstack/react-virtual`

- 추천도: 높음
- 용도: 대량 파일 목록 row virtualization
- 근거
  - 공식 문서가 Table과의 조합을 직접 안내한다.
  - headless라서 현재 테이블 마크업과 스타일을 유지한 채 성능만 올리기 좋다.
  - 대용량 디렉터리에서 가장 즉각적인 체감 개선이 나온다.
- 출처: [TanStack Virtual Overview](https://tanstack.com/virtual/latest), [TanStack Table Virtualization Guide](https://tanstack.com/table/latest/docs/guide/virtualization)

### 2. `react-resizable-panels`

- 추천도: 높음
- 용도: 좌/우/하 작업면을 앱형 split-pane으로 재구성
- 근거
  - 레이아웃 저장, panel group, imperative API가 있어 작업면형 앱에 맞다.
  - 현재 `shadcn + tailwind` 쪽과 합이 괜찮고, 패널 배치 저장도 자연스럽다.
  - 과하게 opinionated하지 않아서 현재 화면을 천천히 옮기기 좋다.
- 출처: [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels)

### 3. `allotment`

- 추천도: 중간
- 용도: VS Code류 split view 느낌 강화
- 장점
  - 공식 README가 “VS Code split view codebase에서 파생”이라고 명시한다.
  - sash, pane UX가 익숙하다.
- 단점
  - 자체 스타일 성격이 강해 현재 디자인 시스템과의 조율 비용이 더 든다.
  - `react-resizable-panels`보다 현재 구조에 얹는 비용은 약간 더 높다.
- 출처: [Allotment GitHub](https://github.com/johnwalley/allotment)

### 4. `react-arborist`

- 추천도: 높음
- 용도: Explorer/Finder류 디렉터리 트리 교체
- 장점
  - README가 아예 “VSCode sidebar, Finder, Explorer 같은 트리”를 목표로 한다.
  - virtualization, keyboard navigation, selection sync, drag & drop, filtering을 제공한다.
  - 현재 `@minoru/react-dnd-treeview`보다 `탐색기` 느낌에 더 가깝다.
- 단점
  - 현재 트리 데이터를 한 번 맞춰야 한다.
  - selection/open state를 controlled로 운영하는 설계가 필요하다.
- 출처: [react-arborist GitHub](https://github.com/brimdata/react-arborist)

### 5. `react-complex-tree`

- 추천도: 중간 이상
- 용도: 키보드/멀티선택 중심 트리
- 장점
  - 공식 문서가 멀티선택과 다중 이동을 강하게 내세운다.
  - 파일 탐색기에서 키보드 이동을 중시하면 좋은 후보다.
- 단점
  - `react-arborist`보다 미관/렌더 커스터마이즈 체감은 더 공들여야 한다.
  - 현재 요구는 “앱처럼 보여야 한다” 쪽이 강해서 1순위는 아니다.
- 출처: [React Complex Tree](https://rct.lukasbach.com/)

### 6. `@dnd-kit`

- 추천도: 선택적
- 용도: 행/패널/선택 항목 drag & drop 상호작용 세밀 제어
- 판단
  - 향후 “멀티선택 파일 이동”, “드래그 센서 세밀 튜닝”, “키보드 drag”까지 가면 유용하다.
  - 다만 지금 당장 1차 목표는 `탐색기 + 목록 + 큐 + 모달 + 전송기`이므로 필수는 아니다.
  - 트리 라이브러리가 충분하면 첫 단계에서 굳이 들일 필요 없다.
- 출처: [dnd-kit Overview](https://dndkit.com/overview)

### 7. `Chonky`

- 추천도: 낮음
- 용도: 올인원 React 파일 브라우저
- 장점
  - “브라우저 안의 네이티브 파일 브라우저 경험”을 목표로 한 패키지다.
  - 액션/뷰/컨텍스트 메뉴 개념이 이미 있다.
- 단점
  - 최신 릴리즈가 `2022-01-08`로 보이고, 현재 스택과 스타일/상태관리 결합 비용이 크다.
  - 내부 의존이 무겁고, 지금의 `shadcn + tanstack + tauri` 조합과 충돌 가능성이 높다.
  - 지금 코드베이스에 넣으면 빠른 제품화보다 오히려 glue가 늘 가능성이 높다.
- 출처: [Chonky GitHub](https://github.com/TimboKZ/Chonky), [Chonky Docs](https://chonky.io/docs/2.x/api/file-browser/)

## 추천 조합

### 최종 추천

1. 분할 작업면: `react-resizable-panels`
2. 파일 목록 가상화: `@tanstack/react-virtual`
3. 디렉터리 트리: `react-arborist`
4. 컨텍스트 메뉴/모달: 기존 `Radix` 유지
5. 파일 열기/저장: 기존 `Tauri dialog/fs` 유지
6. 전송 큐: 외부 프런트 라이브러리 없이 Rust `app_state` 매니저로 구현

### 추천 이유

- 현재 코드베이스를 최대한 재사용할 수 있다.
- 기존 디자인 시스템과 충돌이 적다.
- 가장 제품 체감이 큰 영역만 골라 바꿀 수 있다.
- 올인원 파일매니저 패키지를 들여오는 것보다 bundle, 상태관리, 커스터마이즈 비용이 낮다.

## 다음 구현 계획

### 1단계. 고밀도 파일 목록/작업 큐 polish

- 목표
  - 목록과 큐가 `카드형 로그`가 아니라 `파일 클라이언트`처럼 촘촘하게 보이게 만들기
- 작업
  - row height/column width/queue line density 조정
  - `FileZilla` 기준의 정보 배치 재정렬
  - batch action toolbar와 row action 밀도 정리
  - 상태: 기본 밀도 조정, 실패 상세 보기, 목록/큐 후속 압축, split 비율과 좌측 컨트롤/트리 평탄화, 선택 툴바/queue row 재압축, 좌측 패널 폭/트리 row/컨트롤 바 최종 압축까지 완료. 남은 것은 정말 사소한 스크린샷 기준 visual tuning뿐이다.

### 2단계. batch context menu와 키보드 상호작용

- 목표
  - 다중 선택 후 우클릭/단축키로 `복사/이동/삭제/다운로드`가 자연스럽게 이어지게 만들기
- 작업
  - multi-select context menu
  - delete / rename / move shortcut 검토
  - 트리/목록 selection 동기화 강화
  - 상태: `컨텍스트 메뉴`, `Cmd/Ctrl+A`, `Delete`, `Enter`, `Escape`, `ArrowUp/ArrowDown/Home/End`, 목록 follow-scroll, 트리/목록 selection sync, `Ctrl/Cmd 클릭`, `Shift 클릭` range selection까지 완료. 이후 형님 피드백 기준으로 `row click selection`과 `directory double-click open`은 제거하고 `checkbox-only selection`으로 고정했다. 남은 것은 선택 상태의 마지막 visual tuning

### 3단계. 전송 패널을 작업센터처럼 다듬기

- 목표
  - 실패/진행/완료가 더 짧고 읽기 쉽게 모이게 만들기
- 작업
  - compact status line
  - 실패 상세 펼침
  - batch 완료/실패 요약
  - 상태: 최근 완료 요약, 실패 상세 toggle, 더 조밀한 정보 배치까지 완료. 남은 것은 batch summary의 마지막 visual tuning

## 전체 규모와 타당성

### 제품 기준 판단

- 이 기능이 SSH처럼 “보조 관리 기능”이어도, 체감 품질은 생각보다 중요하다.
- SFTP가 투박하면 사용자는 제품 전체를 `웹 관리자`로 느끼고, 앱으로서 신뢰를 덜 준다.
- 반대로 파일 작업이 부드럽고 큐/트리/목록이 안정적이면 “관리 앱” 품질이 급격히 올라간다.

### 현실적인 기간

- 이미 끝난 1차 제품급 개선: 완료
- 남은 polish 중심 2차: `1 ~ 2일`

### 해야 하느냐

- 형님 제품이 `SSH/SFTP 전문툴`은 아니므로, 네이티브 파일매니저 전체를 새로 만드는 건 과하다.
- 하지만 현재보다 한 단계 더 올리는 건 충분히 타당하다.
- 즉 결론은:
  - `전면 재개발`: 과함
  - `추천 조합 기반 단계 업그레이드`: 타당함

## 권장 실행 순서

1. 목록/큐 밀도 polish
2. batch context menu + 키보드 상호작용
3. 작업 로그/오류 UX polish

## 하지 않는 것이 좋은 선택

- `Chonky` 같은 올인원 파일브라우저를 통째로 들여오는 것
  - 현재 디자인/상태관리/번들 구조와 충돌 가능성이 크다.
- 프런트 `useState` 업로드 큐를 계속 키우는 것
  - 결국 glue만 늘고, 제품형 전송 매니저가 안 된다.
- 트리/목록/전송 큐를 각각 제각각 상태모델로 운영하는 것
  - 유지보수성이 급격히 나빠진다.

## 최종 제안

- 형님 기준으로는 이 작업을 `할 가치가 있다`.
- 다만 올인원 라이브러리 한 방보다, 아래 조합이 맞다.
  - `react-resizable-panels`
  - `@tanstack/react-virtual`
  - `react-arborist`
  - 기존 `Radix + Tauri dialog/fs`
  - Rust 전송 매니저
- 이 순서로 가면 `헌법`을 깨지 않고도, 글루코드 없이 `앱처럼 느껴지는 SFTP`에 가장 빨리 도달할 수 있다.

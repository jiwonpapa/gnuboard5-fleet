# 포인트/추천/스크랩 경합 감사 — 2026-03-10

## 1. 범위

- 포인트 적립/차감: `api/v1/Point/Repository/PointMutationRepository.php`
- 다운로드 포인트: `api/v1/File/Repository/FilePointRepository.php`
- 추천/비추천: `api/v1/Like/Repository/LikeRepository.php`
- 스크랩: `api/v1/Post/Repository/PostScrapMutationRepository.php`, `api/v1/Post/Service/PostScrapService.php`

## 2. 확인 결과

### 2.1 이미 잠금이 들어간 구간

- 포인트 적립/차감은 회원 단위 named lock(`point:member:{mb_id}`)과 DB 트랜잭션을 함께 사용한다.
- 다운로드 포인트는 회원 단위 named lock(`point:member:{mb_id}`)과 DB 트랜잭션을 함께 사용한다.
- 스크랩 등록/삭제와 `mb_scrap_cnt` 재계산은 회원 단위 named lock(`scrap:member:{mb_id}`)으로 serialize 된다.
- 추천/비추천은 회원+게시글 단위 named lock(`vote:{mb_id}:{bo_table}:{wr_id}`)으로 중복 투표를 막는다.

### 2.2 이번 라운드에서 보강한 구간

- 추천/비추천은 기존에도 named lock으로 중복은 막았지만, `board_good INSERT`와 `write table counter UPDATE`가 한 트랜잭션은 아니었다.
- 이번 수정에서 `LikeRepository::castVote()`를 트랜잭션으로 감싸, vote row 저장과 `wr_good/wr_nogood` 증가가 원자적으로 끝나도록 보강했다.
- 스크랩은 기존에 member lock으로 serialize 됐지만, `PostScrapService`가 `add/remove` 이후 `updateScrapCount()`를 별도 호출해 `mb_scrap_cnt`가 짧게 stale 될 수 있었다.
- 이번 수정에서 `PostScrapMutationRepository` 내부에서 `add/remove + mb_scrap_cnt sync`를 같은 member lock과 같은 트랜잭션 안에서 처리하도록 보강했다.

## 3. 위험도 판정

| 구간 | 현재 판정 | 근거 |
|------|-----------|------|
| 포인트 적립/차감 | 낮음 | named lock + transaction + 중복 rel key 검사 |
| 다운로드 포인트 | 낮음 | named lock + transaction + 파일별 rel action(`다운로드-{bf_no}`) |
| 추천/비추천 | 낮음 | named lock + transaction으로 보강 완료 |
| 스크랩 | 낮음 | member lock + transaction 안에서 `add/remove + mb_scrap_cnt sync`를 함께 처리 |

## 4. 결정

1. `AUD-201`의 즉시 보강 대상은 추천/비추천와 스크랩 카운트의 트랜잭션 정합성으로 확정한다.
2. 포인트/다운로드 포인트는 현재 잠금 전략을 유지하고 회귀 테스트만 보강한다.
3. 후속 재감사는 포인트/스크랩보다 운영상 실제 요구가 생길 때만 추가 경합 구간을 확장한다.

## 5. 테스트 전략

- `tests/Point/PointRepositoryTest.php`: 회원 포인트 lock/transaction 회귀 유지
- `tests/File/FilePointRepositoryTest.php`: 다운로드 포인트 lock/duplicate/잔액 부족 회귀 추가
- `tests/Like/LikeRepositoryTest.php`: 추천/비추천 transaction commit/rollback 회귀 추가
- `tests/Post/PostScrapRepositoryTest.php`: 스크랩 repository read path와 `add/remove + count sync` 트랜잭션 회귀 유지

## 6. 결론

- 경합 자체를 방치한 구간은 아니었고, 이번 라운드의 실질 보강 포인트는 `LikeRepository`와 `PostScrapMutationRepository`의 원자성 보강이었다.
- 따라서 `AUD-201`은 "잠금 전략 재감사 + 우선 보강 대상 확정 + 트랜잭션 보강 + 회귀 테스트 추가"까지 완료로 본다.

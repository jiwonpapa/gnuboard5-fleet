# 🤖 Codex 포인트 도메인 리팩토링 + 보강 프롬프트

---

## 🎭 페르소나

```
너는 "IRONDEV"다.
20년 경력 PHP 시니어 아키텍트.
포인트 로직이 PostRepository(187줄) + AuthRepository(40줄) + AdminPointRepository에 3중 중복된 상태를
PointGateway 단일 인터페이스로 통합한다. 기존 API 외부 응답을 깨지 않으면서 내부만 리팩토링.
PHPStan level 6. PHPUnit 필수. 보고는 한글로, 코드는 영어로.
```

---

## 📋 필수 참조 파일

```
.agent/Constitution.md
api/v1/Integration/Contracts/PointGateway.php       ← 🔴 현재 1 메서드만
api/v1/Point/Service/PointService.php               ← 50줄 (getMyPointHistory)
api/v1/Point/Repository/PointRepository.php         ← 124줄 (getPointHistory)
api/v1/Point/Controller/PointController.php
api/v1/Post/Repository/PostRepository.php           ← 🔴 grantWritePoint(L949-1031) + revokeWritePoint(L1033-1136)
api/v1/Post/Service/PostService.php
api/v1/Auth/Repository/AuthRepository.php           ← 🔴 grantRegisterPoint
api/v1/Auth/Service/AuthService.php
api/v1/Admin/Point/Service/AdminPointService.php    ← grant/deduct
api/v1/Admin/Point/Repository/AdminPointRepository.php ← adjustPoint
api/routes.php
tests/Point/PointServiceTest.php
```

### G5 원본 참조
```
lib/common.lib.php         ← insert_point() / delete_point() 정의
bbs/point.php              ← 내역 조회 37줄
adm/point_update.php       ← 수동 부여 27줄
adm/point_list.php         ← 관리자 목록 257줄
adm/point_list_delete.php  ← 관리자 삭제
```

---

## ✅ 건드리지 않을 외부 API 응답 (동일 유지)

- `GET /v1/members/me/points` → 포인트 내역
- `GET /v1/admin/points` → 관리자 목록
- `POST /v1/admin/points/grant` → 수동 지급
- `POST /v1/admin/points/deduct` → 수동 차감
- 글쓰기/삭제 시 포인트 적립/회수 동작 유지

---

## 🔥 WS-1: PointGateway 통합 리팩토링 (P0, 3 서브태스크)

### WS-1A: PointGateway 인터페이스 확장

`api/v1/Integration/Contracts/PointGateway.php` 수정:

```php
interface PointGateway
{
    // 기존 유지
    public function getPointHistory(string $memberId, int $page, int $perPage): array;
    
    // === 신규 추가 ===
    
    /**
     * 포인트 적립. 중복 체크는 내부에서 처리 (exists 확인 후 skip).
     * point < 0 이면 차감 (mb_point + point < 0 이면 예외 발동).
     * 트랜잭션: g5_point INSERT + g5_member UPDATE 원자적 실행.
     */
    public function grant(
        string $memberId,
        int $point,
        string $content,
        string $relTable,
        string $relId,
        string $relAction,
        ?int $expireDays = null
    ): void;

    /**
     * 기존 포인트를 회수 (역방향 grant).
     * 원본 po_rel_action으로 찾아서 반대 부호로 grant.
     * 이미 회수된 경우 false 반환.
     */
    public function revoke(
        string $memberId,
        string $relTable,
        string $relId,
        string $originalAction,
        string $revokeAction,
        string $revokeContent
    ): bool;

    /** 특정 (mb_id, rel_table, rel_id, rel_action) 조합이 존재하는지. */
    public function exists(
        string $memberId,
        string $relTable,
        string $relId,
        string $relAction
    ): bool;

    /** g5_point SUM → g5_member.mb_point 동기화 */
    public function syncTotal(string $memberId): void;
    
    /** 관리자 삭제 (po_id 기준) + mb_point 재계산 */
    public function deleteById(int $poId, string $memberId): void;
    
    /** 전체 또는 회원별 포인트 합계 */
    public function getSummary(?string $memberId = null): array;
}
```

### WS-1B: PointRepository 구현 이전

**`PointRepository.php` 확장 — `PostRepository.grantWritePoint()` + `revokeWritePoint()` 로직 이전:**

`grant()` 구현:
1. `exists()` 체크 → 이미 있으면 return (중복 방지)
2. `SELECT mb_point FROM g5_member WHERE mb_id = ?` → 현재 잔액
3. `$nextPoint = $currentPoint + $point` → 음수면 `ApiException::forbidden('포인트 부족')`
4. `$poExpired = $point < 0 ? 1 : 0`
5. `$expireDate` = expired ? today : (`expireDays` ? today+days : '9999-12-31')
6. **트랜잭션 시작**
7. `INSERT INTO g5_point (mb_id, po_datetime, po_content, po_point, po_use_point, po_expired, po_expire_date, po_mb_point, po_rel_table, po_rel_id, po_rel_action)`
8. `UPDATE g5_member SET mb_point = :nextPoint WHERE mb_id = ?`
9. **커밋** (에러 시 롤백)

`revoke()` 구현:
1. 원본 조회: `SELECT po_point FROM g5_point WHERE mb_id=? AND po_rel_table=? AND po_rel_id=? AND po_rel_action=?`
2. 없으면 `return false`
3. 회수 기록 존재 체크: `exists(mb_id, relTable, relId, revokeAction)`
4. 이미 있으면 `return false`
5. `$delta = -(int)$origin['po_point']` → `grant(mb_id, delta, revokeContent, relTable, relId, revokeAction)` 호출
6. `return true`

`syncTotal()` 구현:
```php
$sum = SELECT IFNULL(SUM(po_point), 0) FROM g5_point WHERE mb_id = ?;
UPDATE g5_member SET mb_point = $sum WHERE mb_id = ?;
```

### WS-1C: 기존 호출자 교체

**PostService 수정:**
```php
// 생성자에 PointGateway 추가
public function __construct(
    private readonly PostGateway $postGateway,
    private readonly BoardService $boardService,
    private readonly BoardGateway $boardGateway,
    private readonly PointGateway $pointGateway  // 추가
)

// createPost()에서:
$this->pointGateway->grant(
    $member['mb_id'],
    (int)$board['bo_write_point'],
    $board['bo_subject'] . ' ' . $wrId . ' 글쓰기',
    $boTable,
    (string)$wrId,
    '쓰기'
);

// deletePost()에서:
$this->pointGateway->revoke(
    $post['mb_id'], $boTable, (string)$wrId,
    '쓰기', '글삭제회수',
    $board['bo_subject'] . ' ' . $wrId . ' 글삭제'
);
```

**PostRepository에서 `grantWritePoint()` + `revokeWritePoint()` 삭제** (187줄 제거).

**AuthService 수정:**
```php
// 생성자에 PointGateway 추가
// register()에서:
$this->pointGateway->grant(
    $mbId, (int)$config['cf_register_point'],
    '회원가입 축하', '@member', $mbId, '회원가입'
);
// syncMemberPointTotal() 호출 → $this->pointGateway->syncTotal($mbId)
```

**AuthRepository에서 `grantRegisterPoint()` 삭제.**

**AdminPointService 수정:**
```php
// 기존 AdminPointRepository::adjustPoint() 대신
// PointGateway::grant() 사용
public function grant(array $payload, string $actorId): array {
    $this->pointGateway->grant(
        $memberId, $point, $content,
        '@passive', $actorId . '-' . uniqid(''), $actorId
    );
    ...
}
```

**routes.php DI 바인딩 업데이트:**
```php
// PostService 생성 시 PointGateway 주입
// AuthService 생성 시 PointGateway 주입
// AdminPointService 생성 시 PointGateway 주입
```

**테스트:**
- `tests/Point/PointRepositoryTest.php` — grant/revoke/exists/syncTotal
- `tests/Post/PostServicePointTest.php` — Mock PointGateway 호출 검증
- `tests/Auth/AuthServicePointTest.php` — Mock PointGateway 호출 검증
- 기존 `tests/Point/PointServiceTest.php` 유지 + 보강

---

## 🟡 WS-2: P1 비즈니스 로직 추가 (4건)

### WS-2A: 관리자 포인트 삭제
- `DELETE /v1/admin/points` (body: `{"po_ids": [1,2,3]}`)
- `AdminPointService::delete()` → 각 `po_id`에 대해 `PointGateway::deleteById()` 호출
- 삭제 후 해당 회원 `syncTotal()` 자동 호출

### WS-2B: 검색 보강
- `AdminPointService::list()` 쿼리에 `po_content` 검색 추가
- `GET /v1/admin/points?search=글쓰기&search_field=po_content` 지원

### WS-2C: 포인트 합계 API
- `GET /v1/admin/points/summary` → 전체 합계
- `GET /v1/admin/points/summary?mb_id=testuser` → 회원별 합계

### WS-2D: 유효기간 만료 처리
- `PointRepository::expirePoints()` 배치 메서드
- `UPDATE g5_point SET po_expired = 1 WHERE po_expire_date < CURDATE() AND po_expired = 0`
- `POST /v1/admin/points/expire` 엔드포인트 (관리자 전용)
- 만료된 포인트 대상 회원들 `syncTotal()` 호출

---

## 🏗️ 아키텍처 규칙

1. **PointGateway가 유일한 포인트 진입점**: PostRepo/AuthRepo/AdminPointRepo에서 직접 g5_point SQL 금지
2. **트랜잭션 필수**: grant()/revoke()는 INSERT + UPDATE가 원자적
3. **Prepared Statement만**
4. **기존 API 응답 동일 유지**: 이것은 리팩토링이지 기능 변경이 아님

## ✅ 자기 감사

```bash
cd ${PROJECT_ROOT}

vendor/bin/phpstan analyse api/ --level=6
vendor/bin/phpunit tests/

# 포인트 SQL이 PostRepository에서 제거되었는지 확인
grep -c 'po_point\|point_table\|po_datetime\|po_content\|po_expired' api/v1/Post/Repository/PostRepository.php
# → 0이어야 함

# 포인트 SQL이 AuthRepository에서 제거되었는지 확인  
grep -c 'po_point\|grantRegisterPoint' api/v1/Auth/Repository/AuthRepository.php
# → 0이어야 함

# PointGateway 메서드 수 확인
grep -c 'public function' api/v1/Integration/Contracts/PointGateway.php
# → 8 이상이어야 함

# PointRepository 메서드 수 확인
grep -c 'public function' api/v1/Point/Repository/PointRepository.php
# → 8 이상이어야 함
```

## 📝 완료 보고

```
docs/codex/point/RESULT.md
```

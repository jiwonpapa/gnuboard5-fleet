# 🤖 Codex 쪽지(Memo) 도메인 신규 구현 프롬프트

---

## 🎭 페르소나

```
너는 "IRONDEV"다.
쪽지 도메인은 API에 완전히 없으므로 100% 신규 구현한다.
기존 API 아키텍처(Gateway→Repository, Service, Controller) 패턴을 동일하게 따른다.
포인트 차감은 PointGateway를 사용한다.
PHPStan level 6. PHPUnit 필수. 보고는 한글로, 코드는 영어로.
```

---

## 📋 필수 참조 파일

```
.agent/Constitution.md
api/v1/Integration/Contracts/PointGateway.php     ← 포인트 차감 연동
api/v1/Post/Service/PostService.php               ← 아키텍처 참고
api/v1/Post/Repository/PostRepository.php         ← Repository 패턴 참고
api/v1/Post/Controller/PostController.php         ← Controller 패턴 참고
api/routes.php                                    ← DI 바인딩 + 라우트 참고
```

### G5 원본 참조
```
bbs/memo_form_update.php   ← 발송 111줄 (핵심)
bbs/memo.php               ← 받은/보낸 목록 87줄
bbs/memo_view.php          ← 읽기+읽음처리 81줄
bbs/memo_delete.php        ← 삭제 37줄
bbs/memo_form.php          ← 발송폼+유효성 48줄
```

---

## 🏗️ WS-1: 신규 도메인 스캐폴딩

### 파일 구조 (전부 [NEW])

```
[NEW] api/v1/Integration/Contracts/MemoGateway.php
[NEW] api/v1/Memo/Controller/MemoController.php
[NEW] api/v1/Memo/Service/MemoService.php
[NEW] api/v1/Memo/Repository/MemoRepository.php
[NEW] tests/Memo/MemoServiceTest.php
[MODIFY] api/routes.php  ← DI 바인딩 + 라우트 추가
```

### MemoGateway 인터페이스

```php
interface MemoGateway
{
    /** 받은/보낸 쪽지 목록 (페이징) */
    public function getList(string $memberId, string $kind, int $page, int $perPage): array;
    
    /** 쪽지 상세 조회 (본인 것만) */
    public function getById(int $meId, string $memberId, string $kind): ?array;
    
    /** 
     * 쪽지 발송 — recv + send 2행 INSERT (쌍 저장)
     * me_send_id로 연결. 반환: recv 레코드의 me_id
     */
    public function send(string $sendMbId, string $recvMbId, string $memo, string $ip): int;
    
    /** 읽음 처리 (recv일 때 me_read_datetime = NOW()) */
    public function markAsRead(int $meId, string $memberId): void;
    
    /** 안읽은 쪽지 수 */
    public function countUnread(string $memberId): int;
    
    /** 삭제 (본인 것만). 삭제 전 원본 반환 (읽음 상태 판별용) */
    public function delete(int $meId, string $memberId): ?array;
    
    /** g5_member.mb_memo_cnt = countUnread() 로 갱신 */
    public function updateMemoCount(string $memberId): void;
    
    /** g5_member.mb_memo_call = sendMbId 로 갱신 (실시간 알림) */
    public function updateMemoCall(string $recvMbId, string $sendMbId): void;
    
    /** g5_member.mb_memo_call = '' 초기화 */
    public function clearMemoCall(string $recvMbId, string $sendMbId): void;
    
    /** 수신자 유효성 (존재, mb_open, 미탈퇴, 미차단) */
    public function validateRecipient(string $recvMbId, bool $isAdmin): array;
}
```

### 엔드포인트 (routes.php 등록)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/memos` | 목록 (`?kind=recv\|send&page=1&per_page=20`) |
| `GET` | `/v1/memos/unread-count` | 안읽은 수 |
| `GET` | `/v1/memos/{me_id}` | 상세 (`?kind=recv\|send`, recv면 자동읽음) |
| `POST` | `/v1/memos` | 발송 |
| `DELETE` | `/v1/memos/{me_id}` | 삭제 |

---

## 🔥 WS-2: MemoService 비즈니스 로직

### WS-2A: 쪽지 발송
> G5 근거: `memo_form_update.php` L12-93

```php
public function send(array $member, array $payload, string $ip, array $config): array
```

1. 수신자 파싱: `explode(',', $payload['me_recv_mb_id'])`, 최대 10명 제한
2. 발신자 `mb_open` 체크 (비공개면 403, 관리자 제외)
3. 각 수신자 `validateRecipient()` — 존재, 공개, 미탈퇴, 미차단
4. 포인트 계산: `cf_memo_send_point × 수신자수` (관리자 면제)
5. 포인트 부족 시 403
6. 내용 제한: 65536 byte + XSS strip
7. 각 수신자별:
   - `memoGateway->send()` — recv+send 쌍 INSERT
   - `memoGateway->updateMemoCall()` — `mb_memo_call` 갱신
   - `memoGateway->updateMemoCount()` — `mb_memo_cnt` 갱신
   - `pointGateway->grant()` — 포인트 차감 (관리자 면제)
8. 반환: `{'sent_count': N, 'recipients': [...]}`

### WS-2B: 쪽지 목록
> G5 근거: `memo.php` L26-81

- kind = `'recv'` or `'send'`
- `WHERE me_{kind}_mb_id = ? AND me_type = ?`
- JOIN `g5_member`로 상대방 mb_nick
- 읽음 상태: `me_read_datetime != '0000-00-00 00:00:00'`
- 페이징 응답 (items + pagination)

### WS-2C: 쪽지 읽기 + 읽음 처리
> G5 근거: `memo_view.php` L9-22

- `kind = 'recv'`이면:
  - `me_read_datetime` UPDATE (본인 + me_send_id 연결 레코드)
  - `updateMemoCount()` 호출
- 본인 쪽지 아니면 403
- 상대방 정보 JOIN 반환

### WS-2D: 쪽지 삭제
> G5 근거: `memo_delete.php` L18-32

1. `memoGateway->delete(meId, memberId)` → 삭제 전 원본 반환
2. 미읽음 상태(`me_read_datetime == '0000-00-00'`)이면:
   - `clearMemoCall(recvMbId, sendMbId)` (수신자 알림 해제)
   - `updateMemoCount(memberId)` (카운트 갱신)

### WS-2E: 안읽은 수
- `countUnread()` → `{unread_count: N}`

---

## 🏗️ WS-3: MemoRepository SQL 패턴

### send() 쌍 INSERT
```sql
-- recv 레코드
INSERT INTO {$memoTable} 
(me_recv_mb_id, me_send_mb_id, me_send_datetime, me_memo, me_read_datetime, me_type, me_send_ip)
VALUES (:recv, :send, :now, :memo, '0000-00-00 00:00:00', 'recv', :ip);

-- recv me_id 획득
$recvId = lastInsertId();

-- send 레코드 (me_send_id = recv의 me_id)
INSERT INTO {$memoTable}
(me_recv_mb_id, me_send_mb_id, me_send_datetime, me_memo, me_read_datetime, me_send_id, me_type, me_send_ip)
VALUES (:recv, :send, :now, :memo, '0000-00-00 00:00:00', :recv_id, 'send', :ip);
```

### validateRecipient()
```sql
SELECT mb_id, mb_nick, mb_open, mb_leave_date, mb_intercept_date 
FROM {$memberTable} WHERE mb_id = :mb_id;
-- 비공개면 (admin 아닌 경우): 거부
-- 탈퇴/차단이면: 거부
```

### updateMemoCount()
```sql
UPDATE {$memberTable} 
SET mb_memo_cnt = (
    SELECT COUNT(*) FROM {$memoTable} 
    WHERE me_recv_mb_id = :mb_id AND me_type = 'recv' AND me_read_datetime = '0000-00-00 00:00:00'
)
WHERE mb_id = :mb_id;
```

---

## 🏗️ 아키텍처 규칙

1. **MemoGateway 인터페이스 먼저** → MemoRepository에서 implements
2. **PointGateway DI**: MemoService 생성자에서 주입
3. **Prepared Statement만**: SQL 문자열 보간 절대 금지
4. **JWT 인증 필수**: 모든 엔드포인트 회원 전용
5. **routes.php 등록**: $container 바인딩 + 라우트 추가
6. **XSS 필터**: me_memo에 `htmlspecialchars(ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8')`

## ✅ 자기 감사

```bash
cd ${PROJECT_ROOT}

vendor/bin/phpstan analyse api/ --level=6
vendor/bin/phpunit tests/

# 새 파일 존재
ls api/v1/Memo/Service/MemoService.php
ls api/v1/Memo/Repository/MemoRepository.php  
ls api/v1/Memo/Controller/MemoController.php
ls api/v1/Integration/Contracts/MemoGateway.php

# 라우트 등록
grep -n 'memo' api/routes.php

# 메서드 수
grep -c 'public function' api/v1/Integration/Contracts/MemoGateway.php
# → 11 이상
```

## 📝 완료 보고

```
docs/codex/memo/RESULT.md
```

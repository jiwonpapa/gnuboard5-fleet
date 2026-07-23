# 🤖 Codex 1:1문의(QA) 도메인 신규 구현 프롬프트

---

## 🎭 페르소나

```
너는 "IRONDEV"다.
QA(1:1문의) 도메인은 API에 완전히 없으므로 100% 신규 구현한다.
기존 아키텍처(Gateway→Repository, Service, Controller) 동일.
QA는 "미니 게시판"이다: 질문(qa_type=0) + 답변(qa_type=1) 쌍 구조.
PHPStan level 6. PHPUnit 필수. 보고는 한글, 코드는 영어.
```

---

## 📋 필수 참조 파일

```
.agent/Constitution.md
api/v1/Post/Service/PostService.php       ← 아키텍처 참고
api/v1/Post/Repository/PostRepository.php ← Repository + 파일업로드 패턴
api/routes.php
```

### G5 원본
```
bbs/qawrite_update.php  ← 등록/답변/수정/추가질문 485줄 (핵심)
bbs/qalist.php          ← 목록 149줄
bbs/qaview.php          ← 상세+답변+관련질문 219줄
bbs/qadelete.php        ← 삭제 96줄
bbs/qadownload.php      ← 파일 다운로드
adm/qa_config.php       ← QA 설정 413줄 (DDL 포함)
```

---

## 🏗️ WS-1: 스캐폴딩

### 파일 구조 (전부 [NEW])

```
[NEW] api/v1/Integration/Contracts/QaGateway.php
[NEW] api/v1/Qa/Controller/QaController.php
[NEW] api/v1/Qa/Service/QaService.php
[NEW] api/v1/Qa/Repository/QaRepository.php
[NEW] tests/Qa/QaServiceTest.php
[MODIFY] api/routes.php  ← DI + 라우트 추가
```

### QaGateway 인터페이스

```php
interface QaGateway
{
    public function getList(string $memberId, bool $isAdmin, int $page, int $perPage, ?string $category, ?string $searchField, ?string $searchText): array;
    public function getById(int $qaId, string $memberId, bool $isAdmin): ?array;
    public function createQuestion(array $data): int;
    public function createAnswer(int $parentQaId, array $data): int;
    public function createRelatedQuestion(int $relatedQaId, array $data): int;
    public function update(int $qaId, array $data): void;
    public function delete(int $qaId, string $memberId, bool $isAdmin): void;
    public function bulkDelete(array $qaIds): void;
    public function getRelatedQuestions(int $qaRelated, int $excludeQaId, int $limit): array;
    public function getFileForDownload(int $qaId, int $fileNo, string $memberId, bool $isAdmin): ?array;
    public function getQaConfig(): array;
}
```

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/v1/qa` | 목록 |
| `GET` | `/v1/qa/{qa_id}` | 상세 (답변+관련질문 포함) |
| `POST` | `/v1/qa` | 질문 등록 (multipart) |
| `POST` | `/v1/qa/{qa_id}/answer` | 답변 (관리자만) |
| `POST` | `/v1/qa/{qa_id}/related` | 추가질문 |
| `PATCH` | `/v1/qa/{qa_id}` | 수정 |
| `DELETE` | `/v1/qa/{qa_id}` | 삭제 |
| `DELETE` | `/v1/admin/qa` | 일괄삭제 (`{qa_ids:[...]}`) |
| `GET` | `/v1/qa/{qa_id}/files/{no}/download` | 파일 다운로드 |

---

## 🔥 WS-2: QaService 비즈니스 로직

### WS-2A: 질문 등록
> G5: `qawrite_update.php` L240-303

```php
public function createQuestion(array $member, array $payload, array $files, string $ip): array
```

1. `getQaConfig()` → 분류 목록 파싱 (`|` 구분)
2. `qa_category` 검증 (in_array)
3. `qa_req_email` 체크 → 필수이면 이메일 검증
4. 제목 255자, 내용 65536자, XSS 필터
5. 파일 업로드 (최대 2개):
   - `qa_upload_size` 크기 제한 (관리자 제외)
   - `getimagesize()` 이미지 검증
   - 악성 확장자 차단 (`.php` 등 → `-x`)
   - 파일명 해싱: `md5(sha1(ip)) . '_' . shuffle . '_' . safe_filename`
   - 저장: `data/qa/{hashed_filename}`
6. `qa_num = MIN(qa_num) - 1`
7. INSERT → `qa_parent = qa_id`, `qa_related = qa_id`

### WS-2B: 답변 등록 (관리자만)
> G5: `qawrite_update.php` L100-131, L246-311

```php
public function createAnswer(int $parentQaId, array $member, array $payload, array $files, string $ip): array
```

1. **관리자 체크** (`mb_level >= 10`)
2. 원질문 존재 확인
3. 답변글에 다시 답변 불가 (`qa_type = 1` → 거부)
4. `qa_type = 1`, `qa_status = 1`, `qa_parent = 원질문 qa_id`
5. `qa_num = 원질문의 qa_num`
6. INSERT
7. 원질문 `qa_status = 1` UPDATE

### WS-2C: 수정
> G5: `qawrite_update.php` L111-122, L312-343

```php
public function updateQuestion(int $qaId, array $member, array $payload, array $files): array
```

1. 본인 글만 (관리자는 모두)
2. **답변완료 질문 수정 불가**: `qa_type=0 && qa_status=1` → 403 (관리자 제외)
3. 파일 삭제/교체 (bf_file_del 체크)

### WS-2D: 삭제
> G5: `qadelete.php` L28-87

```php
public function deleteQuestion(int $qaId, array $member): void
```

1. 본인 / 최고관리자만
2. **일반회원: 답변 있는 질문 삭제 불가** (`qa_type=0 && qa_status=1`)
3. 관리자 삭제 시:
   - 답변글(qa_type=1, qa_parent=qa_id) 연쇄 삭제
   - 답변+질문 첨부파일 물리 삭제 + 썸네일 삭제
4. **답변 삭제 시 원질문 `qa_status = 0` 복원**

### WS-2E: 목록
> G5: `qalist.php` L46-103

- `qa_type = 0` (질문글만)
- 일반회원: `mb_id = ?` (본인만)
- 관리자: 전체
- 카테고리 필터 (sca)
- 검색 (qa_subject/qa_content/qa_name/mb_id)
- 페이징 (qa_page_rows)
- ORDER BY qa_num

### WS-2F: 상세
> G5: `qaview.php` L22-164

- 본인/관리자만 조회
- 답변 포함: `SELECT * FROM g5_qa_content WHERE qa_type=1 AND qa_parent=?`
- 관련질문: `SELECT * FROM g5_qa_content WHERE qa_related=? AND qa_type=0 AND qa_id<>?`
- 첨부파일 정보 (이미지/다운로드 구분)

---

## 🚫 이번 제외 (P2)
- SMS 알림 (icode 모듈 연동)
- 이메일 알림 (mailer.lib.php)
- 관리자 QA 설정 변경 API (adm/qa_config_update.php)
- qa_1~qa_5 여분필드 (용도 미정)

## 🏗️ 아키텍처 규칙
1. QaGateway → QaRepository implements
2. Prepared Statement만
3. 파일 저장: `data/qa/{hashed_filename}`
4. JWT 인증 필수
5. routes.php DI + 라우트 등록

## ✅ 자기 감사

```bash
cd ${PROJECT_ROOT}
vendor/bin/phpstan analyse api/ --level=6
vendor/bin/phpunit tests/
ls api/v1/Qa/Service/QaService.php
ls api/v1/Qa/Repository/QaRepository.php
ls api/v1/Integration/Contracts/QaGateway.php
grep -n 'qa' api/routes.php
grep -c 'public function' api/v1/Integration/Contracts/QaGateway.php
# → 11 이상
```

## 📝 완료 보고
```
docs/codex/qa/RESULT.md
```

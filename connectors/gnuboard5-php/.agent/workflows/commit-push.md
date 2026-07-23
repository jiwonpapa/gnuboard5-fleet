---
description: 커밋 푸시 및 히스토리 남기기 (헌법 §7 준수)
---
// turbo-all

1. 변경 사항에 대한 이력을 남겼는지 확인합니다.
   - `docs/HISTORY.md`에 **Why** 중심 서술 필수. (§0.3)

2. 하드코딩 검사 스크립트를 실행합니다.
   ```bash
   ./scripts/check_hardcoding.sh
   ```

3. 기본 품질 게이트를 실행합니다.
   ```bash
   composer run quality-gate
   ./scripts/docs-check.sh
   ```

4. API 계약을 건드렸다면 블랙박스 검증을 추가합니다. (Swagger 기반 자동 폭격 + 고정 회귀)
   ```bash
   composer run test:api:hurl
   composer run test:api:schemathesis
   # 인증 자동주입 + 픽스처 자동수집(권장)
   SCHEMATHESIS_AUTH_MB_ID=<ID> SCHEMATHESIS_AUTH_MB_PASSWORD=<PASSWORD> composer run test:api:schemathesis
   # 통합 실행
   composer run test:api:blackbox
   ```

5. Git 상태를 확인하고 스테이징합니다.
   ```bash
   git status
   git add .
   ```

6. 커밋 메시지를 작성하고 커밋합니다.
   - 형식: `작업유형(도메인): 작업 내용 요약`
   ```bash
   git commit -m "작업유형(도메인): 작업 내용 요약"
   ```

7. 현재 작업 브랜치를 원격에 푸시합니다.
   ```bash
   git push origin "$(git branch --show-current)"
   ```

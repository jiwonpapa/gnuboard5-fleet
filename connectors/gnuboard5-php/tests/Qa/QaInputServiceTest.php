<?php

declare(strict_types=1);

namespace Tests\Qa;

use Api\Qa\Service\QaInputService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class QaInputServiceTest extends TestCase
{
    public function testValidateCategoryAcceptsConfiguredValue(): void
    {
        $service = new QaInputService();

        $result = $service->validateCategory('배송', ['qa_category' => '배송|결제|기타']);

        $this->assertSame('배송', $result);
    }

    public function testValidateCategoryRejectsMissingOrInvalidConfiguration(): void
    {
        $service = new QaInputService();

        try {
            $service->validateCategory('배송', ['qa_category' => '']);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('1:1문의 분류 설정이 필요합니다.', $exception->getMessage());
        }

        try {
            $service->validateCategory('', ['qa_category' => '배송|결제']);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('qa_category는 필수입니다.', $exception->getMessage());
        }

        try {
            $service->validateCategory('기타', ['qa_category' => '배송|결제']);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('유효하지 않은 qa_category입니다.', $exception->getMessage());
        }
    }

    public function testNormalizeEmailHandlesOptionalBlankAndRejectsInvalidEmail(): void
    {
        $service = new QaInputService();

        $this->assertSame('', $service->normalizeEmail('', false));
        $this->assertSame('user@example.com', $service->normalizeEmail(' user@example.com ', true));

        try {
            $service->normalizeEmail('', true);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('이메일을 입력해주세요.', $exception->getMessage());
        }

        try {
            $service->normalizeEmail('bad-address', false);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('유효한 이메일 형식이 아닙니다.', $exception->getMessage());
        }
    }

    public function testSanitizeSubjectAndContentTrimTrailingBackslashesAndEscapeHtml(): void
    {
        $service = new QaInputService();

        $subject = $service->sanitizeSubject(" 제목 <b>강조</b>\\\\");
        $content = $service->sanitizeContent(" 내용 <script>alert(1)</script>\\\\");

        $this->assertSame('제목 &lt;b&gt;강조&lt;/b&gt;', $subject);
        $this->assertSame('내용 &lt;script&gt;alert(1)&lt;/script&gt;', $content);
    }

    public function testSanitizeSubjectAndContentRejectInvalidLengthsAndEntityFlood(): void
    {
        $service = new QaInputService();

        try {
            $service->sanitizeSubject(str_repeat('a', 256));
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('qa_subject 길이를 초과했습니다.', $exception->getMessage());
        }

        try {
            $service->sanitizeContent(str_repeat('&#1234;', 51));
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('내용에 올바르지 않은 코드가 다수 포함되어 있습니다.', $exception->getMessage());
        }
    }

    public function testHelperMethodsNormalizeFlagsIdentityAndKeywords(): void
    {
        $service = new QaInputService();

        $this->assertSame('010-1234-5678', $service->normalizePhone('010-1234-5678 내선'));
        $this->assertSame(1, $service->toBoolInt('yes'));
        $this->assertSame(0, $service->toBoolInt('off'));
        $this->assertSame('user1', $service->requireMemberId(['mb_id' => ' user1 ']));
        $this->assertTrue($service->isAdmin(['mb_level' => 10]));
        $this->assertSame('닉네임', $service->resolveQaName(['mb_nick' => '닉네임', 'mb_name' => '이름'], 'user1'));
        $this->assertSame('user1', $service->resolveQaName([], 'user1'));
        $this->assertSame(20, $service->normalizePositiveInt(null, 'page', 20));
        $this->assertSame(3, $service->normalizePositiveInt('3', 'page', 20));
        $this->assertSame('문의  제목', $service->normalizeNullableKeyword(" 문의 😀 제목 "));
        $this->assertNull($service->normalizeNullableKeyword('   '));
    }

    public function testRequireMemberIdAssertAdminAndNormalizePositiveIntRejectInvalidValues(): void
    {
        $service = new QaInputService();

        try {
            $service->requireMemberId([]);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('인증 토큰이 필요합니다.', $exception->getMessage());
        }

        try {
            $service->assertAdmin(['mb_level' => 2]);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('관리자만 수행할 수 있습니다.', $exception->getMessage());
        }

        try {
            $service->normalizePositiveInt('0', 'page', 20);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('page는 1 이상의 정수여야 합니다.', $exception->getMessage());
        }
    }
}

<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Post\Service\PostPayloadNormalizer;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class PostPayloadNormalizerTest extends TestCase
{
    public function testNormalizeCreatePayloadSanitizesTextAndNormalizesSecretOptions(): void
    {
        $normalizer = new PostPayloadNormalizer();

        $result = $normalizer->normalizeCreatePayload([
            'wr_subject' => ' 제목 <b>강조</b> ',
            'wr_content' => ' 본문 <script>alert(1)</script> ',
            'ca_name' => ' 일반 ',
            'wr_option' => 'mail',
            'wr_link1' => 'https://example.com/a',
            'wr_link2' => '',
            'is_notice' => 'yes',
        ], ['bo_use_secret' => 2], 2);

        $this->assertSame('제목 &amp;lt;b&amp;gt;강조&amp;lt;/b&amp;gt;', $result['subject']);
        $this->assertSame('본문 &amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;', $result['content']);
        $this->assertSame('일반', $result['category']);
        $this->assertSame('mail,secret', $result['option']);
        $this->assertSame('https://example.com/a', $result['link1']);
        $this->assertNull($result['link2']);
        $this->assertTrue($result['is_notice']);
    }

    public function testNormalizeReplyPayloadRemovesSecretForNonAdminWhenBoardDoesNotUseSecret(): void
    {
        $normalizer = new PostPayloadNormalizer();

        $result = $normalizer->normalizeReplyPayload([
            'wr_subject' => '답글',
            'wr_content' => '내용',
            'wr_option' => 'secret,mail',
        ], ['bo_use_secret' => 0], 2);

        $this->assertSame('답글', $result['subject']);
        $this->assertSame('내용', $result['content']);
        $this->assertSame('mail', $result['option']);
    }

    public function testFilterMutableFieldsNormalizesAllowedFields(): void
    {
        $normalizer = new PostPayloadNormalizer();

        $result = $normalizer->filterMutableFields([
            'wr_subject' => '수정 제목',
            'wr_content' => '수정 본문',
            'ca_name' => ' 공지 ',
            'wr_option' => 'mail',
            'wr_link1' => 'https://example.com/a',
            'wr_link2' => '',
        ], ['bo_use_secret' => 1], 2);

        $this->assertSame('수정 제목', $result['wr_subject']);
        $this->assertSame('수정 본문', $result['wr_content']);
        $this->assertSame('공지', $result['ca_name']);
        $this->assertSame('mail', $result['wr_option']);
        $this->assertSame('https://example.com/a', $result['wr_link1']);
        $this->assertSame('', $result['wr_link2']);
    }

    public function testNormalizeCreatePayloadRejectsInvalidOptionUrlAndCategory(): void
    {
        $normalizer = new PostPayloadNormalizer();

        try {
            $normalizer->normalizeCreatePayload([
                'wr_subject' => '제목',
                'wr_content' => '내용',
                'wr_option' => 'invalid',
            ], ['bo_use_secret' => 0], 2);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('wr_option 값이 올바르지 않습니다.', $exception->getMessage());
        }

        try {
            $normalizer->normalizeCreatePayload([
                'wr_subject' => '제목',
                'wr_content' => '내용',
                'wr_link1' => 'ftp://example.com',
            ], ['bo_use_secret' => 0], 2);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('wr_link1는 http(s) URL이어야 합니다.', $exception->getMessage());
        }

        try {
            $normalizer->normalizeCreatePayload([
                'wr_subject' => '제목',
                'wr_content' => '내용',
                'ca_name' => '카테고리😀',
            ], ['bo_use_secret' => 0], 2);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('ca_name에 지원하지 않는 문자가 포함되어 있습니다.', $exception->getMessage());
        }
    }

    public function testNormalizeCreatePayloadRejectsMissingRequiredFields(): void
    {
        $normalizer = new PostPayloadNormalizer();

        try {
            $normalizer->normalizeCreatePayload([
                'wr_subject' => '',
                'wr_content' => '내용',
            ], ['bo_use_secret' => 0], 2);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('wr_subject는 필수입니다.', $exception->getMessage());
        }

        try {
            $normalizer->normalizeCreatePayload([
                'wr_subject' => '제목',
                'wr_content' => '',
            ], ['bo_use_secret' => 0], 2);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('wr_content는 필수입니다.', $exception->getMessage());
        }
    }

    public function testMutationPayloadsRejectUnknownWrongTypedAndEmptyUpdates(): void
    {
        $normalizer = new PostPayloadNormalizer();

        foreach (
            [
                ['wr_subject' => '제목', 'wr_content' => '본문', 'unknown' => true],
                ['wr_subject' => ['제목'], 'wr_content' => '본문'],
            ] as $payload
        ) {
            try {
                $normalizer->normalizeCreatePayload($payload, ['bo_use_secret' => 0], 2);
                self::fail('Invalid create payload was accepted.');
            } catch (ApiException $exception) {
                self::assertNotSame('', $exception->getMessage());
            }
        }

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('수정할 게시글 필드가 필요합니다.');
        $normalizer->filterMutableFields([], ['bo_use_secret' => 0], 2);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Post\Service\PostAccessPolicy;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class PostAccessPolicyTest extends TestCase
{
    public function testRequireMemberIdReturnsTrimmedValueAndRejectsMissingId(): void
    {
        $policy = new PostAccessPolicy();

        $this->assertSame('user1', $policy->requireMemberId(['mb_id' => ' user1 ']));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 토큰이 필요합니다.');

        $policy->requireMemberId([]);
    }

    public function testAssertSecretReadableAllowsNonSecretPostAdminAndAuthor(): void
    {
        $policy = new PostAccessPolicy();

        $policy->assertSecretReadable(
            ['wr_option' => '', 'mb_id' => 'writer'],
            ['mb_id' => 'reader', 'mb_level' => 2],
            ['bo_use_secret' => 1]
        );
        $policy->assertSecretReadable(
            ['wr_option' => 'secret', 'mb_id' => 'writer'],
            ['mb_id' => 'admin', 'mb_level' => 10],
            ['bo_use_secret' => 1]
        );
        $policy->assertSecretReadable(
            ['wr_option' => 'secret', 'mb_id' => 'writer'],
            ['mb_id' => 'writer', 'mb_level' => 2],
            ['bo_use_secret' => 1]
        );
        $policy->assertSecretReadable(
            ['wr_option' => 'secret', 'mb_id' => 'writer'],
            ['mb_id' => 'other', 'mb_level' => 2],
            ['bo_use_secret' => 0]
        );

        $this->addToAssertionCount(4);
    }

    public function testAssertSecretReadableRejectsUnauthorizedReader(): void
    {
        $policy = new PostAccessPolicy();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('비밀글은 작성자 또는 관리자만 열람할 수 있습니다.');

        $policy->assertSecretReadable(
            ['wr_option' => 'notice, secret', 'mb_id' => 'writer'],
            ['mb_id' => 'other', 'mb_level' => 2],
            ['bo_use_secret' => 1]
        );
    }

    public function testAssertWriteDelayHonorsDisabledAndExpiredCases(): void
    {
        $policy = new PostAccessPolicy();

        $policy->assertWriteDelay(null, 30);
        $policy->assertWriteDelay('', 30);
        $policy->assertWriteDelay(date('Y-m-d H:i:s', time() - 61), 60);

        $this->addToAssertionCount(3);
    }

    public function testAssertWriteDelayRejectsRecentWrite(): void
    {
        $policy = new PostAccessPolicy();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('연속 등록 제한 시간 내에는 다시 작성할 수 없습니다.');

        $policy->assertWriteDelay(date('Y-m-d H:i:s', time() - 10), 60);
    }
}

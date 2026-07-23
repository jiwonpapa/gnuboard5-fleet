<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service\Support;

use Api\Admin\Mail\Repository\AdminMailRepository;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminMailDispatchPayloadResolver
{
    /** @var list<string> */
    private const SEND_FIELDS = [
        'ma_id', 'subject', 'content', 'target_type', 'level_min', 'level_max', 'gr_id',
        'member_id_from', 'member_id_to', 'email_contains', 'mb_ids', 'mailling_only', 'dry_run',
    ];

    /** @var list<string> */
    private const TEST_FIELDS = ['ma_id', 'to', 'subject', 'content'];

    public function __construct(private readonly AdminMailRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $payload
     * @return array{ma_id:int|null,subject:string,content:string}
     */
    public function resolveMailPayload(array $payload): array
    {
        $mailId = array_key_exists('ma_id', $payload) ? (int)$payload['ma_id'] : 0;
        $subject = trim((string)($payload['subject'] ?? ''));
        $content = trim((string)($payload['content'] ?? ''));

        if ($mailId > 0) {
            $mail = $this->repository->findTemplate($mailId);
            if ($mail === null) {
                throw ApiException::notFound('메일 템플릿을 찾을 수 없습니다.');
            }

            if ($subject === '') {
                $subject = trim((string)($mail['ma_subject'] ?? ''));
            }
            if ($content === '') {
                $content = trim((string)($mail['ma_content'] ?? ''));
            }
        } else {
            $mailId = null;
        }

        if ($subject === '' || $content === '') {
            throw ApiException::badRequest('subject/content 또는 ma_id는 필수입니다.');
        }

        return [
            'ma_id' => $mailId,
            'subject' => $subject,
            'content' => $content,
        ];
    }

    /** @param array<string, mixed> $payload */
    public function assertSendPayload(array $payload): void
    {
        $this->assertAllowedFields($payload, self::SEND_FIELDS, '메일 발송 요청');
    }

    /** @param array<string, mixed> $payload */
    public function assertTestPayload(array $payload): void
    {
        $this->assertAllowedFields($payload, self::TEST_FIELDS, '테스트 메일 요청');
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<string>
     */
    public function normalizeMemberIds(array $payload, string $targetType): array
    {
        $memberIds = [];
        if ($targetType !== 'member') {
            return $memberIds;
        }

        $rawMemberIds = is_array($payload['mb_ids'] ?? null) ? $payload['mb_ids'] : [];
        foreach ($rawMemberIds as $rawMemberId) {
            $memberId = trim((string)$rawMemberId);
            if ($memberId === '') {
                continue;
            }
            if (preg_match(ValidationPatterns::MEMBER_ID, $memberId) !== 1) {
                throw ApiException::badRequest('mb_ids에 유효하지 않은 회원 아이디가 포함되어 있습니다.');
            }
            $memberIds[] = $memberId;
        }

        $memberIds = array_values(array_unique($memberIds));
        if ($memberIds === []) {
            throw ApiException::badRequest('target_type=member 일 때 mb_ids는 필수입니다.');
        }

        return $memberIds;
    }

    public function personalize(string $content, string $memberId, string $name, string $nick, string $email): string
    {
        $replaced = str_replace('{이름}', $name, $content);
        $replaced = str_replace('{닉네임}', $nick, $replaced);
        $replaced = str_replace('{회원아이디}', $memberId, $replaced);
        $replaced = str_replace('{이메일}', $email, $replaced);

        return $replaced;
    }

    public function buildLastOption(
        ?int $levelMin,
        ?int $levelMax,
        ?string $groupId,
        ?string $memberIdFrom,
        ?string $memberIdTo,
        ?string $emailContains,
        bool $maillingOnly
    ): string {
        $mbIdMode = (trim((string)$memberIdFrom) !== '' || trim((string)$memberIdTo) !== '') ? '0' : '1';

        $parts = [
            'mb_id1=' . $mbIdMode,
            'mb_id1_from=' . trim((string)$memberIdFrom),
            'mb_id1_to=' . trim((string)$memberIdTo),
            'mb_email=' . trim((string)$emailContains),
            'mb_mailling=' . ($maillingOnly ? '1' : ''),
            'mb_level_from=' . (string)($levelMin ?? 1),
            'mb_level_to=' . (string)($levelMax ?? 10),
            'gr_id=' . trim((string)$groupId),
        ];

        return implode('||', $parts);
    }

    public function toBool(mixed $value, bool $default): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) > 0;
        }

        $normalized = strtolower(trim((string)$value));
        if ($normalized === '') {
            return $default;
        }
        if (in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true)) {
            return false;
        }

        return $default;
    }

    /** @param array<string, mixed> $payload @param list<string> $allowed */
    private function assertAllowedFields(array $payload, array $allowed, string $context): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest($context . '에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
    }
}

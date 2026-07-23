<?php

declare(strict_types=1);

namespace Api\Admin\System\Service\Support;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminSystemMailDispatchPayloadResolver
{
    public function __construct(
        private readonly AdminSystemRepository $repository,
        private readonly ?AdminSystemMailDispatchConfig $config = null
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{to:string,subject:string,content:string}
     */
    public function resolveTestPayload(array $payload): array
    {
        if (array_diff(array_keys($payload), ['to', 'subject', 'content']) !== []) {
            throw ApiException::badRequest('지원하지 않는 테스트 메일 요청 필드가 포함되어 있습니다.');
        }

        $to = trim((string)($payload['to'] ?? ''));
        $subject = trim((string)($payload['subject'] ?? ''));
        $content = trim((string)($payload['content'] ?? ''));

        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            throw ApiException::badRequest('to 이메일 형식이 올바르지 않습니다.');
        }
        if ($subject === '' || $content === '') {
            throw ApiException::badRequest('subject/content는 필수입니다.');
        }

        return [
            'to' => $to,
            'subject' => $subject,
            'content' => $content,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ma_id:int|null,subject:string,content:string,member_ids:list<string>,mailling_only:bool,dry_run:bool}
     */
    public function resolveMemberPayload(array $payload): array
    {
        if (array_diff(array_keys($payload), [
            'ma_id',
            'subject',
            'content',
            'mb_ids',
            'mailling_only',
            'dry_run',
        ]) !== []) {
            throw ApiException::badRequest('지원하지 않는 회원 메일 요청 필드가 포함되어 있습니다.');
        }

        $mailId = isset($payload['ma_id']) ? (int)$payload['ma_id'] : 0;
        $subject = trim((string)($payload['subject'] ?? ''));
        $content = trim((string)($payload['content'] ?? ''));
        if ($mailId > 0) {
            $template = $this->repository->findMailTemplate($mailId);
            if ($template === null) {
                throw ApiException::notFound('메일 템플릿을 찾을 수 없습니다.');
            }

            if ($subject === '') {
                $subject = trim((string)($template['ma_subject'] ?? ''));
            }
            if ($content === '') {
                $content = trim((string)($template['ma_content'] ?? ''));
            }
        } else {
            $mailId = null;
        }

        if ($subject === '' || $content === '') {
            throw ApiException::badRequest('subject/content는 필수입니다.');
        }

        $memberIds = is_array($payload['mb_ids'] ?? null) ? $payload['mb_ids'] : [];
        $normalizedIds = [];
        foreach ($memberIds as $value) {
            $memberId = trim((string)$value);
            if ($memberId === '') {
                continue;
            }
            if (preg_match(ValidationPatterns::MEMBER_ID, $memberId) !== 1) {
                throw ApiException::badRequest('mb_ids에 유효하지 않은 mb_id가 포함되어 있습니다.');
            }
            $normalizedIds[] = $memberId;
        }

        $normalizedIds = array_values(array_unique($normalizedIds));
        if ($normalizedIds === []) {
            throw ApiException::badRequest('mb_ids는 1건 이상 필요합니다.');
        }

        return [
            'ma_id' => $mailId,
            'subject' => $subject,
            'content' => $content,
            'member_ids' => $normalizedIds,
            'mailling_only' => $this->toBool($payload['mailling_only'] ?? true, true),
            'dry_run' => $this->toBool($payload['dry_run'] ?? false, false),
        ];
    }

    public function personalize(string $content, string $memberId, string $name, string $nick, string $email): string
    {
        $replaced = str_replace('{이름}', $name, $content);
        $replaced = str_replace('{닉네임}', $nick, $replaced);
        $replaced = str_replace('{회원아이디}', $memberId, $replaced);
        $replaced = str_replace('{이메일}', $email, $replaced);

        $unsubscribeBase = $this->config()->unsubscribeBaseUrl();
        if ($unsubscribeBase !== '') {
            $separator = str_contains($unsubscribeBase, '?') ? '&' : '?';
            $unsubscribe = $unsubscribeBase . $separator . http_build_query(['mb_id' => $memberId, 'mb_email' => $email]);
            $replaced .= "\n\n수신거부: " . $unsubscribe;
        }

        return $replaced;
    }

    private function toBool(mixed $value, bool $default): bool
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

    private function config(): AdminSystemMailDispatchConfig
    {
        return $this->config ?? new AdminSystemMailDispatchConfig();
    }
}

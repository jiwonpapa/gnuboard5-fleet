<?php

/**
 * 게시글 권한/입력 검증을 담당하는 서비스.
 *
 * @package  Gnuboard5\Api\v1\Post\Service
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Post\Service;

final class PostPermissionService
{
    public function __construct(
        private readonly PostFilterNormalizer $filterNormalizer,
        private readonly PostPayloadNormalizer $payloadNormalizer,
        private readonly PostAccessPolicy $accessPolicy
    ) {
    }

    public function normalizeWrId(int $wrId): int
    {
        return $wrId > 0
            ? $wrId
            : throw \Api\Support\Exception\ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
    }

    public function requireMemberId(array $member): string
    {
        return $this->accessPolicy()->requireMemberId($member);
    }

    public function normalizeGroupId(mixed $value): ?string
    {
        return $this->filters()->normalizeGroupId($value);
    }

    public function normalizeViewFilter(mixed $value): ?string
    {
        return $this->filters()->normalizeViewFilter($value);
    }

    public function normalizeMemberIdFilter(mixed $value): ?string
    {
        return $this->filters()->normalizeMemberIdFilter($value);
    }

    public function normalizeSearchField(mixed $value): ?string
    {
        return $this->filters()->normalizeSearchField($value);
    }

    /**
     * @param array<int|string, mixed> $bnIds
     * @return array<int, int>
     */
    public function sanitizeBnIds(array $bnIds): array
    {
        return $this->filters()->sanitizeBnIds($bnIds);
    }

    /**
     * @return array{subject:string,content:string,category:?string,option:?string,link1:?string,link2:?string,is_notice:bool}
     */
    public function normalizeCreatePayload(array $payload, array $board, int $memberLevel): array
    {
        return $this->payloads()->normalizeCreatePayload($payload, $board, $memberLevel);
    }

    /**
     * @return array{subject:string,content:string,option:?string}
     */
    public function normalizeReplyPayload(array $payload, array $board, int $memberLevel): array
    {
        return $this->payloads()->normalizeReplyPayload($payload, $board, $memberLevel);
    }

    public function filterMutableFields(array $payload, array $board, int $memberLevel): array
    {
        return $this->payloads()->filterMutableFields($payload, $board, $memberLevel);
    }

    public function assertSecretReadable(array $post, array $member, array $board): void
    {
        $this->accessPolicy()->assertSecretReadable($post, $member, $board);
    }

    public function sanitizeLegacyKeyword(?string $value): ?string
    {
        return $this->filters()->sanitizeLegacyKeyword($value);
    }

    public function assertWriteDelay(?string $lastWriteAt, int $delaySeconds): void
    {
        $this->accessPolicy()->assertWriteDelay($lastWriteAt, $delaySeconds);
    }

    public function normalizeRedirectUrl(string $url): string
    {
        return $this->filters()->normalizeRedirectUrl($url);
    }

    public function resolveBool(mixed $value): bool
    {
        return $this->payloads()->resolveBool($value);
    }

    private function filters(): PostFilterNormalizer
    {
        return $this->filterNormalizer;
    }

    private function payloads(): PostPayloadNormalizer
    {
        return $this->payloadNormalizer;
    }

    private function accessPolicy(): PostAccessPolicy
    {
        return $this->accessPolicy;
    }
}

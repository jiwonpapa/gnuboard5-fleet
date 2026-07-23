<?php

/**
 * QaReadService API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Qa\Contracts\QaGateway;
use Api\Support\Exception\ApiException;

final class QaReadService
{
    public function __construct(
        private readonly QaGateway $qaGateway,
        private readonly QaInputService $inputService
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function list(array $member, array $query): array
    {
        $memberId = $this->inputService->requireMemberId($member);
        $isAdmin = $this->inputService->isAdmin($member);
        $config = $this->qaGateway->getQaConfig();

        $defaultPerPage = max(1, (int)($config['qa_page_rows'] ?? 15));
        $page = $this->inputService->normalizePositiveInt($query['page'] ?? 1, 'page', 1);
        $perPage = $this->inputService->normalizePositiveInt($query['per_page'] ?? $defaultPerPage, 'per_page', $defaultPerPage);
        $perPage = min(100, $perPage);

        $category = $this->inputService->normalizeNullableKeyword($query['category'] ?? $query['sca'] ?? null);
        $searchField = $this->inputService->normalizeNullableKeyword($query['search_field'] ?? $query['sfl'] ?? null);
        $searchText = $this->inputService->normalizeNullableKeyword($query['search'] ?? $query['stx'] ?? null);

        $result = $this->qaGateway->getList(
            $memberId,
            $isAdmin,
            $page,
            $perPage,
            $category,
            $searchField,
            $searchText
        );

        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / max(1, $perPage));

        return [
            'items' => is_array($result['items'] ?? null) ? $result['items'] : [],
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'has_next' => $page < $lastPage,
                'has_prev' => $page > 1,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function detail(array $member, int $qaId): array
    {
        $safeQaId = $this->inputService->normalizePositiveInt($qaId, 'qa_id', 1);
        $memberId = $this->inputService->requireMemberId($member);
        $isAdmin = $this->inputService->isAdmin($member);

        $qa = $this->qaGateway->getById($safeQaId, $memberId, $isAdmin);
        if (!is_array($qa)) {
            throw ApiException::notFound('문의글을 찾을 수 없습니다.');
        }

        $relatedQuestions = $this->qaGateway->getRelatedQuestions(
            (int)($qa['qa_related'] ?? 0),
            (int)($qa['qa_id'] ?? 0),
            10
        );

        $qa['related_questions'] = $relatedQuestions;
        $qa['is_owner'] = $memberId !== '' && $memberId === trim((string)($qa['mb_id'] ?? ''));

        return $qa;
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function getDownloadPayload(int $qaId, int $fileNo, array $member): array
    {
        $safeQaId = $this->inputService->normalizePositiveInt($qaId, 'qa_id', 1);
        if (!in_array($fileNo, [1, 2], true)) {
            throw ApiException::badRequest('file no는 1 또는 2만 허용됩니다.');
        }

        $memberId = $this->inputService->requireMemberId($member);
        $file = $this->qaGateway->getFileForDownload($safeQaId, $fileNo, $memberId, $this->inputService->isAdmin($member));
        if (!is_array($file)) {
            throw ApiException::notFound('다운로드 가능한 파일이 없습니다.');
        }

        $path = (string)($file['path'] ?? '');
        if ($path === '' || !is_file($path) || !is_readable($path)) {
            throw ApiException::notFound('파일이 존재하지 않습니다.');
        }

        $size = filesize($path);
        if ($size === false) {
            $size = 0;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path);

        $file['path'] = $path;
        $file['size'] = (int)$size;
        $file['mime'] = is_string($mime) ? $mime : 'application/octet-stream';

        return $file;
    }
}

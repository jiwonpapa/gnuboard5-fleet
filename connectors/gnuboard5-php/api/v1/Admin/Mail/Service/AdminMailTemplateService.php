<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service;

use Api\Admin\Mail\Repository\AdminMailRepository;
use Api\Admin\Mail\Service\Support\AdminMailPresenter;
use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminMailTemplateService
{
    /** @var list<string> */
    private const TEMPLATE_FIELDS = ['ma_subject', 'ma_content', 'subject', 'content'];

    public function __construct(private readonly AdminMailRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createAdmin(array $member, array $payload, string $ipAddress): array
    {
        $this->assertSuperAdmin($member);
        [$subject, $content] = $this->normalizeTemplatePayload($payload);

        $mailId = $this->repository->createTemplate($subject, $content, $ipAddress);

        return $this->detailAdmin($member, $mailId);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateAdmin(array $member, int $mailId, array $payload, string $ipAddress): array
    {
        $this->assertSuperAdmin($member);
        $id = $this->normalizePositiveInt($mailId, 'ma_id');
        if ($this->repository->findTemplate($id) === null) {
            throw ApiException::notFound('메일 템플릿을 찾을 수 없습니다.');
        }

        [$subject, $content] = $this->normalizeTemplatePayload($payload);
        $this->repository->updateTemplate($id, $subject, $content, $ipAddress);

        return $this->detailAdmin($member, $id);
    }

    /**
     * @param array<string,mixed> $member
     * @return array<string,mixed>
     */
    public function detailAdmin(array $member, int $mailId): array
    {
        $this->assertSuperAdmin($member);
        $id = $this->normalizePositiveInt($mailId, 'ma_id');
        $mail = $this->repository->findTemplate($id);
        if ($mail === null) {
            throw ApiException::notFound('메일 템플릿을 찾을 수 없습니다.');
        }

        $mail['last_option'] = $this->parseLastOption(trim((string)($mail['ma_last_option'] ?? '')));
        $mail['preview_html'] = $this->buildPreviewHtml(
            trim((string)($mail['ma_subject'] ?? '')),
            trim((string)($mail['ma_content'] ?? ''))
        );

        return AdminMailPresenter::detail($mail);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array{0:string,1:string}
     */
    private function normalizeTemplatePayload(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), self::TEMPLATE_FIELDS));
        if ($unknown !== []) {
            throw ApiException::badRequest('메일 템플릿 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }

        $subject = trim((string)($payload['ma_subject'] ?? $payload['subject'] ?? ''));
        $content = trim((string)($payload['ma_content'] ?? $payload['content'] ?? ''));

        if ($subject === '') {
            throw ApiException::badRequest('ma_subject는 필수입니다.');
        }
        if ($content === '') {
            throw ApiException::badRequest('ma_content는 필수입니다.');
        }

        return [$subject, $content];
    }

    /**
     * @return array{mb_id1:int,mb_id1_from:string,mb_id1_to:string,mb_email:string,mb_mailling:int,mb_level_from:int,mb_level_to:int,gr_id:string}
     */
    private function parseLastOption(string $raw): array
    {
        $parsed = [
            'mb_id1' => 1,
            'mb_id1_from' => '',
            'mb_id1_to' => '',
            'mb_email' => '',
            'mb_mailling' => 1,
            'mb_level_from' => 1,
            'mb_level_to' => 10,
            'gr_id' => '',
        ];

        if ($raw === '') {
            return $parsed;
        }

        foreach (explode('||', $raw) as $item) {
            if ($item === '' || !str_contains($item, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $item, 2);
            switch ($key) {
                case 'mb_id1':
                case 'mb_mailling':
                case 'mb_level_from':
                case 'mb_level_to':
                    $parsed[$key] = (int)$value;
                    break;
                case 'mb_id1_from':
                case 'mb_id1_to':
                case 'mb_email':
                case 'gr_id':
                    $parsed[$key] = $value;
                    break;
            }
        }

        return $parsed;
    }

    private function buildPreviewHtml(string $subject, string $content): string
    {
        $footer = "<hr size=0><p><span style='font-size:9pt; font-family:굴림'>▶ 더 이상 정보 수신을 원치 않으시면 [<a href='/bbs/email_stop.php?mb_id=***&amp;mb_md5=***' target='_blank'>수신거부</a>] 해 주십시오.</span></p>";

        return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'
            . htmlspecialchars($subject, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            . '</title></head><body><h1>'
            . htmlspecialchars($subject, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            . '</h1><div>'
            . $content
            . $footer
            . "</div><p><strong>주의!</strong> 이 화면에 보여지는 디자인은 실제 내용이 발송되었을 때 디자인과 다를 수 있습니다.</p></body></html>";
    }

    /**
     * @param array<string,mixed> $member
     */
    private function assertSuperAdmin(array $member): void
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('최고관리자만 접근할 수 있습니다.');
        }
    }

    private function normalizePositiveInt(int $value, string $field): int
    {
        if ($value <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $value;
    }
}

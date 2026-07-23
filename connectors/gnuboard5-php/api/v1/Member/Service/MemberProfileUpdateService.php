<?php

/**
 * MemberProfileUpdateService API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Service;

use Api\Core\Config\EnvConfig;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\AuthRecoveryGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Support\Exception\ApiException;
use Psr\Log\LoggerInterface;
use Throwable;

final class MemberProfileUpdateService
{
    public function __construct(
        private readonly MemberGateway $memberRepository,
        private readonly AuthRecoveryGateway $authGateway,
        private readonly LoggerInterface $logger,
        private readonly EnvConfig $envConfig,
        private readonly MemberProfilePresenter $profilePresenter,
        private readonly MemberProfileFieldNormalizer $fieldNormalizer,
        private readonly EventDispatcher $events
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateMyProfile(array $member, array $payload): array
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        if ($payload === []) {
            throw ApiException::badRequest('수정할 데이터가 없습니다.');
        }

        $memberRow = $this->memberRepository->findById($memberId);
        if ($memberRow === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        $currentPassword = trim((string)($payload['mb_password_current'] ?? ''));
        unset($payload['mb_password_current']);
        if ($payload === []) {
            throw ApiException::badRequest('수정할 대상 데이터가 없습니다.');
        }

        if ($currentPassword === '') {
            throw ApiException::badRequest('회원정보 수정을 위해 mb_password_current 값이 필요합니다.');
        }
        if (!$this->memberRepository->verifyPassword($memberRow, $currentPassword)) {
            throw ApiException::unauthorized('현재 비밀번호가 일치하지 않습니다.');
        }

        $this->fieldNormalizer->validatePayloadKeys($payload);
        $updates = $this->fieldNormalizer->normalizeUpdates($payload, $memberId);
        if ($updates === []) {
            throw ApiException::badRequest('수정할 대상 데이터가 없습니다.');
        }

        $this->memberRepository->update($memberId, $updates);
        if (array_key_exists('mb_email', $updates)) {
            $this->issueEmailVerificationForChangedEmail($memberId, (string)$updates['mb_email']);
        }

        $updatedMemberRow = $this->memberRepository->findById($memberId);
        if ($updatedMemberRow === null) {
            throw ApiException::serverError('회원 조회에 실패했습니다.');
        }

        $this->events->dispatch('member.updated', [
            'member_id' => $memberId,
            'changed_fields' => array_keys($updates),
            'member_data' => $updatedMemberRow,
        ]);

        return $this->profilePresenter->toUpdatedProfile($updatedMemberRow);
    }

    private function issueEmailVerificationForChangedEmail(string $memberId, string $email): void
    {
        $normalizedEmail = $this->sanitizeSingleLine($email);
        if ($normalizedEmail === '') {
            return;
        }

        try {
            $token = $this->authGateway->issueEmailVerifyToken($memberId);
            $this->sendEmailVerifyEmail($normalizedEmail, $memberId, $token);
        } catch (Throwable $exception) {
            $this->logger->warning('[member] email verify issue skipped', [
                'mb_id' => $memberId,
                'reason' => $exception->getMessage(),
            ]);
        }
    }

    private function sendEmailVerifyEmail(string $email, string $memberId, string $token): void
    {
        $baseUrl = $this->envConfig->emailVerifyUrl;
        $detail = $token;
        if ($baseUrl !== '') {
            $separator = str_contains($baseUrl, '?') ? '&' : '?';
            $detail = $baseUrl . $separator . http_build_query(['mb_id' => $memberId, 'verify_token' => $token]);
        }

        $subject = '이메일 인증 안내';
        $body = "회원 아이디: {$memberId}\n이메일 인증 토큰/링크: {$detail}\n";
        $this->sendAuthMail($email, $subject, $body);
    }

    private function sendAuthMail(string $to, string $subject, string $body): void
    {
        if (!$this->envConfig->authMailSendEnabled) {
            return;
        }

        $normalizedTo = trim($to);
        if ($normalizedTo === '' || !filter_var($normalizedTo, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $prefix = $this->envConfig->authMailSubjectPrefix;
        $from = $this->envConfig->authMailFrom;
        $fullSubject = trim($prefix . ' ' . $subject);
        $headers = [];
        if ($from !== '') {
            $headers[] = 'From: ' . $from;
            $headers[] = 'Reply-To: ' . $from;
        }
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';

        $sent = @mail($normalizedTo, $fullSubject, $body, implode("\r\n", $headers));
        if (!$sent) {
            $this->logger->warning('[member] mail send failed', [
                'to' => $normalizedTo,
                'subject' => $subject,
            ]);
        }
    }

    private function sanitizeSingleLine(string $value): string
    {
        $normalized = str_replace("\0", '', $value);
        $normalized = strip_tags($normalized);

        return trim($normalized);
    }
}

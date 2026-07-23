<?php

/**
 * AuthMailService API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Core\Config\EnvConfig;
use Psr\Log\LoggerInterface;

final class AuthMailService
{
    public function __construct(
        private readonly EnvConfig $envConfig,
        private readonly LoggerInterface $logger
    ) {
    }

    public function sendPasswordResetEmail(string $email, string $memberId, string $token): void
    {
        $baseUrl = $this->envConfig->passwordResetUrl;
        $detail = $token;
        if ($baseUrl !== '') {
            $separator = str_contains($baseUrl, '?') ? '&' : '?';
            $detail = $baseUrl . $separator . http_build_query(['mb_id' => $memberId, 'reset_token' => $token]);
        }

        $subject = '비밀번호 재설정 안내';
        $body = "회원 아이디: {$memberId}\n비밀번호 재설정 토큰/링크: {$detail}\n";
        $this->sendAuthMail($email, $subject, $body);
    }

    public function sendEmailVerifyEmail(string $email, string $memberId, string $token): void
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

    public function sendAdminRegisterNotice(string $memberId, string $email, string $name): void
    {
        $adminTo = $this->envConfig->authRegisterNotifyAdminEmail;
        if ($adminTo === '') {
            return;
        }

        $subject = '신규 회원 가입 알림';
        $body = "회원 아이디: {$memberId}\n이름: {$name}\n이메일: {$email}\n";
        $this->sendAuthMail($adminTo, $subject, $body);
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
            $this->logger->warning('[auth] mail send failed', [
                'to' => $normalizedTo,
                'subject' => $subject,
            ]);
        }
    }
}

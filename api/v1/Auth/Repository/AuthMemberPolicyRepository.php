<?php

declare(strict_types=1);

namespace Api\Auth\Repository;

final class AuthMemberPolicyRepository extends AuthRepositorySupport
{
    public function isRecommendationEnabled(): bool
    {
        $config = $this->loadConfig();

        return (int)($config['cf_use_recommend'] ?? 0) === 1;
    }

    public function verifyPassword(array $member, string $password): bool
    {
        $hash = (string)($member['mb_password'] ?? '');
        if ($hash === '') {
            return false;
        }

        return $this->password()->verify($password, $hash);
    }

    public function isEmailCertificationRequiredAndMissing(array $member): bool
    {
        $config = $this->loadConfig();
        if ((int)($config['cf_use_email_certify'] ?? 0) !== 1) {
            return false;
        }

        $certifiedAt = trim((string)($member['mb_email_certify'] ?? ''));
        if ($certifiedAt === '') {
            return true;
        }

        return str_starts_with($certifiedAt, '0000-00-00');
    }

    public function rehashPasswordIfNeeded(array $member, string $plainPassword): void
    {
        if (!$this->envConfig()->authAutoRehashOnLogin) {
            return;
        }

        $memberId = trim((string)($member['mb_id'] ?? ''));
        $hash = (string)($member['mb_password'] ?? '');
        if ($memberId === '' || $hash === '' || $plainPassword === '') {
            return;
        }

        if (!$this->password()->needsRehash($hash)) {
            return;
        }

        $memberTable = $this->tables()->get('member');
        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_password = :mb_password
             WHERE mb_id = :mb_id",
            [
                'mb_password' => $this->hashPassword($plainPassword),
                'mb_id' => $memberId,
            ]
        );
    }

    public function hashPassword(string $plainPassword): string
    {
        return $this->password()->hash($plainPassword);
    }

    public function isReservedNick(string $nick): bool
    {
        $blocked = $this->mergedProhibitNickWords();
        if ($blocked === []) {
            return false;
        }

        $normalizedNick = mb_strtolower($nick, 'UTF-8');
        foreach ($blocked as $blockedWord) {
            if ($normalizedNick === mb_strtolower($blockedWord, 'UTF-8')) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    public function mergedProhibitMemberIds(): array
    {
        $config = $this->loadConfig();
        $dbWords = $this->splitList(trim((string)($config['cf_prohibit_id'] ?? '')));
        $envWords = $this->envConfig()->prohibitMemberIdList();

        return $this->mergeUniqueLower(array_merge($dbWords, $envWords));
    }

    /**
     * @return list<string>
     */
    public function mergedProhibitEmailDomains(): array
    {
        $config = $this->loadConfig();
        $dbDomains = $this->splitList(trim((string)($config['cf_prohibit_email'] ?? '')));
        $envDomains = $this->envConfig()->prohibitEmailDomainList();

        return $this->mergeUniqueLower(array_merge($dbDomains, $envDomains));
    }

    /**
     * @return list<string>
     */
    private function mergedProhibitNickWords(): array
    {
        $config = $this->loadConfig();
        $dbWords = $this->splitList(trim((string)($config['cf_prohibit_id'] ?? '')));
        $envNickWords = $this->envConfig()->prohibitMemberNickList();
        $envMemberIds = $this->envConfig()->prohibitMemberIdList();

        return $this->mergeUniqueLower(array_merge($dbWords, $envNickWords, $envMemberIds));
    }

    /**
     * @param list<string> $words
     * @return list<string>
     */
    private function mergeUniqueLower(array $words): array
    {
        $unique = [];
        foreach ($words as $word) {
            $normalized = mb_strtolower(trim($word), 'UTF-8');
            if ($normalized === '') {
                continue;
            }

            $unique[$normalized] = true;
        }

        return array_keys($unique);
    }

    /**
     * @return list<string>
     */
    private function splitList(string $raw): array
    {
        $tokens = preg_split('/[\r\n,|]+/', $raw);
        if (!is_array($tokens)) {
            return [];
        }

        $items = [];
        foreach ($tokens as $token) {
            $item = trim($token);
            if ($item === '') {
                continue;
            }

            $items[] = $item;
        }

        return $items;
    }
}

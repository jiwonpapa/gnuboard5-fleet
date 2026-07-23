<?php

declare(strict_types=1);

namespace Api\Auth\External\Service;

use Api\Auth\External\Repository\ExternalAuthLinkRepository;
use Api\Auth\Contracts\AuthIdentityGateway;

final readonly class ExternalAuthLinkageService
{
    public function __construct(
        private ExternalAuthLinkRepository $linkRepository,
        private AuthIdentityGateway $authGateway
    ) {
    }

    /**
     * @param array<string, mixed>|null $providerUser
     * @return array{
     *     status:string,
     *     reason:string,
     *     linked_member:?array<string,mixed>,
     *     candidate_member:?array<string,mixed>
     * }
     */
    public function resolve(string $provider, ?array $providerUser): array
    {
        $providerUserId = trim((string)($providerUser['provider_user_id'] ?? ''));
        $email = strtolower(trim((string)($providerUser['email'] ?? '')));

        if ($providerUserId !== '') {
            $existingLink = $this->linkRepository->findByProviderUser($provider, $providerUserId);
            if (is_array($existingLink)) {
                $member = $this->summarizeMember(
                    $this->authGateway->findMemberById((string)($existingLink['mb_id'] ?? ''))
                );

                return [
                    'status' => 'linked',
                    'reason' => 'provider_user_id_match',
                    'linked_member' => $member,
                    'candidate_member' => null,
                ];
            }
        }

        if ($email !== '') {
            $candidateCount = $this->authGateway->countMembersByEmail($email);
            if ($candidateCount === 1) {
                return [
                    'status' => 'candidate',
                    'reason' => 'single_email_match',
                    'linked_member' => null,
                    'candidate_member' => $this->summarizeMember($this->authGateway->findMemberByEmail($email)),
                ];
            }

            if ($candidateCount > 1) {
                return [
                    'status' => 'ambiguous',
                    'reason' => 'multiple_email_matches',
                    'linked_member' => null,
                    'candidate_member' => null,
                ];
            }
        }

        if ($providerUserId === '' && $email === '') {
            return [
                'status' => 'unresolvable',
                'reason' => 'provider_identity_missing',
                'linked_member' => null,
                'candidate_member' => null,
            ];
        }

        return [
            'status' => 'signup_required',
            'reason' => $email !== '' ? 'email_not_found' : 'provider_user_not_linked',
            'linked_member' => null,
            'candidate_member' => null,
        ];
    }

    /**
     * @param array<string, mixed>|null $member
     * @return array<string, mixed>|null
     */
    private function summarizeMember(?array $member): ?array
    {
        if (!is_array($member)) {
            return null;
        }

        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            return null;
        }

        return [
            'mb_id' => $memberId,
            'mb_email' => (string)($member['mb_email'] ?? ''),
            'mb_name' => (string)($member['mb_name'] ?? ''),
            'mb_nick' => (string)($member['mb_nick'] ?? ''),
            'mb_level' => (int)($member['mb_level'] ?? 1),
            'active' => $this->authGateway->isMemberActive($memberId),
        ];
    }
}

<?php

/**
 * MemberGatewayProxy API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin\Gateway
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin\Gateway;

use Api\Core\Plugin\PluginScopeViolationException;
use Api\Integration\Contracts\MemberGateway;

final class MemberGatewayProxy implements MemberGateway
{
    public function __construct(
        private readonly MemberGateway $gateway,
        private readonly string $pluginId,
        private readonly bool $canWrite
    ) {
    }

    public function findById(string $memberId): ?array
    {
        return $this->gateway->findById($memberId);
    }

    public function getMemberImageConfig(): array
    {
        return $this->gateway->getMemberImageConfig();
    }

    public function update(string $memberId, array $updates): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->update($memberId, $updates);
    }

    public function withdraw(string $memberId, string $leaveDate, string $memo): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->withdraw($memberId, $leaveDate, $memo);
    }

    public function existsNick(string $nickname, string $memberId): bool
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->existsNick($nickname, $memberId);
    }

    public function existsEmail(string $email, string $memberId): bool
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->existsEmail($email, $memberId);
    }

    public function verifyPassword(array $member, string $password): bool
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->verifyPassword($member, $password);
    }

    public function validatePassword(string $password): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->validatePassword($password);
    }

    public function hashPassword(string $password): string
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->hashPassword($password);
    }

    public function validateNicknameForUpdate(string $nickname, string $memberId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->validateNicknameForUpdate($nickname, $memberId);
    }

    public function validateEmailForUpdate(string $email, string $memberId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->validateEmailForUpdate($email, $memberId);
    }

    public function validatePhoneForUpdate(string $phone, string $memberId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->validatePhoneForUpdate($phone, $memberId);
    }

    private function assertCanWrite(string $method): void
    {
        if ($this->canWrite) {
            return;
        }

        throw PluginScopeViolationException::forMethod(
            $this->pluginId,
            MemberGateway::class,
            $method,
            'member.write'
        );
    }
}

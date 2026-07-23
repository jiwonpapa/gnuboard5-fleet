<?php

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Auth\Support\AuthTimedTokenCodec;

trait AuthRepositoryTimedTokenSupport
{
    protected function encodeTimedToken(string $token, int $expiresAt): string
    {
        return $this->timedTokenCodec()->encode($token, $expiresAt);
    }

    /**
     * @return array{token:string, expires_at:int}
     */
    protected function decodeTimedToken(string $stored): array
    {
        return $this->timedTokenCodec()->decode($stored);
    }

    private function timedTokenCodec(): AuthTimedTokenCodec
    {
        if ($this->resolvedTimedTokenCodec instanceof AuthTimedTokenCodec) {
            return $this->resolvedTimedTokenCodec;
        }

        $this->resolvedTimedTokenCodec = new AuthTimedTokenCodec();

        return $this->resolvedTimedTokenCodec;
    }
}

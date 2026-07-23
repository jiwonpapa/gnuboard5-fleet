<?php

declare(strict_types=1);

namespace Tests\Security;

use Api\Core\Security\PasswordPolicy;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class PasswordPolicyTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];

    protected function tearDown(): void
    {
        foreach ($this->envBackup as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
                putenv($key);
                continue;
            }

            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }
        $this->envBackup = [];

        parent::tearDown();
    }

    public function testStrongPasswordPasses(): void
    {
        $this->setEnv('PASSWORD_REQUIRE_COMPLEXITY', 'true');
        $this->setEnv('PASSWORD_MIN_LENGTH', '8');

        $policy = new PasswordPolicy();
        $policy->validateOrFail('Aq9!Lm2x');

        $this->assertTrue(true);
    }

    public function testWeakPasswordFailsWhenComplexityEnabled(): void
    {
        $this->setEnv('PASSWORD_REQUIRE_COMPLEXITY', 'true');

        $this->expectException(ApiException::class);
        (new PasswordPolicy())->validateOrFail('abcdefghi');
    }

    public function testWeakPasswordPassesWhenComplexityDisabled(): void
    {
        $this->setEnv('PASSWORD_REQUIRE_COMPLEXITY', 'false');

        (new PasswordPolicy())->validateOrFail('abcdefgh');
        $this->assertTrue(true);
    }

    public function testSequentialPatternFails(): void
    {
        $this->setEnv('PASSWORD_REQUIRE_COMPLEXITY', 'true');

        $this->expectException(ApiException::class);
        (new PasswordPolicy())->validateOrFail('Abcd!1234');
    }

    public function testRepeatedCharacterPatternFails(): void
    {
        $this->setEnv('PASSWORD_REQUIRE_COMPLEXITY', 'true');

        $this->expectException(ApiException::class);
        (new PasswordPolicy())->validateOrFail('AAAb!1234');
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }
}

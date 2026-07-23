<?php

declare(strict_types=1);

namespace Tests\Security;

use Api\Core\Security\PasswordCompat;
use PHPUnit\Framework\TestCase;

final class PasswordCompatTest extends TestCase
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

    public function testCreateHashModeMatchesG5PasswordCompatibility(): void
    {
        $this->setEnv('G5_ENCRYPT_FUNC', 'create_hash');
        require_once dirname(__DIR__, 2) . '/lib/pbkdf2.compat.php';

        $compat = new PasswordCompat();
        $g5Hash = create_hash('Abcd!2345');

        self::assertTrue($compat->verify('Abcd!2345', $g5Hash));
        self::assertFalse($compat->verify('Wrong!2345', $g5Hash));
        self::assertFalse($compat->needsRehash($g5Hash));

        $apiHash = $compat->hash('Abcd!2345');

        self::assertMatchesRegularExpression('/^[a-z0-9]+:\d+:[^:]+:[A-Za-z0-9+\/=]+$/', $apiHash);
        self::assertTrue(validate_password('Abcd!2345', $apiHash));
        self::assertTrue($compat->verify('Abcd!2345', $apiHash));
    }

    public function testCreateHashModeAcceptsLegacyMysqlHashesAndMarksForUpgrade(): void
    {
        $this->setEnv('G5_ENCRYPT_FUNC', 'create_hash');

        $compat = new PasswordCompat();
        $legacyHash = '*' . strtoupper(sha1(sha1('Abcd!2345', true)));

        self::assertTrue($compat->verify('Abcd!2345', $legacyHash));
        self::assertTrue($compat->needsRehash($legacyHash));
    }

    public function testCreateHashModeAcceptsPasswordHashAndMarksForUpgrade(): void
    {
        $this->setEnv('G5_ENCRYPT_FUNC', 'create_hash');

        $compat = new PasswordCompat();
        $passwordHash = password_hash('Abcd!2345', PASSWORD_DEFAULT);

        self::assertTrue($compat->verify('Abcd!2345', $passwordHash));
        self::assertTrue($compat->needsRehash($passwordHash));
    }

    public function testSqlPasswordModeUsesMysql41Hashing(): void
    {
        $this->setEnv('G5_ENCRYPT_FUNC', 'sql_password');

        $compat = new PasswordCompat();
        $hash = $compat->hash('Abcd!2345');

        self::assertSame('*CFBF47670BD8979A7DB4FD2AF48AC38790505E74', $hash);
        self::assertTrue($compat->verify('Abcd!2345', $hash));
        self::assertFalse($compat->needsRehash($hash));
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

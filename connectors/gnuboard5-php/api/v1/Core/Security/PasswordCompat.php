<?php

/**
 * PasswordCompat API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Security
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Security;

use Api\Core\Config\EnvConfig;

final class PasswordCompat
{
    private const PBKDF2_HASH_ALGORITHM = 'sha256';
    private const PBKDF2_ITERATIONS = 12000;
    private const PBKDF2_SALT_BYTES = 24;
    private const PBKDF2_HASH_BYTES = 24;

    public function __construct(
        private readonly ?EnvConfig $envConfig = null
    ) {
    }

    public function verify(string $plain, string $hash): bool
    {
        if ($plain === '' || $hash === '') {
            return false;
        }

        $func = $this->encryptFunc();

        if ($func === 'create_hash') {
            if ($this->verifyCreateHash($plain, $hash) || $this->verifyLegacyMysqlPassword($plain, $hash)) {
                return true;
            }

            if (password_verify($plain, $hash)) {
                return true;
            }
        } elseif (in_array($func, ['password_hash', 'bcrypt'], true)) {
            if (password_verify($plain, $hash)) {
                return true;
            }
        } elseif ($func === 'sql_password') {
            if ($this->verifyLegacyMysqlPassword($plain, $hash)) {
                return true;
            }
        } elseif (in_array($func, hash_algos(), true)) {
            if (hash($func, $plain) === $hash) {
                return true;
            }
        }

        if (md5($plain) === $hash) {
            return true;
        }

        return false;
    }

    public function hash(string $plain): string
    {
        $func = $this->encryptFunc();

        if ($func === 'create_hash') {
            return $this->createHash($plain);
        }

        if (in_array($func, ['password_hash', 'bcrypt'], true)) {
            return password_hash($plain, PASSWORD_DEFAULT);
        }

        if ($func === 'sql_password') {
            return $this->mysql41PasswordHash($plain);
        }

        if (in_array($func, hash_algos(), true)) {
            return hash($func, $plain);
        }

        return password_hash($plain, PASSWORD_DEFAULT);
    }

    public function needsRehash(string $hash): bool
    {
        if ($hash === '') {
            return false;
        }

        $func = $this->encryptFunc();

        if ($func === 'create_hash') {
            if ($this->isLegacyMysqlPasswordHash($hash) || preg_match('/^[a-f0-9]{32}$/i', $hash) === 1) {
                return true;
            }

            if ($this->isCreateHashFormat($hash)) {
                return $this->needsCreateHashUpgrade($hash);
            }

            return true;
        }

        if (in_array($func, ['password_hash', 'bcrypt'], true)) {
            $passwordInfo = password_get_info($hash);
            $isPasswordHash = isset($passwordInfo['algo']) && $passwordInfo['algo'] !== null && $passwordInfo['algo'] !== 0;

            return !$isPasswordHash || password_needs_rehash($hash, PASSWORD_DEFAULT);
        }

        return false;
    }

    private function encryptFunc(): string
    {
        $config = $this->envConfig ?? EnvConfig::fromEnv();

        return strtolower(trim($config->encryptFunc));
    }

    private function createHash(string $plain): string
    {
        $salt = base64_encode(random_bytes(self::PBKDF2_SALT_BYTES));
        $algo = self::PBKDF2_HASH_ALGORITHM;
        $iterations = self::PBKDF2_ITERATIONS;

        if (!function_exists('hash_algos') || !in_array($algo, hash_algos(), true)) {
            $algo = 'sha1';
            $iterations = (int)round($iterations / 5);
        }

        $pbkdf2 = $this->pbkdf2($algo, $plain, $salt, $iterations, self::PBKDF2_HASH_BYTES);

        return $algo . ':' . $iterations . ':' . $salt . ':' . base64_encode($pbkdf2);
    }

    private function verifyCreateHash(string $plain, string $hash): bool
    {
        $params = explode(':', $hash);
        if (count($params) < 4) {
            return false;
        }

        $algo = strtolower(trim((string)$params[0]));
        $iterations = (int)$params[1];
        $salt = (string)$params[2];
        $encodedHash = (string)$params[3];
        if ($algo === '' || $iterations <= 0 || $salt === '' || $encodedHash === '') {
            return false;
        }

        $pbkdf2 = base64_decode($encodedHash, true);
        if (!is_string($pbkdf2) || $pbkdf2 === '') {
            return false;
        }

        $computed = $this->pbkdf2($algo, $plain, $salt, $iterations, strlen($pbkdf2));

        return $this->slowEquals($pbkdf2, $computed);
    }

    private function needsCreateHashUpgrade(string $hash): bool
    {
        $params = explode(':', $hash);
        if (count($params) < 4) {
            return true;
        }

        $algo = strtolower(trim((string)$params[0]));
        $iterations = (int)$params[1];
        if ($algo === '' || $iterations <= 0) {
            return true;
        }

        if (!function_exists('hash_algos') || !in_array($algo, hash_algos(), true)) {
            return false;
        }

        return !($algo === self::PBKDF2_HASH_ALGORITHM && $iterations >= self::PBKDF2_ITERATIONS);
    }

    private function isCreateHashFormat(string $hash): bool
    {
        return count(explode(':', $hash)) >= 4;
    }

    private function verifyLegacyMysqlPassword(string $plain, string $hash): bool
    {
        $normalizedHash = strtoupper(trim($hash));
        if (strlen($normalizedHash) === 41) {
            return hash_equals($this->mysql41PasswordHash($plain), $normalizedHash);
        }

        if (strlen($normalizedHash) === 16) {
            return hash_equals($this->mysql323PasswordHash($plain), $normalizedHash);
        }

        return false;
    }

    private function isLegacyMysqlPasswordHash(string $hash): bool
    {
        $length = strlen(trim($hash));

        return $length === 41 || $length === 16;
    }

    private function mysql41PasswordHash(string $plain): string
    {
        return '*' . strtoupper(sha1(sha1($plain, true)));
    }

    private function mysql323PasswordHash(string $plain): string
    {
        $nr = 1345345333;
        $add = 7;
        $nr2 = 0x12345671;

        $length = strlen($plain);
        for ($index = 0; $index < $length; $index++) {
            $character = $plain[$index];
            if ($character === ' ' || $character === "\t") {
                continue;
            }

            $value = ord($character);
            $nr ^= ((($nr & 63) + $add) * $value) + ($nr << 8);
            $nr2 += ($nr2 << 8) ^ $nr;
            $add += $value;
        }

        $mask = (1 << 31) - 1;

        return sprintf('%08x%08x', $nr & $mask, $nr2 & $mask);
    }

    private function pbkdf2(string $algo, string $password, string $salt, int $count, int $keyLength): string
    {
        if ($count <= 0 || $keyLength <= 0) {
            throw new \InvalidArgumentException('PBKDF2 parameters must be positive.');
        }

        $normalizedAlgo = strtolower(trim($algo));
        if ($normalizedAlgo === '' || !function_exists('hash_algos') || !in_array($normalizedAlgo, hash_algos(), true)) {
            if ($normalizedAlgo !== 'sha1') {
                throw new \InvalidArgumentException('Unsupported hash algorithm: ' . $algo);
            }
        }

        if (function_exists('hash_pbkdf2')) {
            return hash_pbkdf2($normalizedAlgo, $password, $salt, $count, $keyLength, true);
        }

        $hashLength = strlen(hash($normalizedAlgo, '', true));
        $blockCount = (int)ceil($keyLength / $hashLength);
        $output = '';

        for ($block = 1; $block <= $blockCount; $block++) {
            $last = $salt . pack('N', $block);
            $xorSum = $last = hash_hmac($normalizedAlgo, $last, $password, true);

            for ($iteration = 1; $iteration < $count; $iteration++) {
                $last = hash_hmac($normalizedAlgo, $last, $password, true);
                $xorSum ^= $last;
            }

            $output .= $xorSum;
        }

        return substr($output, 0, $keyLength);
    }

    private function slowEquals(string $left, string $right): bool
    {
        $diff = strlen($left) ^ strlen($right);
        $leftLength = strlen($left);
        $rightLength = strlen($right);
        $limit = min($leftLength, $rightLength);

        for ($index = 0; $index < $limit; $index++) {
            $diff |= ord($left[$index]) ^ ord($right[$index]);
        }

        return $diff === 0;
    }
}

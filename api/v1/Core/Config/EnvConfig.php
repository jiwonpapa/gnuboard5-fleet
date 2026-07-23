<?php

/**
 * EnvConfig API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Config
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Config;

final readonly class EnvConfig
{
    /** @var list<string> */
    private const SUPPORTED_ENCRYPT_FUNCS = ['create_hash', 'sql_password'];

    public function __construct(
        public int $filePermission,
        public int $dirPermission,
        public string $encryptFunc,
        public string $dataPath,
        public int $nicknameCooldownDays,
        public string $passwordResetUrl,
        public string $emailVerifyUrl,
        public string $uploadImageExtensions,
        public string $uploadFlashExtensions,
        public int $loginFailMaxAttempts,
        public int $loginFailWindowSeconds,
        public bool $authExposeSensitiveTokens,
        public bool $authMailSendEnabled,
        public string $authMailSubjectPrefix,
        public string $authMailFrom,
        public string $authRegisterNotifyAdminEmail,
        public bool $authAutoRehashOnLogin,
        public int $authPasswordResetTtlSeconds,
        public int $authEmailVerifyTtlSeconds,
        public string $unknownIpFallback,
        public string $prohibitMemberIds,
        public string $prohibitEmailDomains,
        public string $prohibitMemberNicks,
        public bool $pluginBoardRewardEnableGrant,
        public bool $adminSmsEnabled = true,
        public bool $g5Independent = false,
        public string $jwtSecret = '',
        public int $jwtAccessExpires = 3600,
        public int $jwtRefreshExpires = 604800,
        public string $jwtIssuer = 'gnuboard5-restapi',
        public string $jwtAudience = 'gnuboard5-restapi',
        public int $jwtLeewaySeconds = 30,
        public string $adminSchemaInspectSecret = ''
    ) {
    }

    public static function fromEnv(): self
    {
        return EnvConfigFactory::fromEnv();
    }

    /**
     * @return list<string>
     */
    public static function supportedEncryptFuncs(): array
    {
        return self::SUPPORTED_ENCRYPT_FUNCS;
    }

    public static function isSupportedEncryptFunc(string $value): bool
    {
        return in_array(strtolower(trim($value)), self::SUPPORTED_ENCRYPT_FUNCS, true);
    }

    /**
     * @return list<string>
     */
    public function uploadImageExtensionList(): array
    {
        return $this->splitList($this->uploadImageExtensions, true);
    }

    /**
     * @return list<string>
     */
    public function uploadFlashExtensionList(): array
    {
        return $this->splitList($this->uploadFlashExtensions, true);
    }

    /**
     * @return list<string>
     */
    public function prohibitMemberIdList(): array
    {
        return $this->splitList($this->prohibitMemberIds, true);
    }

    /**
     * @return list<string>
     */
    public function prohibitEmailDomainList(): array
    {
        return $this->splitList($this->prohibitEmailDomains, true);
    }

    /**
     * @return list<string>
     */
    public function prohibitMemberNickList(): array
    {
        return $this->splitList($this->prohibitMemberNicks, true);
    }

    /**
     * @return list<string>
     */
    private function splitList(string $raw, bool $lowercase): array
    {
        $tokens = preg_split('/[|,]/', $raw);
        if (!is_array($tokens)) {
            return [];
        }

        $unique = [];
        foreach ($tokens as $token) {
            $item = trim($token);
            if ($item === '') {
                continue;
            }

            $key = $lowercase ? strtolower($item) : $item;
            $unique[$key] = true;
        }

        return array_keys($unique);
    }

    public static function resolveDataPath(): string
    {
        return EnvDataPathResolver::resolve();
    }
}

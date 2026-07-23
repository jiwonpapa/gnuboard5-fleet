<?php

declare(strict_types=1);

namespace Api\Core\Config;

use InvalidArgumentException;

final class EnvConfigFactory
{
    public static function fromEnv(): EnvConfig
    {
        return new EnvConfig(
            filePermission: self::permission('G5_FILE_PERMISSION', '0644'),
            dirPermission: self::permission('G5_DIR_PERMISSION', '0755'),
            encryptFunc: self::encryptFunc('G5_ENCRYPT_FUNC', 'create_hash'),
            dataPath: EnvDataPathResolver::resolve(),
            nicknameCooldownDays: max(0, EnvValueReader::int('NICKNAME_CHANGE_COOLDOWN_DAYS', 30)),
            passwordResetUrl: EnvValueReader::string('AUTH_PASSWORD_RESET_URL', ''),
            emailVerifyUrl: EnvValueReader::string('AUTH_EMAIL_VERIFY_URL', ''),
            uploadImageExtensions: EnvValueReader::string('UPLOAD_IMAGE_EXTENSIONS', 'jpg|jpeg|png|gif|webp|bmp'),
            uploadFlashExtensions: EnvValueReader::string('UPLOAD_FLASH_EXTENSIONS', 'swf'),
            loginFailMaxAttempts: max(1, EnvValueReader::int('LOGIN_FAIL_MAX_ATTEMPTS', 5)),
            loginFailWindowSeconds: max(60, EnvValueReader::int('LOGIN_FAIL_WINDOW_SECONDS', 300)),
            authExposeSensitiveTokens: EnvValueReader::bool('AUTH_EXPOSE_SENSITIVE_TOKENS', false),
            authMailSendEnabled: EnvValueReader::bool('AUTH_MAIL_SEND_ENABLED', false),
            authMailSubjectPrefix: EnvValueReader::string('AUTH_MAIL_SUBJECT_PREFIX', '[G5 API]'),
            authMailFrom: EnvValueReader::string('AUTH_MAIL_FROM', 'no-reply@localhost'),
            authRegisterNotifyAdminEmail: EnvValueReader::string('AUTH_REGISTER_NOTIFY_ADMIN_EMAIL', ''),
            authAutoRehashOnLogin: EnvValueReader::bool('AUTH_AUTO_REHASH_ON_LOGIN', true),
            authPasswordResetTtlSeconds: max(60, EnvValueReader::int('AUTH_PASSWORD_RESET_TTL_SECONDS', 1800)),
            authEmailVerifyTtlSeconds: max(300, EnvValueReader::int('AUTH_EMAIL_VERIFY_TTL_SECONDS', 86400)),
            unknownIpFallback: EnvValueReader::string('UNKNOWN_IP_FALLBACK', 'unknown'),
            prohibitMemberIds: EnvValueReader::string('PROHIBIT_MEMBER_IDS', 'admin,administrator,root,master'),
            prohibitEmailDomains: EnvValueReader::string('PROHIBIT_EMAIL_DOMAINS', ''),
            prohibitMemberNicks: EnvValueReader::string('PROHIBIT_MEMBER_NICKS', ''),
            pluginBoardRewardEnableGrant: EnvValueReader::bool('PLUGIN_BOARD_REWARD_ENABLE_GRANT', false),
            adminSmsEnabled: EnvValueReader::bool('ADMIN_SMS_ENABLED', true),
            g5Independent: EnvValueReader::bool('G5_INDEPENDENT', false),
            jwtSecret: EnvValueReader::string('JWT_SECRET', ''),
            jwtAccessExpires: max(60, EnvValueReader::int('JWT_ACCESS_EXPIRES', 3600)),
            jwtRefreshExpires: max(300, EnvValueReader::int('JWT_REFRESH_EXPIRES', 604800)),
            jwtIssuer: EnvValueReader::string('JWT_ISSUER', 'gnuboard5-restapi'),
            jwtAudience: EnvValueReader::string('JWT_AUDIENCE', 'gnuboard5-restapi'),
            jwtLeewaySeconds: max(0, EnvValueReader::int('JWT_LEEWAY_SECONDS', 30)),
            adminSchemaInspectSecret: EnvValueReader::string('ADMIN_SCHEMA_INSPECT_SECRET', '')
        );
    }

    private static function permission(string $key, string $default): int
    {
        $raw = EnvValueReader::string($key, $default);
        if (preg_match('/^[0-7]{3,4}$/', $raw) !== 1) {
            $raw = $default;
        }

        return (int)octdec($raw);
    }

    private static function encryptFunc(string $key, string $default): string
    {
        $value = strtolower(EnvValueReader::string($key, $default));
        if (!EnvConfig::isSupportedEncryptFunc($value)) {
            throw new InvalidArgumentException(
                sprintf(
                    'G5_ENCRYPT_FUNC는 %s만 허용됩니다.',
                    implode(', ', EnvConfig::supportedEncryptFuncs())
                )
            );
        }

        return $value;
    }
}

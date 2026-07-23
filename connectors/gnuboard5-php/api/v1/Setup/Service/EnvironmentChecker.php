<?php

/**
 * EnvironmentChecker API module.
 *
 * @package  Gnuboard5\Api\v1\Setup\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Setup\Service;

use Api\Core\Config\EnvConfig;
use Api\Core\Config\EnvValueReader;
use Api\Core\Database\PdoConnectionFactory;
use Api\Core\Database\TableRegistry;
use Api\Setup\Value\CheckResult;
use Throwable;

final class EnvironmentChecker
{
    /**
     * @return array<int, CheckResult>
     */
    public function run(): array
    {
        $results = [];

        $results[] = $this->check(
            version_compare(PHP_VERSION, '8.1.0', '>='),
            'PHP >= 8.1',
            'PHP 버전을 8.1 이상으로 맞춰주세요.'
        );

        $results[] = $this->check(
            extension_loaded('pdo') && extension_loaded('pdo_mysql'),
            'PDO + pdo_mysql extension',
            'PHP 확장 pdo, pdo_mysql을 활성화해주세요.'
        );

        $requiredEnv = ['APP_ENV', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'JWT_SECRET', 'DATA_PATH', 'G5_ENCRYPT_FUNC'];
        $missing = [];
        foreach ($requiredEnv as $key) {
            if (EnvValueReader::raw($key) === '') {
                $missing[] = $key;
            }
        }
        $results[] = $this->check(
            $missing === [],
            '.env required keys',
            $missing === [] ? 'OK' : '.env에 다음 키를 입력하세요: ' . implode(', ', $missing)
        );

        try {
            PdoConnectionFactory::create();
            $dbPassed = true;
            $dbInstruction = 'DB 연결 성공';
        } catch (Throwable $exception) {
            $dbPassed = false;
            $dbInstruction = 'DB 연결 실패: ' . $exception->getMessage();
        }
        $results[] = $this->check($dbPassed, 'DB connection', $dbInstruction);

        $memberTableExists = false;
        $memberInstruction = 'g5_member 테이블 확인됨';
        try {
            $pdo = PdoConnectionFactory::create();
            $registry = new TableRegistry();
            $memberTable = $registry->get('member');
            $stmt = $pdo->prepare('SHOW TABLES LIKE :table_name');
            $stmt->execute(['table_name' => $memberTable]);
            $memberTableExists = (bool)$stmt->fetchColumn();
            if (!$memberTableExists) {
                $memberInstruction = $memberTable . ' 테이블이 존재하지 않습니다.';
            }
        } catch (Throwable $exception) {
            $memberInstruction = '테이블 확인 실패: ' . $exception->getMessage();
        }
        $results[] = $this->check($memberTableExists, 'g5_member table', $memberInstruction);

        $dataPath = EnvValueReader::string('DATA_PATH', '');
        if ($dataPath === '') {
            $dataPath = EnvValueReader::string('UPLOAD_ROOT_PATH', '');
        }
        $results[] = $this->check(
            $dataPath !== '' && is_dir($dataPath) && is_readable($dataPath),
            'DATA_PATH readable',
            'DATA_PATH 경로를 생성/읽기 가능하게 설정하세요.'
        );

        $results[] = $this->check(
            $dataPath !== '' && is_dir($dataPath) && is_writable($dataPath),
            'DATA_PATH writable',
            'DATA_PATH 경로 쓰기 권한을 부여하세요.'
        );

        $encryptFunc = EnvValueReader::string('G5_ENCRYPT_FUNC', '');
        $encryptFuncCompatible = $encryptFunc !== '' && EnvConfig::isSupportedEncryptFunc($encryptFunc);
        $results[] = $this->check(
            $encryptFuncCompatible,
            'G5_ENCRYPT_FUNC compatible',
            'G5_ENCRYPT_FUNC는 원본 G5 config.php와 동일한 create_hash 또는 sql_password만 허용됩니다.'
        );

        $jwtSecret = EnvValueReader::string('JWT_SECRET', '');
        $results[] = $this->check(
            strlen($jwtSecret) >= 32,
            'JWT secret length >= 32',
            'JWT_SECRET은 최소 32자 이상으로 설정하세요.'
        );

        $setupEnabled = strtolower(EnvValueReader::string('SETUP_ENABLED', 'false'));
        $results[] = $this->check(
            $setupEnabled === 'false',
            'SETUP lock (SETUP_ENABLED=false)',
            '설치 완료 후 SETUP_ENABLED=false로 잠그세요.'
        );

        return $results;
    }

    private function check(bool $passed, string $label, string $instruction): CheckResult
    {
        return new CheckResult($passed, $instruction, $label);
    }
}

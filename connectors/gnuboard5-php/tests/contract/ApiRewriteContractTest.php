<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class ApiRewriteContractTest extends TestCase
{
    public function testApiV1DirectoryRootReachesFrontControllerBeforeDirectoryBypass(): void
    {
        $contents = file_get_contents(dirname(__DIR__, 2) . '/api/.htaccess');
        self::assertIsString($contents);

        $v1Rule = strpos($contents, 'RewriteRule ^v1/?$ index.php [QSA,L]');
        $directoryBypass = strpos($contents, 'RewriteCond %{REQUEST_FILENAME} !-d');

        self::assertNotFalse($v1Rule);
        self::assertNotFalse($directoryBypass);
        self::assertLessThan($directoryBypass, $v1Rule);
    }
}

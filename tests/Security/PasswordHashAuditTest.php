<?php

declare(strict_types=1);

namespace Tests\Security;

use Api\Core\Security\PasswordHashAudit;
use PHPUnit\Framework\TestCase;

final class PasswordHashAuditTest extends TestCase
{
    private PasswordHashAudit $audit;

    protected function setUp(): void
    {
        parent::setUp();
        $this->audit = new PasswordHashAudit();
    }

    public function testClassifyRecognizesMajorHashFormats(): void
    {
        self::assertSame('create_hash', $this->audit->classify('sha256:12000:salt:hash=='));
        self::assertSame('mysql41', $this->audit->classify('*CFBF47670BD8979A7DB4FD2AF48AC38790505E74'));
        self::assertSame('mysql323', $this->audit->classify('1A2B3C4D5E6F7890'));
        self::assertSame('bcrypt', $this->audit->classify('$2y$12$abcdefghijklmnopqrstuuN1wQ7Q0xD7H2r9m9G1n2l9/4O5y6O7a'));
        self::assertSame('argon2', $this->audit->classify('$argon2id$v=19$m=65536,t=4,p=1$abc$def'));
        self::assertSame('md5', $this->audit->classify(md5('secret')));
        self::assertSame('sha1_hex', $this->audit->classify(sha1('secret')));
        self::assertSame('sha256_hex', $this->audit->classify(hash('sha256', 'secret')));
        self::assertSame('empty', $this->audit->classify(''));
    }

    public function testSummarizeFlagsBcryptAsIncompatibleUnderCreateHash(): void
    {
        $summary = $this->audit->summarize([
            ['mb_id' => 'neojins', 'mb_password' => 'sha256:12000:salt:hash=='],
            ['mb_id' => 'stg-user', 'mb_password' => '$2y$12$abcdefghijklmnopqrstuuN1wQ7Q0xD7H2r9m9G1n2l9/4O5y6O7a'],
            ['mb_id' => 'legacy', 'mb_password' => '*CFBF47670BD8979A7DB4FD2AF48AC38790505E74'],
        ], 'create_hash');

        self::assertSame(3, $summary['total']);
        self::assertSame(2, $summary['compatible_count']);
        self::assertSame(1, $summary['incompatible_count']);
        self::assertSame(['bcrypt' => 1, 'create_hash' => 1, 'mysql41' => 1], $summary['formats']);
        self::assertSame('stg***', $summary['incompatible_samples'][0]['mb_id_masked']);
    }
}

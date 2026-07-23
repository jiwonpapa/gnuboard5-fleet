<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Exception\ApiException;
use DateTimeImmutable;

abstract class AdminSmsRepositoryBase extends AdminBaseRepository
{
    /**
     * @param array<int,string> $tables
     */
    protected function assertSmsTablesAvailable(array $tables, string $feature): void
    {
        $missing = [];
        foreach (array_values(array_unique($tables)) as $table) {
            if (!$this->tableExists($table)) {
                $missing[] = $table;
            }
        }

        if ($missing === []) {
            return;
        }

        throw ApiException::serviceUnavailable(
            $feature . ' 기능을 사용할 수 없습니다. 필요한 SMS 테이블이 없습니다: ' . implode(', ', $missing),
            [
                'reason' => '데이터베이스에 SMS 확장 스키마가 설치되어 있지 않습니다.',
                'action' => 'g5_sms5_* 테이블을 설치하거나 SMS 메뉴를 비활성화한 뒤 다시 시도하세요.',
            ]
        );
    }

    protected function requireTemplateStorage(string $feature): void
    {
        $this->assertSmsTablesAvailable(
            [$this->templateTable(), $this->templateGroupTable()],
            $feature
        );
    }

    protected function requireContactStorage(string $feature, bool $includeSmsConfig = false): void
    {
        $tables = [$this->contactTable(), $this->contactGroupTable()];
        if ($includeSmsConfig) {
            $tables[] = $this->smsConfigTable();
        }

        $this->assertSmsTablesAvailable($tables, $feature);
    }

    protected function requireHistoryStorage(string $feature, bool $includeContactGroup = false): void
    {
        $tables = [$this->writeTable(), $this->historyTable()];
        if ($includeContactGroup) {
            $tables[] = $this->contactGroupTable();
        }

        $this->assertSmsTablesAvailable($tables, $feature);
    }

    protected function normalizeMobilePhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', trim($phone)) ?? '';
        if (preg_match('/^(01[016789])([0-9]{3,4})([0-9]{4})$/', $digits) !== 1) {
            return '';
        }

        return $digits;
    }

    protected function formatMobilePhone(string $phone, bool $withHyphen): string
    {
        $digits = $this->normalizeMobilePhone($phone);
        if ($digits === '') {
            return '';
        }

        if (!$withHyphen) {
            return $digits;
        }

        return preg_replace('/^(01[016789])([0-9]{3,4})([0-9]{4})$/', '$1-$2-$3', $digits) ?? $digits;
    }

    /**
     * @param array<string,mixed> $config
     */
    protected function isProviderReady(array $config): bool
    {
        if (trim((string)($config['cf_sms_use'] ?? '')) !== 'icode') {
            return false;
        }

        if (trim((string)($config['cf_phone'] ?? '')) === '') {
            return false;
        }

        if (trim((string)($config['cf_icode_token_key'] ?? '')) !== '') {
            return true;
        }

        return trim((string)($config['cf_icode_id'] ?? '')) !== ''
            && trim((string)($config['cf_icode_pw'] ?? '')) !== '';
    }

    protected function configTable(): string
    {
        return $this->tables()->get('config');
    }

    protected function smsConfigTable(): string
    {
        return $this->tables()->prefix() . 'sms5_config';
    }

    protected function memberTable(): string
    {
        return $this->tables()->get('member');
    }

    protected function writeTable(): string
    {
        return $this->tables()->prefix() . 'sms5_write';
    }

    protected function historyTable(): string
    {
        return $this->tables()->prefix() . 'sms5_history';
    }

    protected function contactTable(): string
    {
        return $this->tables()->prefix() . 'sms5_book';
    }

    protected function contactGroupTable(): string
    {
        return $this->tables()->prefix() . 'sms5_book_group';
    }

    protected function templateTable(): string
    {
        return $this->tables()->prefix() . 'sms5_form';
    }

    protected function templateGroupTable(): string
    {
        return $this->tables()->prefix() . 'sms5_form_group';
    }

    protected function now(): string
    {
        return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    }
}

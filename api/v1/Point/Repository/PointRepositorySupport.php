<?php

/**
 * PointRepositorySupport API module.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Util\G5DateTime;
use Api\Support\Repository\BaseRepository;

abstract class PointRepositorySupport extends BaseRepository
{
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    protected function getPointTable(): string
    {
        return $this->tables()->get('point');
    }

    /**
     * @return array{0:int,1:string}
     */
    protected function resolveExpiration(int $point, ?int $expireDays): array
    {
        if ($point < 0) {
            return [1, G5DateTime::today()];
        }

        $days = $expireDays;
        if ($days === null) {
            $days = $this->loadPointTerm();
        }

        if (is_int($days) && $days > 0) {
            $timestamp = strtotime('+' . $days . ' days');
            if ($timestamp !== false) {
                return [0, date('Y-m-d', $timestamp)];
            }
        }

        return [0, '9999-12-31'];
    }

    protected function normalizeDate(?string $date): string
    {
        $candidate = trim((string)$date);
        if ($candidate === '') {
            return G5DateTime::today();
        }

        $timestamp = strtotime($candidate);
        if ($timestamp === false) {
            return G5DateTime::today();
        }

        return date('Y-m-d', $timestamp);
    }

    private function loadPointTerm(): ?int
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT cf_point_term
             FROM {$configTable}
             LIMIT 1"
        );
        if (!is_array($row)) {
            return null;
        }

        $term = (int)($row['cf_point_term'] ?? 0);

        return $term > 0 ? $term : null;
    }
}

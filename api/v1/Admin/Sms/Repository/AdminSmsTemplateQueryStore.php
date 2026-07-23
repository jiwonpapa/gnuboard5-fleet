<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsTemplateQueryStore extends AdminSmsTemplateStoreBase
{
    private ?AdminSmsTemplateGroupStore $resolvedGroupStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsTemplateGroupStore $groupStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedGroupStore = $groupStore;
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listTemplates(int $page, int $perPage, ?int $groupId, string $searchField, string $search): array
    {
        $this->requireTemplateStorage('SMS 템플릿 조회');
        $table = $this->templateTable();
        $where = ' WHERE 1=1 ';
        $params = [];

        if ($groupId !== null) {
            $where .= ' AND t.fg_no = :fg_no ';
            $params['fg_no'] = $groupId;
        }

        $searchTerm = trim($search);
        if ($searchTerm !== '') {
            switch ($searchField) {
                case 'name':
                    $where .= ' AND t.fo_name LIKE :search ';
                    break;
                case 'content':
                    $where .= ' AND t.fo_content LIKE :search ';
                    break;
                default:
                    $where .= ' AND (t.fo_name LIKE :search OR t.fo_content LIKE :search) ';
                    break;
            }
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$table} t {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;
        $groupTable = $this->templateGroupTable();

        $items = $this->fetchAllAssociative(
            "SELECT
                t.fo_no,
                t.fg_no,
                t.fg_member,
                t.fo_name,
                t.fo_content,
                t.fo_datetime,
                g.fg_name
             FROM {$table} t
             LEFT JOIN {$groupTable} g ON g.fg_no = t.fg_no
             {$where}
             ORDER BY t.fo_no DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        foreach ($items as &$item) {
            $item['fg_name'] = $item['fg_no'] === 0 || (string)($item['fg_name'] ?? '') === ''
                ? '미분류'
                : (string)$item['fg_name'];
        }
        unset($item);

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplate(int $templateId): ?array
    {
        $this->requireTemplateStorage('SMS 템플릿 조회');
        $row = $this->fetchAssociative(
            "SELECT fo_no, fg_no, fg_member, fo_name, fo_content, fo_datetime
             FROM {$this->templateTable()}
             WHERE fo_no = :fo_no
             LIMIT 1",
            ['fo_no' => $templateId]
        );

        if (!is_array($row)) {
            return null;
        }

        $group = $this->groupStore()->findTemplateGroup((int)$row['fg_no']);
        $row['fg_name'] = (string)($group['fg_name'] ?? '미분류');

        return $row;
    }

    public function templateContentExists(string $content, ?int $excludeId = null): bool
    {
        $this->requireTemplateStorage('SMS 템플릿 조회');
        $sql = "SELECT fo_no FROM {$this->templateTable()} WHERE fo_content = :fo_content";
        $params = ['fo_content' => $content];
        if ($excludeId !== null) {
            $sql .= " AND fo_no <> :fo_no";
            $params['fo_no'] = $excludeId;
        }

        return is_array($this->fetchAssociative($sql . ' LIMIT 1', $params));
    }

    private function groupStore(): AdminSmsTemplateGroupStore
    {
        return $this->resolvedGroupStore ??= new AdminSmsTemplateGroupStore($this->queryBuilder(), $this->tables());
    }
}

<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\ArrayParameterType;

final class AdminSmsTemplateBatchStore extends AdminSmsTemplateStoreBase
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
     * @param list<int> $templateIds
     * @return array<string,mixed>
     */
    public function batchUpdateTemplates(string $action, array $templateIds, ?int $targetGroupId = null): array
    {
        $this->requireTemplateStorage('SMS 템플릿 일괄 처리');
        $before = $this->fetchAllAssociative(
            "SELECT fo_no, fg_no FROM {$this->templateTable()} WHERE fo_no IN (:ids)",
            ['ids' => $templateIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        if ($action === 'delete') {
            $affected = $this->executeStatement(
                "DELETE FROM {$this->templateTable()} WHERE fo_no IN (:ids)",
                ['ids' => $templateIds],
                ['ids' => ArrayParameterType::INTEGER]
            );
        } else {
            $group = $this->groupStore()->findTemplateGroup((int)$targetGroupId);
            $fgMember = (int)($group['fg_member'] ?? 0);
            $affected = $this->executeStatement(
                "UPDATE {$this->templateTable()}
                 SET fg_no = :fg_no, fg_member = :fg_member
                 WHERE fo_no IN (:ids)",
                [
                    'fg_no' => $targetGroupId,
                    'fg_member' => $fgMember,
                    'ids' => $templateIds,
                ],
                ['ids' => ArrayParameterType::INTEGER]
            );
        }

        $groups = [];
        foreach ($before as $row) {
            $groups[] = (int)($row['fg_no'] ?? 0);
        }
        if ($targetGroupId !== null) {
            $groups[] = $targetGroupId;
        }

        foreach (array_unique(array_filter($groups, static fn (int $groupId): bool => $groupId > 0)) as $groupId) {
            $this->syncTemplateGroupCount($groupId);
        }

        return [
            'action' => $action,
            'affected' => $affected,
            'target_fg_no' => $targetGroupId,
        ];
    }

    private function groupStore(): AdminSmsTemplateGroupStore
    {
        return $this->resolvedGroupStore ??= new AdminSmsTemplateGroupStore($this->queryBuilder(), $this->tables());
    }
}

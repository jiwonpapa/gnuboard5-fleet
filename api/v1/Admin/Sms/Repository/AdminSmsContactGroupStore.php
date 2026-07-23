<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsContactGroupStore extends AdminSmsContactStoreBase
{
    private ?AdminSmsMemberSyncStore $resolvedMemberSyncStore = null;
    private ?AdminSmsContactGroupQueryStore $resolvedQueryStore = null;
    private ?AdminSmsContactGroupMutationStore $resolvedMutationStore = null;

    /**
     * @return array<string,mixed>
     */
    public function syncMembers(): array
    {
        return $this->memberSyncStore()->syncMembers();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listContactGroups(): array
    {
        return $this->queryStore()->listContactGroups();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContactGroup(int $groupId): ?array
    {
        return $this->queryStore()->findContactGroup($groupId);
    }

    public function contactGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        return $this->queryStore()->contactGroupNameExists($name, $excludeId);
    }

    /**
     * @return array<string,mixed>
     */
    public function createContactGroup(string $name): array
    {
        return $this->mutationStore()->createContactGroup($name);
    }

    /**
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, string $name): array
    {
        return $this->mutationStore()->updateContactGroup($groupId, $name);
    }

    public function moveContactGroup(int $groupId, int $targetGroupId): int
    {
        return $this->mutationStore()->moveContactGroup($groupId, $targetGroupId);
    }

    public function clearContactGroup(int $groupId): int
    {
        return $this->mutationStore()->clearContactGroup($groupId);
    }

    public function deleteContactGroup(int $groupId): int
    {
        return $this->mutationStore()->deleteContactGroup($groupId);
    }

    private function memberSyncStore(): AdminSmsMemberSyncStore
    {
        return $this->resolvedMemberSyncStore ??= new AdminSmsMemberSyncStore(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function queryStore(): AdminSmsContactGroupQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsContactGroupQueryStore(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function mutationStore(): AdminSmsContactGroupMutationStore
    {
        return $this->resolvedMutationStore ??= new AdminSmsContactGroupMutationStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->queryStore()
        );
    }
}

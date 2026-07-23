<?php

declare(strict_types=1);

namespace Api\Admin\System\Service\Support;

final class AdminSystemMaintenanceResultBuilder
{
    /**
     * @param list<string> $deletedPaths
     * @return array<string,mixed>
     */
    public function completed(string $task, string $directory, array $deletedPaths): array
    {
        return [
            'task' => $task,
            'status' => 'completed',
            'directory' => $directory,
            'deleted_count' => count($deletedPaths),
            'deleted_paths' => $deletedPaths,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function skipped(string $task, string $directory, string $message): array
    {
        return [
            'task' => $task,
            'status' => 'skipped',
            'directory' => $directory,
            'deleted_count' => 0,
            'deleted_paths' => [],
            'message' => $message,
        ];
    }
}

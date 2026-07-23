<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminDashboardRepository extends AdminBaseRepository
{
    private ?AdminDashboardSummaryRepository $summaryRepository = null;

    private ?AdminDashboardRecentRepository $recentRepository = null;

    /**
     * @return array<string,mixed>
     */
    public function overview(int $limit): array
    {
        return [
            'limit' => $limit,
            'summary' => [
                'members' => $this->summaryRepository()->memberSummary(),
                'posts' => $this->summaryRepository()->postSummary(),
                'points' => $this->summaryRepository()->pointSummary(),
                'visits' => $this->summaryRepository()->visitSummary(),
            ],
            'recent_members' => $this->recentRepository()->recentMembers($limit),
            'recent_posts' => $this->recentRepository()->recentPosts($limit),
            'recent_points' => $this->recentRepository()->recentPoints($limit),
        ];
    }

    private function summaryRepository(): AdminDashboardSummaryRepository
    {
        if ($this->summaryRepository instanceof AdminDashboardSummaryRepository) {
            return $this->summaryRepository;
        }

        return $this->summaryRepository = new AdminDashboardSummaryRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function recentRepository(): AdminDashboardRecentRepository
    {
        if ($this->recentRepository instanceof AdminDashboardRecentRepository) {
            return $this->recentRepository;
        }

        return $this->recentRepository = new AdminDashboardRecentRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}

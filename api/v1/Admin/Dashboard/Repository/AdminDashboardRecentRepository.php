<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminDashboardRecentRepository extends AdminBaseRepository
{
    private ?AdminDashboardRecentMemberRepository $memberRepository = null;
    private ?AdminDashboardRecentPostRepository $postRepository = null;
    private ?AdminDashboardRecentPointRepository $pointRepository = null;

    /**
     * @return list<array<string,mixed>>
     */
    public function recentMembers(int $limit): array
    {
        return $this->memberRepository()->recentMembers($limit);
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function recentPosts(int $limit): array
    {
        return $this->postRepository()->recentPosts($limit);
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function recentPoints(int $limit): array
    {
        return $this->pointRepository()->recentPoints($limit);
    }

    private function memberRepository(): AdminDashboardRecentMemberRepository
    {
        if ($this->memberRepository instanceof AdminDashboardRecentMemberRepository) {
            return $this->memberRepository;
        }

        $this->memberRepository = new AdminDashboardRecentMemberRepository(
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->memberRepository;
    }

    private function postRepository(): AdminDashboardRecentPostRepository
    {
        if ($this->postRepository instanceof AdminDashboardRecentPostRepository) {
            return $this->postRepository;
        }

        $this->postRepository = new AdminDashboardRecentPostRepository(
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->postRepository;
    }

    private function pointRepository(): AdminDashboardRecentPointRepository
    {
        if ($this->pointRepository instanceof AdminDashboardRecentPointRepository) {
            return $this->pointRepository;
        }

        $this->pointRepository = new AdminDashboardRecentPointRepository(
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->pointRepository;
    }
}

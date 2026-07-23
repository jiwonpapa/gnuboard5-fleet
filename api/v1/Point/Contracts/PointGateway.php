<?php

declare(strict_types=1);

namespace Api\Point\Contracts;

interface PointGateway extends PointQueryGateway, PointRewardGateway, PointMaintenanceGateway
{
}

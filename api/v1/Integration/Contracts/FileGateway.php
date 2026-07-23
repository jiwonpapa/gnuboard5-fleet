<?php

/**
 * FileGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\File\Contracts\FileGateway as DomainFileGateway;

/**
 * @deprecated Use \Api\File\Contracts\FileGateway instead.
 */
interface FileGateway extends DomainFileGateway
{
}

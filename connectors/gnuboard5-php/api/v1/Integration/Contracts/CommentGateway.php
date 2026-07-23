<?php

/**
 * CommentGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

use Api\Comment\Contracts\CommentGateway as DomainCommentGateway;

/**
 * @deprecated Use \Api\Comment\Contracts\CommentGateway instead.
 */
interface CommentGateway extends DomainCommentGateway
{
}

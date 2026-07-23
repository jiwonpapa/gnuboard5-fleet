<?php

declare(strict_types=1);

namespace Api\Post\Contracts;

interface PostGateway extends PostReadGateway, PostWriteGateway
{
}

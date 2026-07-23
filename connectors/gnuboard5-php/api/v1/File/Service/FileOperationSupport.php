<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Core\Config\EnvConfig;
use Api\File\Contracts\FileGateway;

trait FileOperationSupport
{
    use FileInputSupport;
    use FileMetadataSupport;
    use FileStorageSupport;

    abstract protected function fileGateway(): FileGateway;

    abstract protected function envConfig(): EnvConfig;
}

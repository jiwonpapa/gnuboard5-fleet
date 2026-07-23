<?php

declare(strict_types=1);

namespace Api\Auth\External\Contracts;

interface ExternalAuthHttpClient
{
    /**
     * @param array<string, scalar|null> $form
     * @param array<string, string> $headers
     * @return array{status:int, body:array<string,mixed>|null, raw_body:string}
     */
    public function postForm(string $url, array $form, array $headers = []): array;

    /**
     * @param array<string, string> $headers
     * @return array{status:int, body:array<string,mixed>|null, raw_body:string}
     */
    public function getJson(string $url, array $headers = []): array;
}

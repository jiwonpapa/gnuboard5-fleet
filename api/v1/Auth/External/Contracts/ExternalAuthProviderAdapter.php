<?php

declare(strict_types=1);

namespace Api\Auth\External\Contracts;

interface ExternalAuthProviderAdapter
{
    public function provider(): string;

    /**
     * @return array{
     *     provider:string,
     *     label:string,
     *     mode:string,
     *     description:string,
     *     flows:list<string>,
     *     sandbox_available:bool,
     *     replay_supported:bool
     * }
     */
    public function describe(): array;

    /**
     * @param array{
     *     provider:string,
     *     flow:string,
     *     callback_url:string,
     *     state:string,
     *     request_token:string,
     *     scopes:list<string>,
     *     scenario:?string,
     *     metadata:array<string,mixed>,
     *     expires_in:int
     * } $request
     * @return array{
     *     provider_mode:string,
     *     authorization_url:string,
     *     callback_method:string,
     *     provider_meta?:array<string,mixed>
     * }
     */
    public function start(array $request): array;

    /**
     * @param array{
     *     provider:string,
     *     flow:string,
     *     request_token:string,
     *     state:string,
     *     payload:array<string,mixed>,
     *     code:?string,
     *     scenario:?string,
     *     claims:array<string,mixed>
     * } $request
     * @return array{
     *     status:string,
     *     provider_tx_id:string,
     *     retryable:bool,
     *     user_action_required:bool,
     *     error_code:?string,
     *     error_message:?string,
     *     provider_user?:array<string,mixed>|null,
     *     provider_payload?:array<string,mixed>,
     *     provider_meta?:array<string,mixed>
     * }
     */
    public function complete(array $request): array;
}

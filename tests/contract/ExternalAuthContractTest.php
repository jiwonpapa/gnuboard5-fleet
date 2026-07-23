<?php

declare(strict_types=1);

namespace Tests\Contract;

final class ExternalAuthContractTest extends ContractTestCase
{
    public function testExternalAuthPathsAreDeclared(): void
    {
        $paths = [
            ['/auth/external/providers', 'get', 'listExternalAuthProviders'],
            ['/auth/external/{provider}/start', 'post', 'startExternalAuth'],
            ['/auth/external/{provider}/complete', 'post', 'completeExternalAuth'],
            ['/auth/external/{provider}/sessions', 'post', 'createExternalAuthSession'],
            ['/auth/external/{provider}/claims', 'post', 'claimExternalAuthToExistingMember'],
            ['/auth/external/{provider}/registrations', 'post', 'registerMemberWithExternalAuth'],
            ['/auth/external/links', 'get', 'listMyExternalAuthLinks'],
            ['/auth/external/{provider}/links', 'post', 'createExternalAuthLink'],
            ['/auth/external/{provider}/links/{provider_user_id}', 'delete', 'deleteExternalAuthLink'],
        ];

        foreach ($paths as [$path, $method, $operationId]) {
            $this->assertMethodHasOperationId($path, $method, $operationId);
        }
    }

    public function testExternalAuthStartSchemaAllowsGetAndPostCallbackMethods(): void
    {
        $openApi = file_get_contents(__DIR__ . '/../../api/docs/openapi.yaml');

        self::assertIsString($openApi);
        self::assertStringContainsString("callback_method:\n              type: string\n              enum: [GET, POST]", $openApi);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AuthContractTest extends ContractTestCase
{
    public function testSessionRequestsAndResponsesAreClosed(): void
    {
        $this->assertRequestBodyUsesSchemaRef('/auth/login', 'post', 'AuthLoginRequest');
        $this->assertSchemaIsClosedObject('AuthLoginRequest');
        $this->assertSchemaRequiredFields('AuthLoginRequest', ['mb_id', 'mb_password']);

        $this->assertRequestBodyUsesSchemaRef('/auth/refresh', 'post', 'AuthRefreshRequest');
        $this->assertSchemaIsClosedObject('AuthRefreshRequest');
        $this->assertSchemaRequiredFields('AuthRefreshRequest', ['refresh_token']);

        $this->assertRequestBodyUsesSchemaRef('/auth/logout', 'post', 'AuthLogoutRequest');
        $this->assertSchemaIsClosedObject('AuthLogoutRequest');
        $this->assertMethodResponseSchema('/auth/logout', 'post', '200', 'AuthLogoutResponse');
        $this->assertComponentUsesSchemaRef('AuthLogoutResponse', 'AuthLogoutResult');
    }

    public function testAvailabilityPathsAreDeclared(): void
    {
        $paths = [
            ['/auth/availability/member-id', 'get', 'checkMemberIdAvailability'],
            ['/auth/availability/nick', 'get', 'checkNickAvailability'],
            ['/auth/availability/email', 'get', 'checkEmailAvailability'],
            ['/auth/availability/phone', 'get', 'checkPhoneAvailability'],
            ['/auth/availability/recommender', 'get', 'checkRecommenderAvailability'],
        ];

        foreach ($paths as [$path, $method, $operationId]) {
            $this->assertMethodHasOperationId($path, $method, $operationId);
            $this->assertMethodHasParameters($path, $method, ['value']);
            $this->assertMethodResponseSchema($path, $method, '200', 'AvailabilityResponse');
        }
    }

    public function testAvailabilitySchemaDocumentsAvailabilityFields(): void
    {
        $this->assertComponentUsesSchemaRef('AvailabilityResponse', 'AvailabilityCheck');
        $this->assertSchemaHasFields('AvailabilityCheck', [
            'type',
            'input',
            'normalized_value',
            'available',
            'reason',
            'message',
        ]);
    }
}

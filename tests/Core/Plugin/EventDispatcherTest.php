<?php

declare(strict_types=1);

namespace Tests\Core\Plugin;

use Api\Core\Plugin\EventDispatcher;
use PHPUnit\Framework\TestCase;

final class EventDispatcherTest extends TestCase
{
    public function testDispatchesListenersInPriorityOrderAndChainsPayload(): void
    {
        $dispatcher = new EventDispatcher();

        $dispatcher->listen('demo', static function (array $payload): array {
            $payload['sequence'][] = 'first';

            return $payload;
        }, 0);
        $dispatcher->listen('demo', static function (array $payload): array {
            $payload['sequence'][] = 'second';

            return $payload;
        }, 10);

        $result = $dispatcher->dispatch('demo', ['sequence' => []]);

        $this->assertSame(['first', 'second'], $result['sequence']);
    }

    public function testReturnsOriginalPayloadWhenNoListenersExist(): void
    {
        $dispatcher = new EventDispatcher();
        $payload = ['ok' => true];

        $this->assertSame($payload, $dispatcher->dispatch('missing', $payload));
        $this->assertFalse($dispatcher->hasListeners('missing'));
    }

    public function testHasListenersReturnsTrueAfterRegistration(): void
    {
        $dispatcher = new EventDispatcher();
        $dispatcher->listen('demo', static fn (array $payload): array => $payload);

        $this->assertTrue($dispatcher->hasListeners('demo'));
    }
}

<?php

declare(strict_types=1);

namespace Tests\Core\Plugin;

use Api\Core\Plugin\PluginScopeViolationException;
use Api\Core\Plugin\PluginScopedContainer;
use Api\Core\Plugin\PluginScopePolicy;
use Api\Integration\Contracts\MemberGateway;
use Api\Integration\Contracts\PointGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Integration\Contracts\PostGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Integration\Contracts\PostWriteGateway;
use DI\ContainerBuilder;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;

final class PluginScopedContainerTest extends TestCase
{
    public function testMemberReadScopeBlocksMutations(): void
    {
        $memberGateway = $this->createMock(MemberGateway::class);
        $memberGateway->expects($this->once())
            ->method('findById')
            ->with('neo')
            ->willReturn(['mb_id' => 'neo']);

        $container = new PluginScopedContainer(
            $this->rootContainer([MemberGateway::class => $memberGateway]),
            $this->manifest(['member.read']),
            new PluginScopePolicy()
        );

        $gateway = $container->get(MemberGateway::class);

        $this->assertSame(['mb_id' => 'neo'], $gateway->findById('neo'));

        $this->expectException(PluginScopeViolationException::class);
        $gateway->update('neo', ['mb_nick' => 'changed']);
    }

    public function testMemberWriteScopeAllowsMutations(): void
    {
        $memberGateway = $this->createMock(MemberGateway::class);
        $memberGateway->expects($this->once())
            ->method('update')
            ->with('neo', ['mb_nick' => 'changed']);

        $container = new PluginScopedContainer(
            $this->rootContainer([MemberGateway::class => $memberGateway]),
            $this->manifest(['member.write']),
            new PluginScopePolicy()
        );

        $gateway = $container->get(MemberGateway::class);
        $gateway->update('neo', ['mb_nick' => 'changed']);

        $this->assertTrue(true);
    }

    public function testPostReadScopeAllowsReadsAndBlocksWrites(): void
    {
        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn(['wr_id' => 10]);

        $container = new PluginScopedContainer(
            $this->rootContainer([PostGateway::class => $postGateway]),
            $this->manifest(['post.read']),
            new PluginScopePolicy()
        );

        $gateway = $container->get(PostGateway::class);

        $this->assertSame(['wr_id' => 10], $gateway->getPost('free', 10));

        $this->expectException(PluginScopeViolationException::class);
        $gateway->deletePost('free', 10);
    }

    public function testPostReadScopeProvidesDedicatedReadGateway(): void
    {
        $postGateway = $this->createMock(PostReadGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 15)
            ->willReturn(['wr_id' => 15]);

        $container = new PluginScopedContainer(
            $this->rootContainer([PostReadGateway::class => $postGateway]),
            $this->manifest(['post.read']),
            new PluginScopePolicy()
        );

        $gateway = $container->get(PostReadGateway::class);

        $this->assertSame(['wr_id' => 15], $gateway->getPost('free', 15));
    }

    public function testPointWriteScopeProvidesRewardGateway(): void
    {
        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())
            ->method('grant')
            ->with('neo', 100, 'reward', 'plugin_demo', 'reward-1', 'grant', null);

        $container = new PluginScopedContainer(
            $this->rootContainer([PointRewardGateway::class => $pointGateway]),
            $this->manifest(['point.write']),
            new PluginScopePolicy()
        );

        $gateway = $container->get(PointRewardGateway::class);
        $gateway->grant('neo', 100, 'reward', 'plugin_demo', 'reward-1', 'grant', null);

        $this->assertTrue(true);
    }

    public function testPostWriteScopeProvidesDedicatedWriteGateway(): void
    {
        $postGateway = $this->createMock(PostWriteGateway::class);
        $postGateway->expects($this->once())
            ->method('deletePost')
            ->with('free', 77);

        $container = new PluginScopedContainer(
            $this->rootContainer([PostWriteGateway::class => $postGateway]),
            $this->manifest(['post.write']),
            new PluginScopePolicy()
        );

        $gateway = $container->get(PostWriteGateway::class);
        $gateway->deletePost('free', 77);

        $this->assertTrue(true);
    }

    public function testDisallowedGatewayAccessThrowsScopeViolation(): void
    {
        $pointGateway = $this->createMock(PointGateway::class);
        $container = new PluginScopedContainer(
            $this->rootContainer([PointGateway::class => $pointGateway]),
            $this->manifest(['member.read']),
            new PluginScopePolicy()
        );

        $this->expectException(PluginScopeViolationException::class);
        $container->get(PointGateway::class);
    }

    /**
     * @param array<string, mixed> $definitions
     */
    private function rootContainer(array $definitions): ContainerInterface
    {
        $builder = new ContainerBuilder();
        $builder->addDefinitions($definitions);

        return $builder->build();
    }

    /**
     * @param array<int, string> $scopes
     * @return array<string, mixed>
     */
    private function manifest(array $scopes): array
    {
        return [
            'name' => 'demo-plugin',
            'vendor' => 'acme',
            'version' => '1.0.0',
            'scopes' => $scopes,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Auth\Service\AuthInputHelper;
use Api\Auth\Service\AuthAvailabilityService;
use Api\Auth\Service\AuthMailService;
use Api\Auth\Service\AuthRecoveryService;
use Api\Auth\Service\AuthRegistrationService;
use Api\Auth\Service\AuthService;
use Api\Auth\Service\AuthSessionService;
use Api\Auth\Contracts\AuthGateway as LocalAuthGateway;
use Api\Board\Service\BoardService;
use Api\Comment\Contracts\CommentGateway;
use Api\Comment\Service\CommentService;
use Api\Core\Config\EnvConfig;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\AuthIdentityGateway as SharedAuthIdentityGateway;
use Api\Integration\Contracts\AuthRecoveryGateway as SharedAuthRecoveryGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Integration\Contracts\PostReadGateway as SharedPostReadGateway;
use Api\Member\Service\MemberImageManager;
use Api\Member\Service\MemberMediaService;
use Api\Member\Service\MemberProfileFieldNormalizer;
use Api\Member\Service\MemberProfilePresenter;
use Api\Member\Service\MemberProfileUpdateService;
use Api\Member\Service\MemberService;
use Api\Post\Contracts\PostGateway as LocalPostGateway;
use Api\Post\Service\PostDeleteService;
use Api\Post\Service\PostAccessPolicy;
use Api\Post\Service\PostFilterNormalizer;
use Api\Post\Service\PostMutationService;
use Api\Post\Service\PostPermissionService;
use Api\Post\Service\PostPayloadNormalizer;
use Api\Post\Service\PostPointService;
use Api\Post\Service\PostReadService;
use Api\Post\Service\PostScrapService;
use Api\Post\Service\PostService;
use Api\Qa\Contracts\QaGateway;
use Api\Qa\Service\QaAttachmentService;
use Api\Qa\Service\QaAttachmentStorage;
use Api\Qa\Service\QaInputService;
use Api\Qa\Service\QaMutationService;
use Api\Qa\Service\QaReadService;
use Api\Qa\Service\QaService;
use Api\Qa\Service\QaWriteService;
use Api\Security\JwtService;
use PHPUnit\Framework\MockObject\MockObject;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

trait BuildsDomainServices
{
    private const TEST_JWT_SECRET = 'test-jwt-secret-1234567890-1234567890';

    abstract protected function createMock(string $originalClassName): MockObject;

    protected function createAuthService(
        LocalAuthGateway $authGateway,
        ?JwtService $jwtService = null,
        mixed $pointGateway = null,
        ?LoggerInterface $logger = null,
        ?EnvConfig $envConfig = null,
        ?EventDispatcher $events = null
    ): AuthService {
        $resolvedJwt = $jwtService instanceof JwtService
            ? $jwtService
            : new JwtService(self::TEST_JWT_SECRET, 3600, 604800);
        $resolvedEvents = $events instanceof EventDispatcher ? $events : new EventDispatcher();
        $resolvedEnv = $envConfig instanceof EnvConfig ? $envConfig : EnvConfig::fromEnv();
        $resolvedLogger = $logger instanceof LoggerInterface ? $logger : new NullLogger();
        $resolvedPointRewardGateway = $pointGateway instanceof PointRewardGateway
            ? $pointGateway
            : $this->createMock(PointRewardGateway::class);
        $resolvedPointMaintenanceGateway = $pointGateway instanceof PointMaintenanceGateway
            ? $pointGateway
            : $this->createMock(PointMaintenanceGateway::class);
        $inputHelper = new AuthInputHelper();
        $availabilityService = new AuthAvailabilityService($authGateway, $authGateway, $inputHelper);
        $mailService = new AuthMailService($resolvedEnv, $resolvedLogger);
        $sessionService = new AuthSessionService(
            $authGateway,
            $authGateway,
            $resolvedJwt,
            $resolvedPointMaintenanceGateway,
            $resolvedEnv,
            $resolvedLogger,
            $resolvedEvents
        );
        $registrationService = new AuthRegistrationService(
            $authGateway,
            $authGateway,
            $authGateway,
            $resolvedJwt,
            $resolvedPointRewardGateway,
            $inputHelper,
            $mailService,
            $resolvedEvents
        );
        $recoveryService = new AuthRecoveryService(
            $authGateway,
            $authGateway,
            $inputHelper,
            $mailService,
            $resolvedEnv
        );

        return new AuthService(
            $authGateway,
            $resolvedJwt,
            $sessionService,
            $registrationService,
            $recoveryService,
            $availabilityService
        );
    }

    protected function createMemberService(
        MemberGateway $memberGateway,
        SharedAuthIdentityGateway $authIdentityGateway,
        ?SharedAuthRecoveryGateway $authRecoveryGateway = null,
        ?MemberImageManager $imageManager = null,
        ?LoggerInterface $logger = null,
        ?EnvConfig $envConfig = null,
        ?EventDispatcher $events = null
    ): MemberService {
        $resolvedEnv = $envConfig instanceof EnvConfig ? $envConfig : EnvConfig::fromEnv();
        $resolvedEvents = $events instanceof EventDispatcher ? $events : new EventDispatcher();
        $resolvedLogger = $logger instanceof LoggerInterface ? $logger : new NullLogger();
        $resolvedRecoveryGateway = $authRecoveryGateway instanceof SharedAuthRecoveryGateway
            ? $authRecoveryGateway
            : $this->createMock(SharedAuthRecoveryGateway::class);
        $presenter = new MemberProfilePresenter();
        $resolvedImageManager = $imageManager instanceof MemberImageManager
            ? $imageManager
            : new MemberImageManager($resolvedEnv);
        $profileUpdateService = new MemberProfileUpdateService(
            $memberGateway,
            $resolvedRecoveryGateway,
            $resolvedLogger,
            $resolvedEnv,
            $presenter,
            new MemberProfileFieldNormalizer($memberGateway),
            $resolvedEvents
        );
        $mediaService = new MemberMediaService(
            $memberGateway,
            $resolvedImageManager
        );

        return new MemberService(
            $memberGateway,
            $authIdentityGateway,
            $presenter,
            $profileUpdateService,
            $mediaService
        );
    }

    protected function createQaService(
        QaGateway $qaGateway,
        ?QaInputService $inputService = null,
        ?QaAttachmentStorage $attachmentStorage = null
    ): QaService {
        $resolvedInput = $inputService instanceof QaInputService ? $inputService : new QaInputService();
        $resolvedStorage = $attachmentStorage instanceof QaAttachmentStorage ? $attachmentStorage : new QaAttachmentStorage();
        $attachmentService = new QaAttachmentService($resolvedStorage);
        $readService = new QaReadService($qaGateway, $resolvedInput);
        $writeService = new QaWriteService($qaGateway, $resolvedInput, $attachmentService, $readService);
        $mutationService = new QaMutationService($qaGateway, $resolvedInput, $attachmentService, $readService);

        return new QaService($qaGateway, $readService, $writeService, $mutationService);
    }

    protected function createPostService(
        LocalPostGateway $postGateway,
        BoardService $boardService,
        \Api\Integration\Contracts\BoardGateway $boardGateway,
        PointRewardGateway $pointGateway,
        ?EventDispatcher $events = null,
        ?CommentService $commentService = null,
        ?PostPermissionService $permissionService = null,
        ?PostPointService $pointService = null
    ): PostService {
        $resolvedEvents = $events instanceof EventDispatcher ? $events : new EventDispatcher();
        $resolvedPermission = $permissionService instanceof PostPermissionService
            ? $permissionService
            : new PostPermissionService(
                new PostFilterNormalizer(),
                new PostPayloadNormalizer(),
                new PostAccessPolicy()
            );
        $resolvedPointService = $pointService instanceof PostPointService
            ? $pointService
            : new PostPointService($pointGateway, $boardService, $resolvedEvents);
        $resolvedCommentService = $commentService instanceof CommentService
            ? $commentService
            : new CommentService(
                $this->createMock(CommentGateway::class),
                $this->createMock(SharedPostReadGateway::class),
                $boardService,
                $resolvedEvents
            );

        $readService = new PostReadService(
            $postGateway,
            $boardService,
            $boardGateway,
            $resolvedPermission,
            $resolvedPointService
        );
        $mutationService = new PostMutationService(
            $postGateway,
            $boardService,
            $resolvedPermission,
            $resolvedPointService,
            $resolvedEvents
        );
        $deleteService = new PostDeleteService(
            $postGateway,
            $boardService,
            $resolvedPermission,
            $resolvedPointService,
            $resolvedCommentService,
            $resolvedEvents
        );
        $scrapService = new PostScrapService(
            $postGateway,
            $boardService,
            $resolvedPermission
        );

        return new PostService(
            $postGateway,
            $boardService,
            $boardGateway,
            $resolvedEvents,
            $resolvedPermission,
            $resolvedPointService,
            $readService,
            $mutationService,
            $deleteService,
            $scrapService
        );
    }
}

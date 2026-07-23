<?php

declare(strict_types=1);

use Api\Admin\Push\Controller\AdminPushController;
use Api\Admin\Sms\Controller\AdminSmsController;
use Api\Admin\System\Controller\AdminSystemController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    $createAdminSystemController = static fn (): AdminSystemController => $resolve(AdminSystemController::class);
    $createAdminPushController = static fn (): AdminPushController => $resolve(AdminPushController::class);
    $createAdminSmsController = static fn (): AdminSmsController => $resolve(AdminSmsController::class);
    $isSmsEnabled = $isAdminSmsEnabled ?? static fn (): bool => true;

    $app->group('/system', function (RouteCollectorProxy $app) use ($createAdminSystemController) {
        $app->get('/auths', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->listAuth($request, $response);
        });
        $app->post('/auths', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->saveAuth($request, $response);
        });
        $app->delete('/auths/{mb_id}/{au_menu}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->deleteAuth($request, $response, $args);
        });

        $app->get('/popups', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->listPopups($request, $response);
        });
        $app->get('/popups/{nw_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->detailPopup($request, $response, $args);
        });
        $app->post('/popups', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->createPopup($request, $response);
        });
        $app->put('/popups/{nw_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->updatePopup($request, $response, $args);
        });
        $app->delete('/popups/{nw_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->deletePopup($request, $response, $args);
        });

        $app->get('/polls', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->listPolls($request, $response);
        });
        $app->get('/polls/{po_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->detailPoll($request, $response, $args);
        });
        $app->post('/polls', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->createPoll($request, $response);
        });
        $app->put('/polls/{po_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->updatePoll($request, $response, $args);
        });
        $app->delete('/polls/{po_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->deletePoll($request, $response, $args);
        });

        $app->get('/qa-config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->getQaConfig($request, $response);
        });
        $app->put('/qa-config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->updateQaConfig($request, $response);
        });

        $app->get('/theme', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->getTheme($request, $response);
        });
        $app->put('/theme', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->updateTheme($request, $response);
        });
        $app->get('/themes', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->listThemes($request, $response);
        });
        $app->get('/themes/{theme}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSystemController) {
            return $createAdminSystemController()->detailTheme($request, $response, $args);
        });

        $app->get('/mails', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->listMails($request, $response);
        });
        $app->get('/mail-recipients', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->listMailRecipients($request, $response);
        });
        $app->post('/mails/test', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->sendMailTest($request, $response);
        });
        $app->post('/mails/send', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->sendMemberMail($request, $response);
        });

        $app->get('/phpinfo', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->phpInfo($request, $response);
        });
        $app->post('/maintenance/session-files/purge', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->purgeSessionFiles($request, $response);
        });
        $app->post('/maintenance/cache-files/purge', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->purgeCacheFiles($request, $response);
        });
        $app->post('/maintenance/captcha-files/purge', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->purgeCaptchaFiles($request, $response);
        });
        $app->post('/maintenance/thumbnail-files/purge', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->purgeThumbnailFiles($request, $response);
        });
        $app->post('/maintenance/member-list-files/purge', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->purgeMemberListFiles($request, $response);
        });
        $app->get('/browscap', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->browscapStatus($request, $response);
        });
        $app->post('/browscap/update', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->updateBrowscap($request, $response);
        });
        $app->post('/browscap/convert', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSystemController) {
            return $createAdminSystemController()->convertBrowscap($request, $response);
        });
    });

    $app->group('/push', function (RouteCollectorProxy $app) use ($createAdminPushController) {
        $app->post('/send', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPushController) {
            return $createAdminPushController()->send($request, $response);
        });
        $app->post('/messages', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPushController) {
            return $createAdminPushController()->send($request, $response);
        });
    });

    if (!$isSmsEnabled()) {
        return;
    }

    $app->group('/sms', function (RouteCollectorProxy $app) use ($createAdminSmsController) {
        $app->get('/config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
            return $createAdminSmsController()->getConfig($request, $response);
        });
        $app->put('/config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
            return $createAdminSmsController()->updateConfig($request, $response);
        });
        $app->post('/member-sync', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
            return $createAdminSmsController()->syncMembers($request, $response);
        });

        $app->group('/template-groups', function (RouteCollectorProxy $app) use ($createAdminSmsController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->listTemplateGroups($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->createTemplateGroup($request, $response);
            });
            $app->get('/{fg_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->detailTemplateGroup($request, $response, $args);
            });
            $app->put('/{fg_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->updateTemplateGroup($request, $response, $args);
            });
            $app->delete('/{fg_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->deleteTemplateGroup($request, $response, $args);
            });
            $app->post('/{fg_no}/move', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->moveTemplateGroup($request, $response, $args);
            });
            $app->delete('/{fg_no}/templates', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->clearTemplateGroup($request, $response, $args);
            });
        });

        $app->group('/templates', function (RouteCollectorProxy $app) use ($createAdminSmsController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->listTemplates($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->createTemplate($request, $response);
            });
            $app->post('/batch', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->batchTemplates($request, $response);
            });
            $app->get('/{fo_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->detailTemplate($request, $response, $args);
            });
            $app->put('/{fo_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->updateTemplate($request, $response, $args);
            });
            $app->delete('/{fo_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->deleteTemplate($request, $response, $args);
            });
        });

        $app->group('/contact-groups', function (RouteCollectorProxy $app) use ($createAdminSmsController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->listContactGroups($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->createContactGroup($request, $response);
            });
            $app->get('/{bg_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->detailContactGroup($request, $response, $args);
            });
            $app->put('/{bg_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->updateContactGroup($request, $response, $args);
            });
            $app->delete('/{bg_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->deleteContactGroup($request, $response, $args);
            });
            $app->post('/{bg_no}/move', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->moveContactGroup($request, $response, $args);
            });
            $app->delete('/{bg_no}/contacts', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->clearContactGroup($request, $response, $args);
            });
        });

        $app->group('/contacts', function (RouteCollectorProxy $app) use ($createAdminSmsController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->listContacts($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->createContact($request, $response);
            });
            $app->post('/batch', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->batchContacts($request, $response);
            });
            $app->post('/import', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->importContacts($request, $response);
            });
            $app->get('/export', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->exportContacts($request, $response);
            });
            $app->get('/{bk_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->detailContact($request, $response, $args);
            });
            $app->put('/{bk_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->updateContact($request, $response, $args);
            });
            $app->delete('/{bk_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->deleteContact($request, $response, $args);
            });
        });

        $app->group('/history', function (RouteCollectorProxy $app) use ($createAdminSmsController) {
            $app->get('/batches', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->listMessageBatches($request, $response);
            });
            $app->get('/deliveries', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
                return $createAdminSmsController()->listDeliveries($request, $response);
            });
            $app->get('/batches/{wr_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->detailMessageBatch($request, $response, $args);
            });
            $app->post('/batches/{wr_no}/resend-failures', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->resendFailures($request, $response, $args);
            });
            $app->post('/batches/{wr_no}/resend-all', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSmsController) {
                return $createAdminSmsController()->resendAll($request, $response, $args);
            });
        });

        $app->post('/messages', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSmsController) {
            return $createAdminSmsController()->sendMessage($request, $response);
        });
    });
};

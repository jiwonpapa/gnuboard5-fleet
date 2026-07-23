<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Controller;

use Api\Admin\Sms\Service\AdminSmsService;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsController
{
    public function __construct(private readonly AdminSmsService $service)
    {
    }

    public function getConfig(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->getConfig());
    }

    public function updateConfig(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateConfig($payload));
    }

    public function syncMembers(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->syncMembers());
    }

    public function listTemplateGroups(Request $request, Response $response): Response
    {
        $result = $this->service->listTemplateGroups($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], null, $result['meta']);
    }

    public function detailTemplateGroup(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope($response, $this->service->detailTemplateGroup((int)($args['fg_no'] ?? 0)));
    }

    public function createTemplateGroup(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createTemplateGroup($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/sms/template-groups/' . (int)($created['fg_no'] ?? 0));
    }

    public function updateTemplateGroup(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateTemplateGroup((int)($args['fg_no'] ?? 0), $payload));
    }

    public function moveTemplateGroup(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->moveTemplateGroup((int)($args['fg_no'] ?? 0), $payload));
    }

    public function clearTemplateGroup(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope($response, $this->service->clearTemplateGroup((int)($args['fg_no'] ?? 0)));
    }

    public function deleteTemplateGroup(Request $request, Response $response, array $args): Response
    {
        $this->service->deleteTemplateGroup((int)($args['fg_no'] ?? 0));

        return $response->withStatus(204);
    }

    public function listTemplates(Request $request, Response $response): Response
    {
        $result = $this->service->listTemplates($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detailTemplate(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope($response, $this->service->detailTemplate((int)($args['fo_no'] ?? 0)));
    }

    public function createTemplate(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createTemplate($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/sms/templates/' . (int)($created['fo_no'] ?? 0));
    }

    public function updateTemplate(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateTemplate((int)($args['fo_no'] ?? 0), $payload));
    }

    public function deleteTemplate(Request $request, Response $response, array $args): Response
    {
        $this->service->deleteTemplate((int)($args['fo_no'] ?? 0));

        return $response->withStatus(204);
    }

    public function batchTemplates(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->batchTemplates($payload));
    }

    public function listContactGroups(Request $request, Response $response): Response
    {
        $result = $this->service->listContactGroups($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], null, $result['meta']);
    }

    public function detailContactGroup(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope($response, $this->service->detailContactGroup((int)($args['bg_no'] ?? 0)));
    }

    public function createContactGroup(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createContactGroup($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/sms/contact-groups/' . (int)($created['bg_no'] ?? 0));
    }

    public function updateContactGroup(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateContactGroup((int)($args['bg_no'] ?? 0), $payload));
    }

    public function moveContactGroup(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->moveContactGroup((int)($args['bg_no'] ?? 0), $payload));
    }

    public function clearContactGroup(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope($response, $this->service->clearContactGroup((int)($args['bg_no'] ?? 0)));
    }

    public function deleteContactGroup(Request $request, Response $response, array $args): Response
    {
        $this->service->deleteContactGroup((int)($args['bg_no'] ?? 0));

        return $response->withStatus(204);
    }

    public function listContacts(Request $request, Response $response): Response
    {
        $result = $this->service->listContacts($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination'], $result['meta']);
    }

    public function detailContact(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope($response, $this->service->detailContact((int)($args['bk_no'] ?? 0)));
    }

    public function createContact(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createContact($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/sms/contacts/' . (int)($created['bk_no'] ?? 0));
    }

    public function updateContact(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateContact((int)($args['bk_no'] ?? 0), $payload));
    }

    public function deleteContact(Request $request, Response $response, array $args): Response
    {
        $this->service->deleteContact((int)($args['bk_no'] ?? 0));

        return $response->withStatus(204);
    }

    public function batchContacts(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->batchContacts($payload));
    }

    public function importContacts(Request $request, Response $response): Response
    {
        $parsedBody = $request->getParsedBody();
        $payload = is_array($parsedBody) ? $parsedBody : ApiResponse::parseJsonBody($request);
        $uploadedFile = $this->pickUploadedFile($request, ['file', 'csv', 'contacts_file']);

        return ApiResponse::envelope($response, $this->service->importContacts($payload, $uploadedFile));
    }

    public function exportContacts(Request $request, Response $response): Response
    {
        $result = $this->service->exportContacts($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], null, $result['meta']);
    }

    public function listMessageBatches(Request $request, Response $response): Response
    {
        $result = $this->service->listMessageBatches($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function listDeliveries(Request $request, Response $response): Response
    {
        $result = $this->service->listDeliveries($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detailMessageBatch(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope(
            $response,
            $this->service->detailMessageBatch((int)($args['wr_no'] ?? 0), $request->getQueryParams())
        );
    }

    public function sendMessage(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->sendMessage($payload);

        $location = '/api/v1/admin/sms/history/batches/' . (int)($result['write_no'] ?? 0)
            . '?wr_renum=' . (int)($result['write_renum'] ?? 0);

        return ApiResponse::envelope($response, $result, null, [], 201)
            ->withHeader('Location', $location);
    }

    public function resendFailures(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->resendFailures((int)($args['wr_no'] ?? 0), $payload));
    }

    public function resendAll(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->resendAll((int)($args['wr_no'] ?? 0), $payload));
    }

    /**
     * @param array<int,string> $candidates
     */
    private function pickUploadedFile(Request $request, array $candidates): ?UploadedFileInterface
    {
        $uploadedFiles = $request->getUploadedFiles();
        $unknownFiles = array_values(array_diff(array_keys($uploadedFiles), $candidates));
        if ($unknownFiles !== []) {
            throw ApiException::badRequest('허용되지 않은 업로드 필드가 있습니다: ' . implode(', ', $unknownFiles));
        }
        foreach ($candidates as $key) {
            if (!array_key_exists($key, $uploadedFiles)) {
                continue;
            }

            $candidate = $uploadedFiles[$key];
            if ($candidate instanceof UploadedFileInterface) {
                return $candidate;
            }
            if (is_array($candidate) && isset($candidate[0]) && $candidate[0] instanceof UploadedFileInterface) {
                return $candidate[0];
            }
        }

        return null;
    }
}

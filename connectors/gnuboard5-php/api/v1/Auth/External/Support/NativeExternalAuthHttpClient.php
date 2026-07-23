<?php

declare(strict_types=1);

namespace Api\Auth\External\Support;

use Api\Auth\External\Contracts\ExternalAuthHttpClient;
use Api\Support\Exception\ApiException;

final class NativeExternalAuthHttpClient implements ExternalAuthHttpClient
{
    public function postForm(string $url, array $form, array $headers = []): array
    {
        $normalizedForm = [];
        foreach ($form as $key => $value) {
            if ($value === null) {
                continue;
            }

            $normalizedForm[$key] = (string)$value;
        }

        $headers['Accept'] = 'application/json';
        $headers['Content-Type'] = 'application/x-www-form-urlencoded';

        return $this->request(
            'POST',
            $url,
            http_build_query($normalizedForm, '', '&', PHP_QUERY_RFC3986),
            $headers
        );
    }

    public function getJson(string $url, array $headers = []): array
    {
        $headers['Accept'] = 'application/json';

        return $this->request('GET', $url, null, $headers);
    }

    /**
     * @param array<string, string> $headers
     * @return array{status:int, body:array<string,mixed>|null, raw_body:string}
     */
    private function request(string $method, string $url, ?string $body, array $headers): array
    {
        if (function_exists('curl_init')) {
            return $this->requestWithCurl($method, $url, $body, $headers);
        }

        return $this->requestWithStreams($method, $url, $body, $headers);
    }

    /**
     * @param array<string, string> $headers
     * @return array{status:int, body:array<string,mixed>|null, raw_body:string}
     */
    private function requestWithCurl(string $method, string $url, ?string $body, array $headers): array
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw ApiException::serverError('외부 인증 HTTP 클라이언트를 초기화할 수 없습니다.');
        }

        $headerLines = [];
        foreach ($headers as $key => $value) {
            $headerLines[] = $key . ': ' . $value;
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => false,
        ]);

        if ($method === 'POST') {
            curl_setopt($handle, CURLOPT_POSTFIELDS, $body ?? '');
        }

        $rawBody = curl_exec($handle);
        $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);

        if ($rawBody === false) {
            throw ApiException::serverError(
                $error !== ''
                    ? '외부 인증 HTTP 요청에 실패했습니다: ' . $error
                    : '외부 인증 HTTP 요청에 실패했습니다.'
            );
        }

        return [
            'status' => $status > 0 ? $status : 0,
            'body' => $this->decodeJson((string)$rawBody),
            'raw_body' => (string)$rawBody,
        ];
    }

    /**
     * @param array<string, string> $headers
     * @return array{status:int, body:array<string,mixed>|null, raw_body:string}
     */
    private function requestWithStreams(string $method, string $url, ?string $body, array $headers): array
    {
        $headerLines = [];
        foreach ($headers as $key => $value) {
            $headerLines[] = $key . ': ' . $value;
        }

        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'ignore_errors' => true,
                'timeout' => 15,
                'header' => implode("\r\n", $headerLines),
                'content' => $body ?? '',
            ],
        ]);

        $rawBody = @file_get_contents($url, false, $context);
        $responseHeaders = function_exists('http_get_last_response_headers')
            ? (http_get_last_response_headers() ?: [])
            : [];

        if ($rawBody === false && $responseHeaders === []) {
            throw ApiException::serverError('외부 인증 HTTP 요청에 실패했습니다.');
        }

        return [
            'status' => $this->parseStatusCode($responseHeaders),
            'body' => $this->decodeJson($rawBody === false ? '' : (string)$rawBody),
            'raw_body' => $rawBody === false ? '' : (string)$rawBody,
        ];
    }

    /**
     * @param list<string> $headers
     */
    private function parseStatusCode(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})\b/', $header, $matches) === 1) {
                return (int)$matches[1];
            }
        }

        return 0;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function decodeJson(string $rawBody): ?array
    {
        $trimmed = trim($rawBody);
        if ($trimmed === '') {
            return null;
        }

        $decoded = json_decode($trimmed, true);

        return is_array($decoded) ? $decoded : null;
    }
}

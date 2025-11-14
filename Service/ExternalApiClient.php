<?php

namespace KimaiPlugin\ExternalIssuesBundle\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

use KimaiPlugin\ExternalIssuesBundle\Service\UrlBuilder;

class ExternalApiClient
{
    private HttpClientInterface $httpClient;

    private string $accessToken;
    private array $requestHeadersTemplate;

    private ?string $responseWrapperKey;
    private UrlBuilder $urlBuilder;

    public function __construct(
        HttpClientInterface $httpClient,
        string $accessToken,
        array $requestHeadersTemplate,
        ?string $responseWrapperKey = null,
        UrlBuilder $urlBuilder

    ) {
        $this->httpClient = $httpClient;
        $this->accessToken = $accessToken;
        $this->requestHeadersTemplate = $requestHeadersTemplate;
        $this->urlBuilder = $urlBuilder;
        $this->responseWrapperKey = $responseWrapperKey;
    }


    public function replaceRequestHeadersPlaceholders(): array
    {
        $resolvedHeaders = $this->requestHeadersTemplate;

        array_walk_recursive($resolvedHeaders, function (&$value) {
            if (is_string($value)) {
                $value = str_replace('{EXTERNAL_ISSUES_ACCESS_TOKEN}', $this->accessToken, $value);
            }
        });

        return $resolvedHeaders;
    }

    public function transformResponse($issueData): array
    {
        $resultKey = $this->urlBuilder->getResultKey();
        $resultValue = $this->urlBuilder->getResultValue();
        $issueIdentifier = $this->urlBuilder->getIssueIdentifier();

        return array_map(
            fn(array $item) => [
                'key' => $item[$resultKey] ?? null,
                'value' => $item[$resultValue] ?? null,
                'issueUrl' => $this->urlBuilder->buildIssueUrl((string) ($item[$issueIdentifier] ?? '')),
            ],
            $issueData
        );
    }


    public function fetchExternalApiIssues(?string $queryString = null): array
    {
        $response = $this->httpClient->request(
            'GET',
            $this->urlBuilder->buildQueryUrl($queryString),
            [
                'headers' => $this->replaceRequestHeadersPlaceholders(),
            ]
        );

        $responseData = $response->toArray();

        $issueData = $this->responseWrapperKey && isset($responseData[$this->responseWrapperKey])
            ? $responseData[$this->responseWrapperKey]
            : $responseData;

        $transformedResult = $this->transformResponse($issueData);

        return $transformedResult;
    }

    public function getRequestHeaders(): array
    {
        return $this->requestHeadersTemplate;
    }

    public function getUrlBuilder(): UrlBuilder
    {
        return $this->urlBuilder;
    }
}

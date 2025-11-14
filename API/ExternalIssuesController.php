<?php

namespace KimaiPlugin\ExternalIssuesBundle\API;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

use KimaiPlugin\ExternalIssuesBundle\Service\ExternalApiClient;

#[Route(path: '/external')]
final class ExternalIssuesController extends AbstractController
{
    private ExternalApiClient $apiClient;

    public function __construct(
        ExternalApiClient $apiClient
    ) {
        $this->apiClient = $apiClient;
    }


    #[Route(path: "/issues", name: "external_issues", methods: ['GET'])]
    public function fetchIssues(Request $request): JsonResponse
    {
        $queryString = $request->query->get('search') ?? '';

        $queryUrl = $this->apiClient->getUrlBuilder()->buildQueryUrl($queryString);

        $issueData = $this->apiClient->fetchExternalApiIssues($queryString);

        return $this->json([
            'queryUrl' => $queryUrl,
            'currentUsername' => $this->apiClient->getUrlBuilder()->getKimaiUsername(),
            'totalIssues' => count($issueData),
            'issueData' => $issueData,
        ]);
    }
}

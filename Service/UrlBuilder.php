<?php

namespace KimaiPlugin\ExternalIssuesBundle\Service;

use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;


class UrlBuilder
{
    private string $baseUrl;
    private string $queryUrlTemplate;
    private string $resultKey;
    private string $resultValue;
    private string $issueIdentifier;
    private string $issueUrlTemplate;

    private Security $security;

    public function __construct(
        string $baseUrl,
        string $queryUrlTemplate,
        string $resultKey,
        string $resultValue,
        string $issueIdentifier,
        string $issueUrlTemplate,

        Security $security

    ) {
        $this->baseUrl = $baseUrl;
        $this->queryUrlTemplate = $queryUrlTemplate;
        $this->resultKey = $resultKey;
        $this->resultValue = $resultValue;
        $this->issueIdentifier = $issueIdentifier;
        $this->issueUrlTemplate = $issueUrlTemplate;

        $this->security = $security;
    }

    public function buildQueryUrl(?string $queryString = null): string
    {
        return strtr($this->queryUrlTemplate, [
            '{EXTERNAL_ISSUES_BASE_URL}' => rtrim($this->baseUrl, '/') . '/',
            '{EXTERNAL_ISSUES_RESULT_KEY}' => $this->resultKey,
            '{EXTERNAL_ISSUES_RESULT_VALUE}' => $this->resultValue,
            '{EXTERNAL_ISSUE_IDENTIFIER}' => $this->issueIdentifier,
            '{KIMAI_USERNAME}' => $this->getKimaiUsername(),
            '{queryString}' => $queryString !== null ? trim($queryString) : '',
        ]);
    }

    public function buildIssueUrl(string $issueIdentifier): string
    {
        $resolvedUrl = strtr($this->issueUrlTemplate, [
            '{EXTERNAL_ISSUES_BASE_URL}' => rtrim($this->baseUrl, '/') . '/',
            '{EXTERNAL_ISSUE_IDENTIFIER}' => $issueIdentifier,
        ]);
        return $resolvedUrl;
    }

    public function getResultKey(): string
    {
        return $this->resultKey;
    }

    public function getResultValue(): string
    {
        return $this->resultValue;
    }

    public function getIssueIdentifier(): string
    {
        return $this->issueIdentifier;
    }

    public function getKimaiUsername(): string
    {
        /** @var User $user */
        $user = $this->security->getUser();
        return $user->getUserIdentifier();
    }
}

[![REUSE status](https://api.reuse.software/badge/github.com/SAP/ai-assisted-github-actions)](https://api.reuse.software/info/github.com/SAP/ai-assisted-github-actions)

# AI-assisted GitHub Actions

_Automate your PR workflow with GitHub Actions powered by SAP AI Core. Get instant summaries and reviews—no more manual grunt work._

Hey rudeGPT, review my Pull Request for "AI-assisted GitHub Actions"!

> Using AI to automate PR reviews, huh? Sounds like a bunch of nerds got tired of doing their jobs and decided to make a robot do it. But hey, if it works, it works. Just don't come crying to me when Skynet takes over and your precious AI starts rejecting all your PRs...

## Available Actions

The following GitHub Actions are available to assist with pull requests:

- **[Pull Request Summary](pr-summary)**  
  This action calls SAP AI Core to create a comment with a summary of the pull request.  
  Usage: `SAP/ai-assisted-github-actions/pr-summary@v3`
- **[Pull Request Review](pr-review)**  
  This action calls SAP AI Core to create a review of the pull request (as comment).  
  Usage: `SAP/ai-assisted-github-actions/pr-review@v3`

These actions access [models available via _SAP AI Core Orchestration_ service](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/model-configuration).

## Requirements and Setup

To get started, you'll need to configure both _GitHub Actions_ and _SAP AI Core_.

1.  Activate **[GitHub Actions](https://github.com/features/actions)** for your repo

2.  Create **[SAP AI Core Deployment for Orchestration](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core)** and get your service key.

3.  Store the full service key in a [GitHub secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository) (e.g., `AICORE_SERVICE_KEY`).

    <details>
       <summary>The service key looks like this (click to expand)</summary>

    ```json
    {
      "serviceurls": {
        "AI_API_URL": "..."
      },
      "appname": "...",
      "clientid": "...",
      "clientsecret": "...",
      "identityzone": "...",
      "identityzoneid": "...",
      "url": "..."
    }
    ```

    </details>

4.  Create a [workflow file](https://docs.github.com/de/actions/get-started/quickstart) in your repository with a workflow configuration that uses this action.

## Usage

Create a GitHub Actions workflow file e.g., `.github/workflows/ai-assistance.yml`, with the following content:

```yaml
name: AI-assisted
on:
  pull_request:
    types: [ready_for_review]

jobs:
  summary:
    name: PR Summary
    runs-on: [ubuntu-latest]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-summary@v3
        with:
          aicore-service-key: ${{ secrets.AICORE_SERVICE_KEY }}
          model: gpt-4o
          exclude-files: package-lock.json
  review:
    name: PR Review
    runs-on: [ubuntu-latest]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-review@v3
        with:
          aicore-service-key: ${{ secrets.AICORE_SERVICE_KEY }}
          model: gpt-4o
          exclude-files: package-lock.json
```

This action will be executed when a
[pull request review is ready for review](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request). It will create a
summary of the pull request as a comment as well as a pull request review.

- The `aicore-service-key` should be a valid service key for your _SAP AI Core_ service instance.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/SAP/ai-assisted-github-actions/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Security / Disclosure

If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/SAP/ai-assisted-github-actions/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/SAP/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright 2025 SAP SE or an SAP affiliate company and ai-assisted-github-actions contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/SAP/ai-assisted-github-actions).

---

> Remember, no AI can replace the keen eye of a seasoned developer... yet.

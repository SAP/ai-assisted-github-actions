# AI-assisted GitHub Actions for Pull-Request Reviews

_Elevate your GitHub workflow with AI-driven, concise pull request reviews. Save time, improve code quality, and enhance team collaboration effortlessly._

This GitHub Action will generate an AI-created review of a pull request, pull request review comment, offering general feedback without explicitly approving or requesting changes.
Please note that any predictions made by the AI should be taken as suggestions and not facts. You are not obligated to use AI-based recommendations; using this feature is completely optional and voluntary. This action will never approve or request changes on the pull request.

### How It Works

1. The action captures the diff (added, removed, and modified content) of a pull request.
2. This diff is sent to the _SAP AI Core_ service, which employs a [generative AI model](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/model-configuration) to create review comments.
3. The review is then posted as a pull request review in GitHub.

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

To include this action in a workflow, use the following syntax:

```yaml
uses: SAP/ai-assisted-github-actions/pr-review@v3
```

### Minimal Example

Create a file `.github/workflows/ai-assistance.yml` with the content below:

```yaml
name: AI-assisted
on:
  pull_request:
    types: [ready_for_review]

jobs:
  review:
    name: PR Review
    runs-on: [solinas]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-review@v3
        with:
          aicore-service-key: ${{ secrets.AICORE_SERVICE_KEY }}
```

This example triggers the action when a pull request transitions from _draft_ to _ready for review_.

> **Note**: Here, the workflow trigger event is `ready_for_review` needs an explicit status transition from _draft_ to _ready to review_ in a PR. Just creating a PR (which is already in _ready-to-review_ status) won't be enough to trigger the workflow.
>
> If you click on _convert to draft_ and then click _ready to review_, the workflow should be triggered. Alternatively, you could use a different trigger that [looks for a specific user that is requested for a review](#review-requested-for-specific-user).

It will generate an AI-created [pull request review comment](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews), offering general feedback without explicitly approving or requesting changes. Please note that any predictions made by the AI should be taken as suggestions and not facts. You are not obligated to use AI-based recommendations; using this feature is completely optional and voluntary. This action will never approve or request changes on the pull request.

- The `aicore-service-key` should be a valid service key for your _SAP AI Core_ service instance.
- Since no `user-token` is provided, the action will use the default GitHub token (usually the _github-actions[bot]_ user).

### Parameters

Input parameters for the action:

| Name                         | Description                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aicore-service-key`         | The service key for your _SAP AI Core_ service instance.                                                                                                                                                                                                                                                                             |
| `display-mode`               | Defines where the review will be posted. Default: `review-comment` <ul><li>`review-comment`: Adds a pull request review with comments.</li><li>`review-comment-delta`: Adds a pull request review that includes only the changes since the last comment.</li><li>`none`: No display; the action will not post any comments</li></ul> |
| `user-token`                 | The personal access token of the GitHub user that is used to create the review. <br /> Default: `${{ github.token }}`                                                                                                                                                                                                                |
| `model`                      | The name of the SAP AI Core model that is used to generate the summary. <br /> Default: `gpt-4o`                                                                                                                                                                                                                                     |
| `model-parameters`           | Additional parameters for the model as JSON. For example, `{"temperature": 0.5, "max_tokens": 100}`. <br /> Default: `{}`                                                                                                                                                                                                            |
| `model-version`              | The version of the model that is used to generate the summary. <br /> Default: `latest`                                                                                                                                                                                                                                              |
| `deployment-config`          | The deployment configuration as JSON. For example, {\"resourceGroup\": \"abcdefg\"}. <br /> Default: `{}`                                                                                                                                                                                                                            |
| `show-model-metadata-footer` | Whether to show the model metadata (such as model name and token usage) in the footer of the summary. <br /> Default: `true`                                                                                                                                                                                                         |
| `prompt`                     | The base prompt that is used to generate the review. <br /> Default: See [action.yml](action.yml#L36-L43)                                                                                                                                                                                                                            |
| `prompt-addition`            | The addition to the base prompt that is used to generate the review.                                                                                                                                                                                                                                                                 |
| `disclaimer-prompt`          | The prompt that is used to generate the disclaimer. <br /> Default: See [action.yml](action.yml#L51-L53)                                                                                                                                                                                                                             |
| `header-text`                | Text to be inserted before the review.                                                                                                                                                                                                                                                                                               |
| `footer-text`                | Text to be inserted after the review.                                                                                                                                                                                                                                                                                                |
| `previous-results`           | Define what to do with previous results. Possible values are `keep` or `hide`. <br /> Default: `keep`                                                                                                                                                                                                                                |
| `include-files`              | A list of patterns that match the files of the PR that should be included in the review (comma or newline separated and supports glob patterns). <br /> Default: `**`                                                                                                                                                                |
| `exclude-files`              | A list of patterns that match the files of the PR that should be excluded from the review (comma or newline separated and supports glob patterns). <br /> Default: none                                                                                                                                                              |
| `include-context-files`      | A list of patterns for files that should always be included as context, regardless of whether the PR affects them (comma or newline separated and supports glob patterns). <br /> Default: none                                                                                                                                      |
| `exclude-context-files`      | A list of patterns for files that should be excluded from context, regardless of whether the PR affects them (comma or newline separated and supports glob patterns).                                                                                                                                                                |
| `pr-number`                  | The number of the pull request for which the review should be created. <br /> Default: `${{ github.event.number }}`                                                                                                                                                                                                                  |
| `base-sha`                   | The hash of the commit representing the code before changes. Used as the starting point in comparison.                                                                                                                                                                                                                               |
| `head-sha`                   | The hash of the commit representing the code after changes. Used as the end point in comparison.                                                                                                                                                                                                                                     |
| `owner`                      | The owner of the repository for which the review should be created. <br /> Default: `${{ github.repository_owner }}`                                                                                                                                                                                                                 |
| `repo`                       | The name of the repository for which the review should be created. <br /> Default: `${{ github.event.repository.name }}`                                                                                                                                                                                                             |
| `github-api-url`             | The GitHub base URL will be automatically set to the correct value from the GitHub context variable. If you want to override this, you can do so here (not recommended). <br /> Default: `${{ github.api_url }}`                                                                                                                     |

Output parameters for the action:

| Name       | Description                             |
| ---------- | --------------------------------------- |
| `comments` | An array of review comments for the PR. |
| `reviewId` | The ID of the created GitHub PR review. |
| `review`   | The created GitHub PR review.           |

## Advanced Examples

### Trigger on review request

Execute the action when a [pull request review is requested](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request) for a specific user:

```yaml
name: AI-assisted
on:
  pull_request:
    types: [review_requested]

jobs:
  review:
    name: PR Review
    if: github.event.requested_reviewer.login == 'my-orgs-serviceuser'
    runs-on: [solinas]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-review@v3
        with:
          user-token: ${{ secrets.MY_ORGS_SERVICE_USER_TOKEN }}
          aicore-service-key: ${{ secrets.AICORE_SERVICE_KEY }}
```

- The `if` condition is used to filter the review requests to a specific user (e.g., `my-orgs-serviceuser`).
- The `user-token` is the [GitHub personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) of the user who will create the review and should match the user token of the user specified in the `if` condition.
- The `aicore-service-key` should be a valid service key for your _SAP AI Core_ service instance.
  Tip: You can use a [CODEOWNERS file](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) to automatically assign reviewers. E.g., if you have a file `.github/CODEOWNERS` with the content `* @my-orgs-serviceuser`, the user `my-orgs-serviceuser` will be automatically assigned as a reviewer if the PR is ready for review. As a result, the action shown above will be executed - you will get an AI-assisted review for each PR that is ready for review automatically.

### Exclude/Include Specific Files

#### Exclude certain files from the review:

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    exclude-files: package-lock.json, *-lock.json
```

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    exclude-files: |
      package-lock.json
      *-lock.json
```

- The pattern provided in `exclude-files` excludes all files with `package-lock.json` and `*-lock.json` in the name.

#### Include only specific files in the review:

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    include-files: "**/*.ts, **/*.js"
```

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    include-files: |
      **/*.ts
      **/*.js
```

- The pattern provided in `include-files` includes all files with `.ts` and `.js` extensions.

### Exclude Specific Actors

Prevent the action from being triggered by specific actors like bots:

```yaml
jobs:
  review:
    name: PR Review
    if: github.actor != 'ospo-renovate[bot]'
    runs-on: [solinas]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-review@v3
        with:
```

- The `if` [condition](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/using-conditions-to-control-job-execution) makes sure the step only runs if it's not started by the [`ospo-renovate[bot]`](https://github.tools.sap/github-apps/ospo-renovate) user. Otherwise, the job will be marked as skipped.

### Influence the Display Mode

#### Add a header or footer:

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    header-text: |
      # AI-Assisted Review
    footer-text: |
      ---
      Generated by AI
```

- The `header-text` parameter can be set to a custom text that will be inserted before the review.
- The `footer-text` parameter can be set to a custom text that will be inserted after the review.
- The `disclaimer-prompt` parameter can be set to a custom prompt that will be used to generate the disclaimer.

#### Utilize output for further actions

```yaml
jobs:
  review-and-review:
    name: PR Review & Review
    runs-on: [solinas]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-summary@v3
        id: review
        with:
          aicore-service-key: ${{ secrets.AICORE_SERVICE_KEY }}
          display-mode: none
      - uses: SAP/ai-assisted-github-actions/pr-review@v3
        with:
          aicore-service-key: ${{ secrets.AICORE_SERVICE_KEY }}
          header-text: |
            ## AI Review
            ${{ steps.review.outputs.displayText }}
            ---
```

- The `display-mode` parameter is set to `none` to prevent the summary from being displayed.
- The `displayText` output parameter is used to pass the summary to the review action as `header-text`.

### Custom AI Model or Prompt

#### Specify a custom AI model:

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    model: gpt-4o-mini
```

- The `model` parameter can be set to the executable ID of the [available generative AI models](https://me.sap.com/notes/3437766/E).

#### Extend or customize the prompt:

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    prompt-addition: |
      Feel free to use emojis where relevant.
```

- The `prompt-addition` parameter can be set to a custom prompt that will be appended to the base prompt.

#### Create a fully custom prompt:

```yaml
- uses: SAP/ai-assisted-github-actions/pr-review@v3
  with:
    prompt: |
      Create a review of the pull request.
      Focus on readability, maintainability, and performance.
```

#### Change the role of the AI to a documentation reviewer:

```yaml
name: AI-assisted
on:
  pull_request:
    types: [ready_for_review]

jobs:
  review:
    name: PR Review
    runs-on: [solinas]
    steps:
      - uses: SAP/ai-assisted-github-actions/pr-review@v3
        with:
          include-files: *.md
          prompt: |
            As an AI bot reviewing documentation pull requests on GitHub, please focus on the following areas to ensure high-quality and effective documentation:
            Check for spelling errors in English and provide corrections.
            Identify and correct grammatical errors and incorrect punctuation.
            Provide suggestions for improving the clarity and conciseness of the text to make it more understandable.
```

- The `include-files` parameter only includes files with the `.md` (Markdown) extension.
- The `prompt` parameter is set to a custom prompt so we can generate a specific review for the documentation files.

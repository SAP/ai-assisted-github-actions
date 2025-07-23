/**
 * The configuration for the action.
 */
export declare const config: {
    /** The personal access token of the GitHub user that is used to create the summary */
    userToken: string;
    /** The URL for GitHub REST API */
    githubApiUrl: string;
    /** The owner of the repository for which the summary should be created. */
    owner: string;
    /** The name of the repository for which the summary should be created. */
    repo: string;
    /** The number of the pull request for which the summary should be created. */
    prNumber: number;
    /** The hash of the commit representing the code before changes. Used as the starting point in comparison. */
    baseSha: string;
    /** The hash of the commit representing the code after changes. Used as the end point in comparison. */
    headSha: string;
    /** The service key for your SAP AI Core service instance. */
    aicoreServiceKey: {
        [x: string]: any;
        clientid: string;
        clientsecret: string;
        serviceurls: {
            [x: string]: any;
            AI_API_URL: string;
        };
        url: string;
    };
    /** A list of patterns that match the files that should be included in the summary. */
    includeFiles: string[];
    /** A list of patterns that match the files that should be excluded from the summary. */
    excludeFiles: string[];
    /** A list of patterns for files that should always be included as context, regardless of whether the PR affects them. */
    includeContextFiles: string[];
    /** A list of patterns for files that should be excluded from context, regardless of whether the PR affects them. */
    excludeContextFiles: string[];
    /** The name of the SAP AI Core model that is used to generate the summary. */
    model: import("@sap-ai-sdk/orchestration").ChatModel;
    /** Additional parameters for the model as JSON. For example, {"temperature": 0.5, "max_tokens": 100}. */
    modelParameters: import("@sap-ai-sdk/orchestration").LlmModelParams;
    /** The version of the model that is used to generate the summary. */
    modelVersion: string;
    /** The deployment configuration as JSON. For example, {"resourceGroup": "abcdefg"}. */
    deploymentConfig: import("@sap-ai-sdk/ai-api").ResourceGroupConfig;
    /** Whether to show the model metadata in the footer of the summary. */
    showModelMetadataFooter: boolean;
    /** The base prompt that is used to generate the summary. */
    prompt: string;
    /** The text that is placed before the summary. */
    headerText: string;
    /** The text that is placed after the summary. */
    footerText: string;
    /** The action to take with previous results. */
    previousResults: "keep" | "hide" | "delete";
    /** Additional prompt text that is added to the base prompt. */
    promptAddition: string;
    /** Defines where the summary will be posted. */
    displayMode: "comment" | "comment-delta" | "append" | "none";
};
export type Config = typeof config;

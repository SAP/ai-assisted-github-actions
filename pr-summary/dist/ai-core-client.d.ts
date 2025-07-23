import { ChatMessage } from "@sap-ai-sdk/orchestration";
export declare function getModelName(): string;
export declare function getPromptTokens(): number;
export declare function getCompletionTokens(): number;
export declare function chatCompletion(messages: ChatMessage[]): Promise<string>;

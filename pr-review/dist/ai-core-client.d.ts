import { ChatMessage } from "@sap-ai-sdk/orchestration";
import { z } from "zod";
export declare function getModelName(): string;
export declare function getPromptTokens(): number;
export declare function getCompletionTokens(): number;
/**
 * Create a simple chat completion.
 */
export declare function chatCompletion(messages: ChatMessage[]): Promise<string>;
/**
 * Create a chat completion that returns a JSON document with a given schema.
 */
export declare function chatCompletionWithJsonSchema<T extends z.ZodTypeAny>(zodSchema: T, messages: ChatMessage[]): Promise<z.infer<T>>;

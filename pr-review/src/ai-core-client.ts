import * as core from "@actions/core"
import { ChatMessage, OrchestrationClient, TokenUsage } from "@sap-ai-sdk/orchestration"
import axios from "axios"
import { inspect } from "node:util"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import { config } from "./config.js"

let modelName = config.model
let promptTokens = 0
let completionTokens = 0

export function getModelName(): string {
  return modelName
}

export function getPromptTokens(): number {
  return promptTokens
}

export function getCompletionTokens(): number {
  return completionTokens
}

/**
 * Create a simple chat completion.
 */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  process.env.AICORE_SERVICE_KEY = JSON.stringify(config.aicoreServiceKey)
  try {
    core.info("Use the OrchestrationClient to call the model")
    const orchestrationClient = new OrchestrationClient(
      {
        llm: {
          model_name: config.model,
          model_params: config.modelParameters,
          model_version: config.modelVersion,
        },
        templating: {
          template: messages,
        },
      },
      config.deploymentConfig,
    )
    const completion = await orchestrationClient.chatCompletion()
    core.info(inspect(completion.data, { depth: undefined, colors: true }))

    modelName = (completion.data?.module_results?.llm?.model_name as string) ?? modelName
    const tokenUsage: TokenUsage = completion.getTokenUsage()
    promptTokens += tokenUsage.prompt_tokens
    completionTokens += tokenUsage.completion_tokens

    return completion.getContent()!
  } catch (error) {
    core.error(getErrorMessage(error))
    core.error(error as Error)
    throw error
  }
}

/**
 * Create a chat completion that returns a JSON document with a given schema.
 */
export async function chatCompletionWithJsonSchema<T extends z.ZodTypeAny>(zodSchema: T, messages: ChatMessage[]): Promise<z.infer<T>> {
  process.env.AICORE_SERVICE_KEY = JSON.stringify(config.aicoreServiceKey)
  const jsonSchema = zodToJsonSchema(zodSchema)

  let responseJson
  try {
    core.info("Use the OrchestrationClient to call the model")
    const orchestrationClient = new OrchestrationClient({
      llm: {
        model_name: config.model,
        model_params: config.modelParameters,
        model_version: config.modelVersion,
      },
      templating: {
        template: [
          ...messages,
          {
            role: "user",
            content: `Always return a plain JSON document with the following schema:\n\n ${JSON.stringify(jsonSchema, undefined, 2)} `,
          },
        ],
      },
    })
    const completion = await orchestrationClient.chatCompletion()
    core.info(inspect(completion.rawResponse.data, { depth: undefined, colors: true }))
    responseJson = `${completion.getContent()}`

    modelName = (completion.data?.module_results?.llm?.model_name as string) ?? modelName
    const tokenUsage: TokenUsage = completion.getTokenUsage()
    promptTokens += tokenUsage.prompt_tokens
    completionTokens += tokenUsage.completion_tokens
  } catch (error) {
    core.error(getErrorMessage(error))
    core.error(error as Error)
    throw error
  }

  core.startGroup("Parse the JSON document with the given schema")
  core.info(responseJson)
  responseJson = responseJson.slice(responseJson.indexOf("{"), responseJson.lastIndexOf("}") + 1)
  try {
    return zodSchema.parse(JSON.parse(responseJson)) // eslint-disable-line @typescript-eslint/no-unsafe-return
  } catch (error) {
    if (error instanceof Error) core.warning(`Failed to parse JSON. Trying to replace newlines. Error was: ${error.message}`)
    const json = responseJson.replaceAll(/"(?:[^"\\]|\\.)*"/g, matched => matched.replaceAll("\n", String.raw`\n`))
    return zodSchema.parse(JSON.parse(json)) // eslint-disable-line @typescript-eslint/no-unsafe-return
  }
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const message: string = error.response?.data?.error?.message ?? error.response?.data?.message ?? error.message
    return message
  }
  if (error instanceof Error) {
    return axios.isAxiosError(error.cause) ? getErrorMessage(error.cause) : error.message
  }
  return String(error)
}

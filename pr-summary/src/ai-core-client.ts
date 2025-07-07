import * as core from "@actions/core"
import { ChatMessage, OrchestrationClient, TokenUsage } from "@sap-ai-sdk/orchestration"
import axios from "axios"
import { inspect } from "node:util"
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

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  process.env.AICORE_SERVICE_KEY = JSON.stringify(config.aicoreServiceKey)
  try {
    core.info("Call OrchestrationClient")
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

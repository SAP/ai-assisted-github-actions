/* eslint-disable @typescript-eslint/no-redeclare */
import { ResourceGroupConfig } from "@sap-ai-sdk/ai-api"
import { ChatModel, LlmModelParams } from "@sap-ai-sdk/orchestration"
import { z, ZodType } from "zod"

// ServiceKey
export const ServiceKey = z
  .object({
    clientid: z.string(),
    clientsecret: z.string(),
    serviceurls: z
      .object({
        AI_API_URL: z.string(),
      })
      .catchall(z.any()),
    url: z.string(),
  })
  .catchall(z.any())
export type ServiceKey = z.infer<typeof ServiceKey>

// ServiceKeyOrCredentials
export const ServiceKeyOrCredentials = z.union([
  ServiceKey,
  z.object({
    credentials: ServiceKey,
  }),
])
export type ServiceKeyOrCredentials = z.infer<typeof ServiceKeyOrCredentials>

// ModelName
export const ModelName: ZodType<ChatModel> = z.string()
export type ModelName = z.infer<typeof ModelName>

// DeploymentConfig
export const DeploymentConfig: ZodType<ResourceGroupConfig> = z.record(z.any())
export type DeploymentConfig = z.infer<typeof DeploymentConfig>

// ModelParameters
export const ModelParameters: ZodType<LlmModelParams> = z.record(z.any())
export type ModelParameters = z.infer<typeof ModelParameters>

import * as core from "@actions/core"
import { readFileSync } from "node:fs"
import { parse } from "yaml"
import { z } from "zod"
import { DeploymentConfig, ModelName, ModelParameters, ServiceKey, ServiceKeyOrCredentials } from "./zod-schema.js"

if (process.env.NODE_ENV === "development") {
  // evil hack to support core input names with hypens
  Object.entries(process.env)
    .filter(([key]) => key.startsWith("INPUT_"))
    .forEach(([key, value]) => {
      process.env[key.replace(/^INPUT_(.*)$/, (_, p1: string) => `INPUT_${p1.replace(/_/g, "-")}`)] = value
    })

  // read action.yml and set default values for inputs
  const actionYaml = parse(readFileSync("./action.yml", "utf8")) as { inputs: { default: string }[] }
  // eslint-disable-next-line @typescript-eslint/no-for-in-array
  for (const key in actionYaml.inputs) {
    const envKey = `INPUT_${key.toUpperCase()}`
    const envValue = actionYaml.inputs[key]?.default
    if (envValue && !Object.keys(process.env).includes(envKey)) {
      process.env[envKey] = envValue
    }
  }
}

function parseInput<T extends z.ZodTypeAny>(zodSchema: T, name: string): z.infer<T> {
  const value: string = core.getInput(name)
  try {
    return zodSchema.parse(value)
  } catch (error) {
    if (error instanceof Error) {
      core.error(`Failed to parse input "${name}": \`${value}\``)
      core.error(error)
    }
    throw error
  }
}

function parseInputAsJson<T extends z.ZodTypeAny>(zodSchema: T, name: string): z.infer<T> {
  const json: string = core.getInput(name)
  try {
    return zodSchema.parse(JSON.parse(json))
  } catch (error) {
    if (error instanceof Error) {
      core.error(`Failed to parse input "${name}": \`${json}\``)
      core.error(error)
    }
    throw error
  }
}

function parseInputAsArray<T extends z.ZodTypeAny>(zodSchema: T, name: string): z.infer<T>[] {
  return core
    .getInput(name)
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => zodSchema.parse(v) as z.infer<T>)
}

function setSecret<T>(value: T): T {
  if (typeof value === "object" && value) {
    Object.values(value)
      .filter(v => typeof v === "string" || typeof v === "object")
      .forEach(v => setSecret(v)) // eslint-disable-line @typescript-eslint/no-unsafe-return
  } else if (value) core.setSecret(value.toString())
  return value
}

/**
 * The configuration for the action.
 */
export const config = {
  /** The personal access token of the GitHub user that is used to create the summary */
  userToken: setSecret(parseInput(z.coerce.string(), "user-token")),

  /** The URL for GitHub REST API */
  githubApiUrl: parseInput(z.coerce.string(), "github-api-url"),

  /** The owner of the repository for which the summary should be created. */
  owner: parseInput(z.coerce.string(), "owner"),

  /** The name of the repository for which the summary should be created. */
  repo: parseInput(z.coerce.string(), "repo"),

  /** The number of the pull request for which the summary should be created. */
  prNumber: parseInput(z.coerce.number(), "pr-number"),

  /** The hash of the commit representing the code before changes. Used as the starting point in comparison. */
  baseSha: parseInput(z.coerce.string(), "base-sha"),

  /** The hash of the commit representing the code after changes. Used as the end point in comparison. */
  headSha: parseInput(z.coerce.string(), "head-sha"),

  /** The service key for your SAP AI Core service instance. */
  aicoreServiceKey: ((): ServiceKey => {
    // workaround if the key is wrapped into a credentials property
    const serviceKeyOrCredentials = parseInputAsJson(ServiceKeyOrCredentials, "aicore-service-key")
    const serviceKey: ServiceKey = (serviceKeyOrCredentials.credentials as ServiceKey) ?? serviceKeyOrCredentials
    return setSecret(serviceKey)
  })(),

  /** A list of patterns that match the files that should be included in the summary. */
  includeFiles: parseInputAsArray(z.coerce.string(), "include-files"),

  /** A list of patterns that match the files that should be excluded from the summary. */
  excludeFiles: parseInputAsArray(z.coerce.string(), "exclude-files"),

  /** A list of patterns for files that should always be included as context, regardless of whether the PR affects them. */
  includeContextFiles: parseInputAsArray(z.coerce.string(), "include-context-files"),

  /** A list of patterns for files that should be excluded from context, regardless of whether the PR affects them. */
  excludeContextFiles: parseInputAsArray(z.coerce.string(), "exclude-context-files"),

  /** The name of the SAP AI Core model that is used to generate the summary. */
  model: parseInput(ModelName, "model"),

  /** Additional parameters for the model as JSON. For example, {"temperature": 0.5, "max_tokens": 100}. */
  modelParameters: parseInputAsJson(ModelParameters, "model-parameters"),

  /** The version of the model that is used to generate the summary. */
  modelVersion: parseInput(z.coerce.string(), "model-version"),

  /** The deployment configuration as JSON. For example, {"resourceGroup": "abcdefg"}. */
  deploymentConfig: parseInputAsJson(DeploymentConfig, "deployment-config"),

  /** Whether to show the model metadata in the footer of the summary. */
  showModelMetadataFooter: parseInput(z.coerce.boolean(), "show-model-metadata-footer"),

  /** The base prompt that is used to generate the summary. */
  prompt: parseInput(z.coerce.string(), "prompt"),

  /** The text that is placed before the summary. */
  headerText: parseInput(z.coerce.string(), "header-text"),

  /** The text that is placed after the summary. */
  footerText: parseInput(z.coerce.string(), "footer-text"),

  /** The action to take with previous results. */
  previousResults: parseInput(z.enum(["keep", "hide", "delete"]), "previous-results"),

  /** Additional prompt text that is added to the base prompt. */
  promptAddition: parseInput(z.coerce.string(), "prompt-addition"),

  /** Defines where the summary will be posted. */
  displayMode: parseInput(z.enum(["comment", "comment-delta", "append", "none"]), "display-mode"),
}
export type Config = typeof config

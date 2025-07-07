import * as core from "@actions/core"
import * as github from "@actions/github"
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types.js"
import { retry } from "@octokit/plugin-retry"
import { throttling, ThrottlingOptions } from "@octokit/plugin-throttling"
import { ChatMessage } from "@sap-ai-sdk/orchestration"
import { minimatch, MinimatchOptions } from "minimatch"
import { inspect } from "node:util"
import parseDiff, { Chunk, File } from "parse-diff"
import * as aiCoreClient from "./ai-core-client.js"
import { Config } from "./config.js"
import { helpAIwithHunksInDiff, resolveHunkReferencesInComments } from "./hunk-reader.js"
import { AiReview } from "./review.js"

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function run(config: Config): Promise<void> {
  const markerStart = "<!-- ai-assisted-review-start -->"
  const markerEnd = "<!-- ai-assisted-review-end -->"

  core.startGroup("Create GitHub API & AI Core client")
  core.info(`Using the following configuration: ${inspect(config, { depth: undefined, colors: true })}`)

  const throttlingOptions: ThrottlingOptions = { onSecondaryRateLimit: () => true, onRateLimit: () => true }
  const octokit = github.getOctokit(config.userToken, { baseUrl: config.githubApiUrl, throttle: throttlingOptions }, throttling, retry)
  const matchOptions: MinimatchOptions = { dot: true, nocase: true }
  const repoRef = { owner: config.owner, repo: config.repo }

  core.info(`Get PR #${config.prNumber} from ${repoRef.owner}/${repoRef.repo}`)
  const { data: pullRequest } = await octokit.rest.pulls.get({ ...repoRef, pull_number: config.prNumber })
  core.info(inspect(pullRequest, { depth: undefined, colors: true }))

  const content: string[] = []

  let base = config.baseSha || pullRequest.base.sha
  const head = config.headSha || pullRequest.head.sha
  if (config.displayMode === "review-comment-delta") {
    core.info(`Searching for preceding review comments to set old head SHA as new base SHA`)
    const previousReviews = await octokit.paginate(octokit.rest.pulls.listReviews, { ...repoRef, pull_number: config.prNumber })
    const regex = new RegExp(`^${markerStart}\\s+<!-- (?<base>\\w+)\\.\\.\\.(?<head>\\w+) -->([\\s\\S]*?)${markerEnd}$`, "g")
    previousReviews.forEach(comment => {
      ;[...(comment.body?.matchAll(regex) ?? [])].forEach(match => {
        const commentBase = match.groups!.base
        const commentHead = match.groups!.head
        if (commentHead) base = commentHead !== head ? commentHead : commentBase
      })
    })
  }

  core.startGroup(`Preprocess PR diff/patch to help the model understand the changes`)
  core.info(`Get diff for PR #${config.prNumber} (${base}...${head})`)
  const processedFiles: File[] = []
  const { data: diff } = await octokit.rest.repos.compareCommits({ ...repoRef, base: pullRequest.base.sha, head, mediaType: { format: "diff" } })
  let comparison = parseDiff(diff as unknown as string)

  if (config.displayMode === "review-comment-delta" && base !== pullRequest.base.sha) {
    core.info("Looking for chunks already reviewed in previous review to remove them from the diff")
    const { data: previousDiff } = await octokit.rest.repos.compareCommits({ ...repoRef, base: pullRequest.base.sha, head: base, mediaType: { format: "diff" } })
    const previousComparison = parseDiff(previousDiff as unknown as string)
    const createPatch = (hunk: Chunk) => hunk.changes.map(c => c.content).join("\n")
    comparison.forEach(file => {
      const previousFile = previousComparison.find(f => f.from === file.from && f.to === file.to)
      if (previousFile) {
        file.chunks = file.chunks.filter(hunk => !previousFile?.chunks.some(previousHunk => createPatch(hunk) === createPatch(previousHunk)))
      }
    })
    comparison = comparison.filter(file => file.chunks.length > 0)
  }

  comparison.forEach(file => {
    const fileName = file.from === file.to ? file.from : `${file.from} → ${file.to}`
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (!config.includeFiles.some(pattern => (file.from && minimatch(file.from, pattern, matchOptions)) || (file.to && minimatch(file.to, pattern, matchOptions)))) {
      core.info(`Skipping ${fileName} (not included).`)
    } else if (config.excludeFiles.some(pattern => file.to && minimatch(file.to, pattern, matchOptions))) {
      core.info(`Skipping ${fileName} (is excluded).`)
    } else if (!file.chunks?.length) {
      core.info(`Skipping ${fileName} (has no patch).`)
    } else {
      core.info(`Reading diff/patch of ${fileName}.`)
      const preprocessedDiff = helpAIwithHunksInDiff(file)
      processedFiles.push(file)
      content.push(preprocessedDiff)
    }
  })
  if (content.length === 0) {
    core.info("No diff/patch to process.")
    return
  }
  core.info(content.join("\n"))

  if (config.includeContextFiles.length > 0) {
    core.startGroup(`Get static files for PR`)
    const {
      data: { tree },
    } = await octokit.rest.git.getTree({ ...repoRef, tree_sha: pullRequest.head.sha, recursive: "true" })
    // eslint-disable-next-line no-restricted-syntax
    for (const file of tree) {
      if (file.path && file.sha && config.includeContextFiles.some(pattern => minimatch(file.path!, pattern, matchOptions))) {
        if (config.excludeContextFiles.some(pattern => minimatch(file.path!, pattern, matchOptions))) {
          core.info(`Skipping context file ${file.path} (is excluded).`)
        } else {
          core.info(`Reading context file ${file.path}`)
          // eslint-disable-next-line no-await-in-loop
          const { data: blob } = await octokit.rest.git.getBlob({ ...repoRef, file_sha: file.sha, mediaType: { format: "raw" } })
          const result = [`Context file ${file.path}:`, "```", blob as unknown as string, "```", ""]
          core.info(result.join("\n"))
          content.push(...result)
        }
      }
    }
  }

  core.startGroup(`Ask LLM for review based on the diff/patch of the PR`)
  const message: ChatMessage[] = [
    { role: "system", content: `${config.prompt}\n${config.promptAddition}` },
    { role: "user", content: content.join("\n") },
  ]
  core.info(inspect(message, { depth: undefined, colors: true }))
  const aiReview: AiReview = await aiCoreClient.chatCompletionWithJsonSchema(AiReview, message)
  core.info(inspect(aiReview, { depth: undefined, colors: true }))

  core.startGroup(`Process the chat completion to create PR review comments`)
  const comments = resolveHunkReferencesInComments(aiReview.comments, processedFiles)
  core.info(inspect(comments, { depth: undefined, colors: true }))
  core.setOutput("comments", comments)
  if (comments.length === 0) {
    core.info("No comments to post.")
    return
  }

  switch (config.displayMode) {
    case "review-comment":
    case "review-comment-delta": {
      if (config.previousResults === "hide") {
        core.startGroup("Process previous reviews.")
        const previousReviews = await octokit.paginate(octokit.rest.pulls.listReviews, { ...repoRef, pull_number: config.prNumber })
        const regex = new RegExp(`^${markerStart}([\\s\\S]*?)${markerEnd}$`, "g")
        await Promise.all(
          previousReviews.map(async review => {
            if (regex.test(review.body)) {
              core.info(`Minimizing review ${review.id}`)
              await octokit.graphql(`mutation { minimizeComment(input: {classifier: OUTDATED, subjectId: "${review.node_id}"}) { minimizedComment { isMinimized } } }`)
            }
          }),
        )
      }

      core.startGroup(`Ask LLM for a disclaimer text to add to the review description`)
      const disclaimer = await aiCoreClient.chatCompletion([{ role: "user", content: config.disclaimerPrompt }])
      core.info(inspect(disclaimer, { depth: undefined, colors: true }))
      core.setOutput("disclaimer", disclaimer)

      core.startGroup(`Create a PR review as comment with the generated comments`)
      const baseheadMaker = `<!-- ${base}...${head} -->`
      const header = config.headerText ? `${config.headerText}\n` : ""
      const footer = config.footerText ? `\n${config.footerText}` : ""
      const metadata = [
        `Model: ${aiCoreClient.getModelName()}`,
        `Prompt Tokens: ${aiCoreClient.getPromptTokens()}`,
        `Completion Tokens: ${aiCoreClient.getCompletionTokens()}`,
        base !== pullRequest.base.sha || head !== pullRequest.head.sha ? `Diff Range: ${base.slice(0, 7)}...${head.slice(0, 7)}` : "",
      ]
      const modelMetadataFooter = config.showModelMetadataFooter ? `<sub>${metadata.filter(Boolean).join(" | ")}</sub>` : ""
      const displayText = [markerStart, baseheadMaker, header, disclaimer, footer, modelMetadataFooter, markerEnd].filter(Boolean).join("\n")

      type CreateReviewParameter = RestEndpointMethodTypes["pulls"]["createReview"]["parameters"]
      const review: CreateReviewParameter = { ...repoRef, pull_number: config.prNumber, commit_id: head, event: "COMMENT", body: displayText, comments }
      core.info(inspect(review, { depth: undefined, colors: true }))

      const { data: result } = await octokit.rest.pulls.createReview(review)
      core.info(inspect(result, { depth: undefined, colors: true }))
      core.setOutput("reviewId", result.id)
      core.setOutput("review", result)

      break
    }
    case "none": {
      core.info("Skipping display.")
      break
    }
    default: {
      throw new Error(`Invalid display mode: ${String(config.displayMode)}`)
    }
  }
}

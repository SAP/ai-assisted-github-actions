import * as core from "@actions/core"
import * as github from "@actions/github"
import { retry } from "@octokit/plugin-retry"
import { throttling, ThrottlingOptions } from "@octokit/plugin-throttling"
import { ChatMessage } from "@sap-ai-sdk/orchestration"
import { minimatch, MinimatchOptions } from "minimatch"
import { inspect } from "node:util"
import parseDiff from "parse-diff"
import * as aiCoreClient from "./ai-core-client.js"
import { Config } from "./config.js"

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function run(config: Config): Promise<void> {
  const markerStart = "<!-- ai-assisted-summary-start -->"
  const markerEnd = "<!-- ai-assisted-summary-end -->"

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
  if (config.displayMode === "comment-delta") {
    core.info(`Searching for preceding comments to set old head SHA as new base SHA`)
    const comments = await octokit.paginate(octokit.rest.issues.listComments, { ...repoRef, issue_number: config.prNumber })
    const regex = new RegExp(`^${markerStart}\\s+<!-- (?<base>\\w+)\\.\\.\\.(?<head>\\w+) -->([\\s\\S]*?)${markerEnd}$`, "g")
    comments.forEach(comment => {
      ;[...(comment.body?.matchAll(regex) ?? [])].forEach(match => {
        const commentBase = match.groups!.base
        const commentHead = match.groups!.head
        if (commentHead) base = commentHead !== head ? commentHead : commentBase
      })
    })
  }

  core.info(`Get diff for PR #${config.prNumber} (${base}...${head})`)
  const { data: diff } = await octokit.rest.repos.compareCommits({ ...repoRef, base, head, mediaType: { format: "diff" } })
  const comparison = parseDiff(diff as unknown as string)

  comparison.forEach(file => {
    const fileName = file.from === file.to ? file.from : `${file.from} → ${file.to}`
    const fileStatus = file.deleted ? "deleted" : file.new ? "added" : file.from !== file.to ? "renamed" : "modified" // eslint-disable-line sonarjs/no-nested-conditional
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (!config.includeFiles.some(pattern => (file.from && minimatch(file.from, pattern, matchOptions)) || (file.to && minimatch(file.to, pattern, matchOptions)))) {
      core.info(`Skipping ${fileName} (not included).`)
    } else if (config.excludeFiles.some(pattern => file.to && minimatch(file.to, pattern, matchOptions))) {
      core.info(`Skipping ${fileName} (is excluded).`)
    } else if (!file.chunks?.length) {
      core.info(`Skipping ${fileName} (has no patch).`)
    } else {
      core.info(`Reading diff/patch of ${fileName} (${fileStatus}).`)
      const patch = file.chunks.flatMap(chunk => chunk.changes.map(change => change.content)).join("\n")
      content.push("", `# Diff of file \`${file.to}\` (${fileStatus}):`, "```", patch, "```", "")
    }
  })
  if (content.length === 0) {
    core.info("No diff/patch to process.")
    return
  }

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

  core.startGroup("Ask LLM for a summary of the review based on the diff")
  const message: ChatMessage[] = [
    { role: "system", content: `${config.prompt} \n${config.promptAddition}` },
    { role: "user", content: content.join("\n") },
  ]
  core.info(inspect(message, { depth: undefined, colors: true }))
  const summary = await aiCoreClient.chatCompletion(message)
  core.info(inspect(summary, { depth: undefined, colors: true }))

  const baseheadMaker = `<!-- ${base}...${head} -->`
  const header = config.headerText ? `${config.headerText}\n` : ""
  const footer = config.footerText ? `\n${config.footerText}` : ""
  const metadata = [
    `Model: ${aiCoreClient.getModelName()}`,
    `Prompt Tokens: ${aiCoreClient.getPromptTokens()}`,
    `Completion Tokens: ${aiCoreClient.getCompletionTokens()}`,
    base !== pullRequest.base.sha || head !== pullRequest.head.sha ? `Diff Range: ${base.slice(0, 7)}...${head.slice(0, 7)}` : "",
  ]
  const modelMetadataFooter = config.showModelMetadataFooter ? `\n<sub>${metadata.filter(Boolean).join(" | ")}</sub>` : ""
  const displayText = [markerStart, baseheadMaker, header, summary, footer, modelMetadataFooter, markerEnd].filter(Boolean).join("\n")

  switch (config.displayMode) {
    case "append": {
      let updatedBody: string = pullRequest.body ?? ""
      if (config.previousResults === "hide" || config.previousResults === "delete") {
        core.startGroup("Process previous results in PR description")
        if (config.previousResults === "hide") {
          core.info(`Hiding previous summary in PR description`)
          const regex = new RegExp(`(?<!</summary>\\s?)(${markerStart}([\\s\\S]*?)${markerEnd})(?!\\s?</details>)`, "g")
          updatedBody = updatedBody.replace(regex, `<details><summary>This summary has been minimized.</summary>\n$1\n</details>`)
        }
        if (config.previousResults === "delete") {
          core.info(`Deleting previous summary from PR description`)
          core.info(updatedBody)
          const regex = new RegExp(`${markerStart}([\\s\\S]*?)${markerEnd}`, "g")
          updatedBody = updatedBody.replace(regex, "")
        }
      }

      core.startGroup("Append the summary to the PR description")
      updatedBody += `\n\n${displayText}`
      const { data: updatedPr } = await octokit.rest.pulls.update({ ...repoRef, pull_number: config.prNumber, body: updatedBody })
      core.info(inspect(updatedPr, { depth: undefined, colors: true }))
      break
    }
    case "comment":
    case "comment-delta": {
      if (config.previousResults === "hide" || config.previousResults === "delete") {
        core.startGroup("Process previous comments")
        const comments = await octokit.paginate(octokit.rest.issues.listComments, { ...repoRef, issue_number: config.prNumber })
        const regex = new RegExp(`^${markerStart}([\\s\\S]*?)${markerEnd}$`, "g")
        await Promise.all(
          comments.map(async comment => {
            const matches = comment.body?.match(regex)
            if (matches) {
              core.info(`Found previous comment: ${comment.id}`)
              if (config.previousResults === "hide") {
                core.info(`Minimizing comment ${comment.id}`)
                await octokit.graphql(`mutation { minimizeComment(input: {classifier: OUTDATED, subjectId: "${comment.node_id}"}) { minimizedComment { isMinimized } } }`)
              }
              if (config.previousResults === "delete") {
                core.info(`Deleting comment ${comment.id}`)
                core.info(inspect(comment.body, { depth: undefined, colors: true }))
                await octokit.rest.issues.deleteComment({ ...repoRef, comment_id: comment.id })
              }
            }
          }),
        )
      }

      core.startGroup("Create a PR comment with the summary")
      const { data: comment } = await octokit.rest.issues.createComment({ ...repoRef, issue_number: config.prNumber, body: displayText })
      core.info(inspect(comment, { depth: undefined, colors: true }))
      core.setOutput("commentId", comment.id)
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

  core.setOutput("summary", summary)
  core.setOutput("displayText", displayText)
}

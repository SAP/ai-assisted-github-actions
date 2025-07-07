import { z } from "zod"

// define the JSON Schema of a Review by creating a zod object
export const AiReview = z.object({
  comments: z.array(
    z
      .object({
        path: z.string().describe("The path of the file being commented on. For example, assets/css/main.css."),
        comment: z
          .string()
          .describe(
            `Multiline text of the code review comment. For example "You are reading the JSON file synchronously. You could replace it with: \\n\\n\`\`\`javascript\\nconst buffer = await fs.promises.readFile('key.json');\\n\`\`\`"`,
          ),
        start: z.number().describe("The first line number in the diff that the comment applies to. Must be part of the same code snippet as the 'end' line."),
        end: z.number().describe("The last line number in the diff that the comment applies to. Must be part of the same code snippet as the 'start' line."),
      })
      .describe("List of comments on specific code parts."),
  ),
})
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AiReview = z.infer<typeof AiReview>

import { RestEndpointMethodTypes } from "@octokit/action";
import { File } from "parse-diff";
import { AiReview } from "./review.js";
export type ReviewComment = Exclude<RestEndpointMethodTypes["pulls"]["createReview"]["parameters"]["comments"], undefined>[number];
/** Because GitHub comments referencing a diff need to reference lines of the same hunk, we add/collect some metadata to find the corresponding hunk after AI processing */
export declare function helpAIwithHunksInDiff(file: File): string;
/** Map comments from the AI model to GitHub review comments and take care that a comment references only one single hunk */
export declare function resolveHunkReferencesInComments(comments: AiReview["comments"], files: File[]): ReviewComment[];

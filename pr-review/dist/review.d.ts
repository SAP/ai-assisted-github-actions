import { z } from "zod";
export declare const AiReview: z.ZodObject<{
    comments: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        comment: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AiReview = z.infer<typeof AiReview>;

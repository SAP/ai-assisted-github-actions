import { ResourceGroupConfig } from "@sap-ai-sdk/ai-api";
import { ChatModel, LlmModelParams } from "@sap-ai-sdk/orchestration";
import { z, ZodType } from "zod";
export declare const ServiceKey: z.ZodObject<{
    clientid: z.ZodString;
    clientsecret: z.ZodString;
    serviceurls: z.ZodObject<{
        AI_API_URL: z.ZodString;
    }, z.core.$catchall<z.ZodAny>>;
    url: z.ZodString;
}, z.core.$catchall<z.ZodAny>>;
export type ServiceKey = z.infer<typeof ServiceKey>;
export declare const ServiceKeyOrCredentials: z.ZodUnion<readonly [z.ZodObject<{
    clientid: z.ZodString;
    clientsecret: z.ZodString;
    serviceurls: z.ZodObject<{
        AI_API_URL: z.ZodString;
    }, z.core.$catchall<z.ZodAny>>;
    url: z.ZodString;
}, z.core.$catchall<z.ZodAny>>, z.ZodObject<{
    credentials: z.ZodObject<{
        clientid: z.ZodString;
        clientsecret: z.ZodString;
        serviceurls: z.ZodObject<{
            AI_API_URL: z.ZodString;
        }, z.core.$catchall<z.ZodAny>>;
        url: z.ZodString;
    }, z.core.$catchall<z.ZodAny>>;
}, z.core.$strip>]>;
export type ServiceKeyOrCredentials = z.infer<typeof ServiceKeyOrCredentials>;
export declare const ModelName: ZodType<ChatModel>;
export type ModelName = z.infer<typeof ModelName>;
export declare const DeploymentConfig: ZodType<ResourceGroupConfig>;
export type DeploymentConfig = z.infer<typeof DeploymentConfig>;
export declare const ModelParameters: ZodType<LlmModelParams>;
export type ModelParameters = z.infer<typeof ModelParameters>;

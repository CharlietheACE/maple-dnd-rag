export const DEFAULT_DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
export const DEFAULT_DASHSCOPE_CHAT_MODEL = "qwen-plus";
export const DEFAULT_DASHSCOPE_EMBEDDING_MODEL = "text-embedding-v4";
export const DEFAULT_DASHSCOPE_EMBEDDING_DIMENSIONS = 1024;
export type ServerEnv = {
  DASHSCOPE_API_KEY: string;
  DASHSCOPE_BASE_URL: string;
  DASHSCOPE_CHAT_MODEL: string;
  DASHSCOPE_EMBEDDING_MODEL: string;
  DASHSCOPE_EMBEDDING_DIMENSIONS: number;
};
export class ConfigurationError extends Error { readonly code = "NOT_CONFIGURED" as const }
export function readServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  const missing = ["DASHSCOPE_API_KEY"].filter((key) => !env[key]?.trim());
  if (missing.length) throw new ConfigurationError(`Missing server configuration: ${missing.join(", ")}`);
  const dimensionsText = env.DASHSCOPE_EMBEDDING_DIMENSIONS?.trim();
  const dimensions = dimensionsText ? Number(dimensionsText) : DEFAULT_DASHSCOPE_EMBEDDING_DIMENSIONS;
  if (!Number.isInteger(dimensions) || dimensions < 1) throw new ConfigurationError("DASHSCOPE_EMBEDDING_DIMENSIONS must be a positive integer");
  return {
    DASHSCOPE_API_KEY: env.DASHSCOPE_API_KEY!.trim(),
    DASHSCOPE_BASE_URL: env.DASHSCOPE_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_DASHSCOPE_BASE_URL,
    DASHSCOPE_CHAT_MODEL: env.DASHSCOPE_CHAT_MODEL?.trim() || DEFAULT_DASHSCOPE_CHAT_MODEL,
    DASHSCOPE_EMBEDDING_MODEL: env.DASHSCOPE_EMBEDDING_MODEL?.trim() || DEFAULT_DASHSCOPE_EMBEDDING_MODEL,
    DASHSCOPE_EMBEDDING_DIMENSIONS: dimensions,
  };
}

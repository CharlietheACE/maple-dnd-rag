export type ServerEnv = { OPENAI_API_KEY: string; OPENAI_VECTOR_STORE_ID: string };
export class ConfigurationError extends Error { readonly code = "NOT_CONFIGURED" as const }
export function readServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  const missing = ["OPENAI_API_KEY", "OPENAI_VECTOR_STORE_ID"].filter((key) => !env[key]?.trim());
  if (missing.length) throw new ConfigurationError(`Missing server configuration: ${missing.join(", ")}`);
  return { OPENAI_API_KEY: env.OPENAI_API_KEY!.trim(), OPENAI_VECTOR_STORE_ID: env.OPENAI_VECTOR_STORE_ID!.trim() };
}

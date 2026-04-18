import OpenAI from "openai";

export type OpenAIProviderKind = "primary" | "fallback";
export type OpenAIModelRole =
  | "deep"
  | "standard"
  | "overlay"
  | "premium"
  | "embedding"
  | "legacyStructured"
  | "legacyText";

type OpenAIProviderConfig = {
  kind: OpenAIProviderKind;
  name: string;
  apiKey: string;
  baseURL?: string;
};

export type OpenAIProvider = {
  kind: OpenAIProviderKind;
  name: string;
  baseURL?: string;
};

const DEFAULT_MODELS: Record<OpenAIModelRole, string> = {
  deep: "o4-mini",
  standard: "gpt-4o-mini",
  overlay: "gpt-4o",
  premium: "o3",
  embedding: "text-embedding-3-small",
  legacyStructured: "gpt-4-turbo",
  legacyText: "gpt-4-turbo",
};

const MODEL_ENV_SUFFIX: Record<OpenAIModelRole, string> = {
  deep: "DEEP_MODEL",
  standard: "STANDARD_MODEL",
  overlay: "OVERLAY_MODEL",
  premium: "PREMIUM_MODEL",
  embedding: "EMBEDDING_MODEL",
  legacyStructured: "LEGACY_STRUCTURED_MODEL",
  legacyText: "LEGACY_TEXT_MODEL",
};

const clientCache = new Map<string, OpenAI>();

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getProviderConfigs(): OpenAIProviderConfig[] {
  const primaryApiKey = normalizeOptional(process.env.OPENAI_API_KEY);
  const primaryBaseURL = normalizeOptional(process.env.OPENAI_BASE_URL);
  const fallbackApiKey = normalizeOptional(process.env.OPENAI_FALLBACK_API_KEY);
  const fallbackBaseURL = normalizeOptional(process.env.OPENAI_FALLBACK_BASE_URL);

  const configs: OpenAIProviderConfig[] = [];

  if (primaryApiKey) {
    configs.push({
      kind: "primary",
      name: normalizeOptional(process.env.OPENAI_PROVIDER_NAME) ?? "primary",
      apiKey: primaryApiKey,
      baseURL: primaryBaseURL,
    });
  }

  if (fallbackApiKey) {
    configs.push({
      kind: "fallback",
      name: normalizeOptional(process.env.OPENAI_FALLBACK_PROVIDER_NAME) ?? "fallback",
      apiKey: fallbackApiKey,
      baseURL: fallbackBaseURL,
    });
  }

  if (configs.length === 0) {
    throw new Error("Missing OpenAI provider credentials. Set OPENAI_API_KEY or OPENAI_FALLBACK_API_KEY.");
  }

  return configs;
}

function getClient(config: OpenAIProviderConfig): OpenAI {
  const cacheKey = `${config.kind}:${config.baseURL ?? "default"}:${config.apiKey}`;
  const cached = clientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  });

  clientCache.set(cacheKey, client);
  return client;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.response?.status === "number") {
    return candidate.response.status;
  }

  return undefined;
}

export function getOpenAIProvidersForTest(): OpenAIProvider[] {
  return getProviderConfigs().map(({ kind, name, baseURL }) => ({ kind, name, baseURL }));
}

export function resolveModelForProvider(role: OpenAIModelRole, providerKind: OpenAIProviderKind): string {
  const suffix = MODEL_ENV_SUFFIX[role];
  const primary = normalizeOptional(process.env[`OPENAI_${suffix}`]) ?? DEFAULT_MODELS[role];

  if (providerKind === "fallback") {
    return normalizeOptional(process.env[`OPENAI_FALLBACK_${suffix}`]) ?? primary;
  }

  return primary;
}

export function isRetriableOpenAIError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const status = getStatusCode(error);

  if (status === 408 || status === 429 || (typeof status === "number" && status >= 500)) {
    return true;
  }

  return /enotfound|eai_again|econnreset|etimedout|econnrefused|network error|connection error|fetch failed|timeout|temporarily unavailable|service unavailable|dns/i.test(
    `${message} ${code}`
  );
}

export async function executeWithOpenAIProviders<T>(args: {
  operationName: string;
  getModels: (providerKind: OpenAIProviderKind) => string[];
  execute: (params: { client: OpenAI; model: string; provider: OpenAIProvider }) => Promise<T>;
}): Promise<T> {
  const providers = getProviderConfigs();
  let lastError: unknown = null;

  for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
    const providerConfig = providers[providerIndex];
    const provider: OpenAIProvider = {
      kind: providerConfig.kind,
      name: providerConfig.name,
      baseURL: providerConfig.baseURL,
    };
    const client = getClient(providerConfig);
    const models = Array.from(new Set(args.getModels(provider.kind).filter(Boolean)));

    for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
      const model = models[modelIndex];
      const usingFallbackProvider = provider.kind === "fallback";
      const usingFallbackModel = modelIndex > 0;

      try {
        if (usingFallbackProvider || usingFallbackModel) {
          console.warn(`[${args.operationName}] Retrying with ${usingFallbackProvider ? `${provider.name} provider` : "fallback model"}: ${model}`);
        }

        return await args.execute({ client, model, provider });
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${args.operationName}] Provider ${provider.name}, model ${model} failed: ${message}`);

        const isLastModel = modelIndex === models.length - 1;
        const hasAnotherProvider = providerIndex < providers.length - 1;

        if (!isLastModel) {
          continue;
        }

        if (hasAnotherProvider && isRetriableOpenAIError(error)) {
          break;
        }

        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All OpenAI providers failed");
}
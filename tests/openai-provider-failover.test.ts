import test from "node:test";
import assert from "node:assert/strict";

import {
  getOpenAIProvidersForTest,
  isRetriableOpenAIError,
  resolveModelForProvider,
} from "../lib/ai/openaiClient.ts";

function withEnv(overrides: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("provider config includes fallback endpoint when configured", () => {
  withEnv(
    {
      OPENAI_API_KEY: "primary-key",
      OPENAI_BASE_URL: "https://api.openai.com/v1",
      OPENAI_FALLBACK_API_KEY: "fallback-key",
      OPENAI_FALLBACK_BASE_URL: "https://fallback.example.com/v1",
    },
    () => {
      const providers = getOpenAIProvidersForTest();
      assert.deepEqual(providers, [
        { kind: "primary", name: "primary", baseURL: "https://api.openai.com/v1" },
        { kind: "fallback", name: "fallback", baseURL: "https://fallback.example.com/v1" },
      ]);
    }
  );
});

test("fallback provider can override premium model naming", () => {
  withEnv(
    {
      OPENAI_PREMIUM_MODEL: "o3",
      OPENAI_FALLBACK_PREMIUM_MODEL: "openai/o3",
    },
    () => {
      assert.equal(resolveModelForProvider("premium", "primary"), "o3");
      assert.equal(resolveModelForProvider("premium", "fallback"), "openai/o3");
    }
  );
});

test("network resolution failures are marked retriable for provider failover", () => {
  assert.equal(isRetriableOpenAIError(new Error("getaddrinfo ENOTFOUND api.openai.com")), true);
  assert.equal(isRetriableOpenAIError(new Error("Connection error")), true);
  assert.equal(isRetriableOpenAIError(new Error("Invalid JSON in premium response")), false);
});
import test from "node:test";
import assert from "node:assert/strict";
import { cleanContent, sanitizeTextForStorage } from "../lib/ingestion/clean.ts";

test("sanitizeTextForStorage removes null bytes before persistence", () => {
  const value = "hello\u0000world\u0000";
  assert.equal(sanitizeTextForStorage(value), "helloworld");
});

test("cleanContent strips null bytes while preserving readable text", () => {
  const cleaned = cleanContent("<div>Uber\u0000 Safety &amp; Privacy</div>");
  assert.equal(cleaned, "Uber Safety & Privacy");
});
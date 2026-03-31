#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║        Supabase Schema - Ready to Copy                     ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

const schemaPath = resolve("database/schema.sql");
const schema = readFileSync(schemaPath, "utf-8");

console.log("✅ Schema file loaded - ready to copy!\n");

console.log("📋 INSTRUCTIONS:");
console.log("1. Open: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/");
console.log("2. Click: New query");
console.log("3. Paste the SQL below (full content)");
console.log("4. Click: Run");
console.log("5. Wait for success message\n");

console.log("═".repeat(60));
console.log("COPY EVERYTHING BELOW\n");
console.log("═".repeat(60) + "\n");

console.log(schema);

console.log("\n" + "═".repeat(60));
console.log("END OF SCHEMA");
console.log("═".repeat(60) + "\n");

// Also save to a temp file for easy copying
const tempPath = resolve("schema-ready-to-copy.sql");
writeFileSync(tempPath, schema);
console.log(`✅ Schema also saved to: schema-ready-to-copy.sql\n`);

console.log("Next: Open Supabase SQL Editor and paste the above schema\n");

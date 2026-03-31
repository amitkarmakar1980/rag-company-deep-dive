#!/usr/bin/env node

import { readFileSync } from "fs";
import { resolve } from "path";
import { exec } from "child_process";
import { platform } from "os";

console.clear();
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║          Supabase Schema Setup Assistant                   ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

const schemaPath = resolve("database/schema.sql");
const schema = readFileSync(schemaPath, "utf-8");
const lines = schema.split("\n").length;

console.log("📊 Schema Information:");
console.log(`  • File: database/schema.sql`);
console.log(`  • Lines: ${lines}`);
console.log(`  • Tables: 9 (users, companies, deep_dive_requests, sources, chunks, embeddings, reports, report_sections, feedback_events)`);
console.log(`  • Indexes: 7`);
console.log(`  • RPC Functions: 1 (search_embeddings)`);
console.log(`  • Extensions: pgvector\n`);

console.log("✨ Setup Instructions:\n");
console.log("1️⃣  OPEN Supabase SQL Editor");
console.log("   🌐 URL: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/\n");

console.log("2️⃣  CREATE A NEW QUERY");
console.log("   Click: 'New query' or 'SQL Editor' tab\n");

console.log("3️⃣  COPY THIS SCHEMA\n");
console.log("   ┌" + "─".repeat(58) + "┐");
schema.split("\n").forEach((line, i) => {
  if (i < 10) {  // Show first 10 lines as preview
    const display = line.substring(0, 56);
    console.log(`   │ ${display.padEnd(56)} │`);
  }
});
console.log("   │ ... (total " + lines + " lines) ... │");
console.log("   └" + "─".repeat(58) + "┘\n");

console.log("4️⃣  PASTE & EXECUTE");
console.log("   • Paste entire schema from database/schema.sql into SQL editor");
console.log("   • Click 'Run' button");
console.log("   • Wait for success message ✓\n");

console.log("5️⃣  VERIFY CREATION");
console.log("   Run: npm run check-schema\n");

// Copy schema to clipboard if possible
console.log("📋 Next Steps:");
console.log(`   $ cd database`);
console.log(`   $ cat schema.sql  (to view the file)\n`);

console.log("🔗 Useful Links:");
console.log("   • Supabase SQL Editor: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/");
console.log("   • Supabase Docs: https://supabase.com/docs");
console.log("   • pgvector Docs: https://github.com/pgvector/pgvector\n");

console.log("⏱️  Estimated time: < 2 minutes\n");

// Offer to open browser
if (process.argv.includes("--open")) {
  const url = "https://tkvowsegwfylypukzkqw.supabase.co/project/sql/";
  const cmd = platform === "win32" 
    ? `start ${url}` 
    : platform === "darwin" 
    ? `open ${url}` 
    : `xdg-open ${url}`;
  
  console.log("🌐 Opening Supabase SQL Editor...\n");
  exec(cmd, (err) => {
    if (err) {
      console.log("Please manually open:", url);
    }
  });
}

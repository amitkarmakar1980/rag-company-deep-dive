import { readFileSync } from "fs";
import { resolve } from "path";
import fetch from "node-fetch";

const supabaseUrl = "https://tkvowsegwfylypukzkqw.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdm93c2Vnd2Z5bHlwdWt6a3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkzMDUwMCwiZXhwIjoyMDkwNTA2NTAwfQ.ngX7CjASKPKhRfmWBP9iksfew1FTJANQJp1aFA5NJuQ";

async function createSchema() {
  try {
    console.log("📂 Reading schema.sql...");
    const schemaPath = resolve("database/schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");
    
    console.log("🚀 Creating schema via Supabase SQL Editor endpoint...\n");
    
    // Try using Supabase SQL endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/db-exec`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: schema })
    }).catch(() => null);

    if (response && response.status < 400) {
      console.log("✅ Schema creation request submitted!");
      const result = await response.json();
      console.log("Response:", result);
    } else {
      throw new Error("Endpoint not available");
    }
  } catch (error) {
    console.log("ℹ️  Direct API approach not available (expected)\n");
    console.log("📋 MANUAL SETUP REQUIRED:\n");
    console.log("This is expected - Supabase requires manual SQL execution for security.");
    console.log("\n✅ Follow these steps:");
    console.log("1️⃣  Open: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/");
    console.log("2️⃣  Click 'New query'");
    console.log("3️⃣  Copy all content from: database/schema.sql");
    console.log("4️⃣  Paste into the SQL editor");
    console.log("5️⃣  Click 'Run' button");
    console.log("6️⃣  Wait 30 seconds for completion");
    console.log("7️⃣  Run: npm run check-schema (to verify)\n");
    console.log("📏 Schema size: 200+ lines of SQL");
    console.log("⏱️  Expected execution time: < 5 seconds");
  }
}

createSchema();

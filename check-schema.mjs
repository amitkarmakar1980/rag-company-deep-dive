import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tkvowsegwfylypukzkqw.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdm93c2Vnd2Z5bHlwdWt6a3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkzMDUwMCwiZXhwIjoyMDkwNTA2NTAwfQ.ngX7CjASKPKhRfmWBP9iksfew1FTJANQJp1aFA5NJuQ";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  const requiredTables = [
    "users",
    "companies",
    "deep_dive_requests",
    "sources",
    "chunks",
    "embeddings",
    "reports",
    "report_sections",
    "feedback_events",
  ];

  console.log("Checking Supabase database schema...\n");
  
  const results = {};
  
  for (const table of requiredTables) {
    const { error } = await supabase
      .from(table)
      .select("*")
      .limit(1);
    
    results[table] = !error;
  }

  const foundTables = Object.entries(results)
    .filter(([_, exists]) => exists)
    .map(([name, _]) => name);
  
  const missingTables = Object.entries(results)
    .filter(([_, exists]) => !exists)
    .map(([name, _]) => name);

  console.log("📋 Schema Status:");
  foundTables.forEach(t => console.log(`  ✅ ${t}`));
  missingTables.forEach(t => console.log(`  ❌ ${t}`));

  if (missingTables.length === 0) {
    console.log("\n✅ SUCCESS: All required tables exist! Database is ready to use.");
  } else {
    console.log(`\n❌ MISSING: ${missingTables.length} tables need to be created.`);
    console.log("\n📝 How to fix:");
    console.log("1. Visit: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/");
    console.log("2. Click 'New query' or 'SQL Editor'");
    console.log("3. Copy contents of: database/schema.sql");
    console.log("4. Paste into the SQL editor");
    console.log("5. Click 'Run'");
  }
}

checkSchema();

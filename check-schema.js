const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://tkvowsegwfylypukzkqw.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdm93c2Vnd2Z5bHlwdWt6a3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkzMDUwMCwiZXhwIjoyMDkwNTA2NTAwfQ.ngX7CjASKPKhRfmWBP9iksfew1FTJANQJp1aFA5NJuQ";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function checkSchema() {
  try {
    console.log("Checking Supabase database schema...\n");
    
    const { data, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");
    
    if (error) {
      console.log("❌ Error querying database:", error.message);
      return;
    }
    
    const existingTables = (data || []).map(t => t.table_name);
    console.log("✓ Tables found in database:", existingTables.length);
    
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    const foundTables = requiredTables.filter(t => existingTables.includes(t));
    
    console.log("\n📋 Schema Status:");
    foundTables.forEach(t => console.log(`  ✅ ${t}`));
    missingTables.forEach(t => console.log(`  ❌ ${t}`));
    
    if (missingTables.length === 0) {
      console.log("\n✅ All required tables exist! Database is ready.");
    } else {
      console.log(`\n❌ Missing ${missingTables.length} tables.`);
      console.log("\n📝 To fix:");
      console.log("1. Go to https://tkvowsegwfylypukzkqw.supabase.co/project/sql/");
      console.log("2. Open database/schema.sql and copy all SQL");
      console.log("3. Paste into Supabase SQL Editor");
      console.log("4. Click Run");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkSchema();

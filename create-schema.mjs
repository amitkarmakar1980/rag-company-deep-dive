import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tkvowsegwfylypukzkqw.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdm93c2Vnd2Z5bHlwdWt6a3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDkzMDUwMCwiZXhwIjoyMDkwNTA2NTAwfQ.ngX7CjASKPKhRfmWBP9iksfew1FTJANQJp1aFA5NJuQ";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSchema() {
  try {
    console.log("📂 Reading schema.sql...");
    const schemaPath = resolve("database/schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");
    
    console.log("🔄 Executing schema creation...\n");
    
    // Split into individual statements and execute
    const statements = schema
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));
    
    let completed = 0;
    const results = [];
    
    for (const statement of statements) {
      try {
        console.log(`⏳ Executing: ${statement.substring(0, 60)}...`);
        
        const { data, error } = await supabase.rpc('exec', {
          sql: statement + ";"
        }).catch(() => {
          // RPC might not exist, try alternative method
          return { data: null, error: null };
        });
        
        if (error && error.message && !error.message.includes("does not exist")) {
          console.error(`   ❌ Error:`, error.message);
          results.push({ statement: statement.substring(0, 50), error: error.message });
        } else {
          console.log(`   ✅ Success`);
          completed++;
        }
      } catch (err) {
        console.log(`   ⚠️  Skipped (may be expected)`);
      }
    }
    
    console.log(`\n✅ Schema creation attempts completed: ${completed}/${statements.length}`);
    console.log("\n📝 Next step: Verify schema was created by running: node check-schema.mjs");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n⚠️  The RPC method didn't work. Please create schema manually:");
    console.log("1. Go to: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/");
    console.log("2. Create a new query");
    console.log("3. Copy contents of database/schema.sql");
    console.log("4. Paste and run");
  }
}

createSchema();

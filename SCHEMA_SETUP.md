# Supabase Database Schema Setup

Your Supabase project is configured but the database schema has not been created yet.

## Quick Setup (2 minutes)

### Step 1: Open Supabase SQL Editor
📍 Go to: https://tkvowsegwfylypukzkqw.supabase.co/project/sql/

### Step 2: Create New Query
Click the **"New query"** button or the **"SQL Editor"** tab

### Step 3: Copy the Schema
Open [database/schema.sql](../database/schema.sql) and copy ALL the content

### Step 4: Paste & Execute
1. Paste the entire schema into the Supabase SQL editor
2. Click the blue **"Run"** button
3. Wait for the success message

If your schema was already created earlier, run it again. The `ALTER TABLE` statements are idempotent and will add newly required analytics fields such as `reports.ai_query_count`, `reports.source_count`, `reports.source_host_count`, and `candidate_overlays.ai_query_count`, while also converting legacy `TIMESTAMP` columns to `TIMESTAMPTZ` with UTC-preserving casts.

### Step 5: Verify
After execution completes, run:
```bash
npm run check-schema
```

You should see:
```
✅ users
✅ companies
✅ deep_dive_requests
✅ sources
✅ chunks
✅ embeddings
✅ reports
✅ report_sections
✅ feedback_events

✅ SUCCESS: All required tables exist! Database is ready to use.
```

---

## What Gets Created

✅ **9 Tables**
- users (authentication & profile)
- companies (company information)
- deep_dive_requests (analysis requests)
- sources (web content sources)
- chunks (text chunks from sources)
- embeddings (vector embeddings)
- reports (generated reports)
- report_sections (report content)
- feedback_events (user feedback)

✅ **7 Indexes** (for performance)

✅ **pgvector Extension** (for vector search)

✅ **1 RPC Function** (search_embeddings)

---

## Troubleshooting

### ❌ "Code: 0A000" or "Extension not supported"
- Make sure pgvector extension is enabled
- This happens automatically with `CREATE EXTENSION IF NOT EXISTS vector`

### ❌ "Relation already exists"
- Some tables may have been partially created
- Click "Run" again - `IF NOT EXISTS` clauses will skip duplicates

### ❌ Timeout or slow execution
- Schema creation typically takes < 5 seconds
- Wait a bit longer or refresh and try again

### ✅ Success!
If all tables are created, you're ready to run the app:
```bash
npm run dev
```

---

## Manual Verification

To check tables without the script, in Supabase SQL Editor run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
ORDER BY table_name;
```

Should return 9 rows with the table names listed above.

---

## Next Steps

🚀 Once schema is created:
```bash
npm run dev
```

Visit: http://localhost:3000

The app should now be fully functional!

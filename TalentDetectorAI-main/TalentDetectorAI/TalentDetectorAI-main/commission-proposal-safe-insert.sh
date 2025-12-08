#!/bin/bash
# commission-proposal-safe-insert.sh
# Robust insertion for commission_proposals to prevent FK/duplicate errors

# You will need Node.js and npm, and to set your SUPABASE env variables.
# This script creates a safe-insert.js file. Run that file with Node to do safe inserts!

cat > safe-insert.js <<'EOF'
const { createClient } = require('@supabase/supabase-js')

// === Set up env variables before running ===
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

// ==== FILL THESE IN (or pass via env/args) ====
const COMMISSION_PROPOSAL_DATA = {
  manager_id: 'put-correct-manager-uuid-here',
  agency_id: 'put-correct-agency-id-here',
  job_id: 'put-correct-job-id-here',
  // add further fields as needed, e.g. proposal_amount: 5000,
}

async function ensureManagerExists(manager_id) {
  // Change 'managers' to 'users' if your reference is users table
  let { data, error } = await supabase
    .from('managers')
    .select('id')
    .eq('id', manager_id)
    .single()
  if (!data) {
    console.log(`⚠️  Manager ID ${manager_id} not found. Creating placeholder.`)
    const { error } = await supabase
      .from('managers')
      .insert({ id: manager_id, name: 'AutoPlaceholder' })
    if (error) {
      console.error('❌ Failed to create manager:', error.message)
      process.exit(1)
    }
    console.log(`✅ Placeholder manager created.`)
  }
}

async function ensureAgencyExists(agency_id) {
  let { data, error } = await supabase
    .from('agencies')
    .select('id')
    .eq('id', agency_id)
    .single()
  if (!data) {
    console.log(`⚠️  Agency ID ${agency_id} not found. Creating placeholder.`)
    const { error } = await supabase
      .from('agencies')
      .insert({ id: agency_id, name: 'AutoPlaceholder' })
    if (error) {
      console.error('❌ Failed to create agency:', error.message)
      process.exit(1)
    }
    console.log(`✅ Placeholder agency created.`)
  }
}

async function ensureJobExists(job_id) {
  let { data, error } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', job_id)
    .single()
  if (!data) {
    console.log(`⚠️  Job ID ${job_id} not found. Creating placeholder.`)
    const { error } = await supabase
      .from('jobs')
      .insert({ id: job_id, title: 'AutoPlaceholder' })
    if (error) {
      console.error('❌ Failed to create job:', error.message)
      process.exit(1)
    }
    console.log(`✅ Placeholder job created.`)
  }
}

async function run() {
  // 1. Ensure all referenced foreign keys exist
  await ensureManagerExists(COMMISSION_PROPOSAL_DATA.manager_id)
  await ensureAgencyExists(COMMISSION_PROPOSAL_DATA.agency_id)
  await ensureJobExists(COMMISSION_PROPOSAL_DATA.job_id)

  // 2. Check for duplicate
  const { data: dup, error: checkErr } = await supabase
    .from('commission_proposals')
    .select('id')
    .eq('manager_id', COMMISSION_PROPOSAL_DATA.manager_id)
    .eq('agency_id', COMMISSION_PROPOSAL_DATA.agency_id)
    .eq('job_id', COMMISSION_PROPOSAL_DATA.job_id)
    .maybeSingle()

  if (dup) {
    console.log('💡 Proposal already exists for this manager, agency, and job. No new invite was sent.')
    process.exit(0)
  }

  // 3. Insert proposal
  const now = new Date().toISOString()
  const { error: insertErr, data } = await supabase
    .from('commission_proposals')
    .insert({
      ...COMMISSION_PROPOSAL_DATA,
      created_at: now
    })
    .select()
    .single()

  if (insertErr) {
    if (insertErr.code === '23503') {
      console.log('❌ Foreign key violation! Check manager_id, agency_id, and job_id.')
    } else if (insertErr.code === '23505') {
      console.log('❌ Duplicate proposal. This should never happen as we check above.')
    } else {
      console.log('❌ Unknown DB error:', insertErr.message)
    }
    process.exit(1)
  }

  console.log('✅ Commission Proposal successfully inserted:', data)
}

run().catch(e => { console.error(e); process.exit(1); })
EOF

echo "✅ Wrote safe-insert.js -- Now run it with Node:"

echo "node safe-insert.js"

echo ""
echo "Edit COMMISSION_PROPOSAL_DATA at top of safe-insert.js with correct manager_id, agency_id, job_id"
echo "This will only insert if all keys exist and not if already present."
echo "It will display meaningful user messages and never raw errors!"

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
  console.log("Checking if ON DELETE CASCADE works with real dependents...");
  
  // 1. Create a dummy viva
  const { data: viva } = await supabase
    .from('viva_events')
    .insert({ name: 'CASCADE TEST', viva_date: '2026-05-01', deadline: '2026-05-01T23:59:59Z' })
    .select().single();
  
  console.log("Created viva:", viva.id);
  
  // 2. Create criteria for this viva
  const { data: criteria } = await supabase
    .from('viva_criteria')
    .insert({ viva_id: viva.id, name: 'Test Metric', max_marks: 25 })
    .select().single();
  
  console.log("Created criteria:", criteria.id);

  // 3. Create a score for this criteria
  const { data: student } = await supabase.from('students').select('id').limit(1).single();
  const { data: user } = await supabase.from('users').select('id').limit(1).single();

  if (student && user) {
      const { error: sError } = await supabase
        .from('viva_scores')
        .insert({
            viva_id: viva.id,
            student_id: student.id,
            criteria_id: criteria.id,
            lecturer_id: user.id,
            score: 10
        });
      
      if (sError) {
          console.error("❌ FAILED TO ADD SCORE:", sError.message);
          return;
      }
      console.log("Score added successfully.");
  }

  // 4. Try to delete the viva
  console.log("Attempting to delete viva (this should cascade to criteria and scores)...");
  const { error: dError } = await supabase
    .from('viva_events')
    .delete()
    .eq('id', viva.id);
  
  if (dError) {
    console.error("❌ DELETE FAILED:", dError.message);
    console.error("Detail:", dError.details);
  } else {
    console.log("✅ DELETE SUCCESSFUL! Cascade is working.");
  }
}

checkConstraints();

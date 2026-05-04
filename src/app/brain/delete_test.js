require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Looking for students with UT Number or Name containing 'TEST'...");
  
  const { data: students, error: err1 } = await supabase
    .from('students')
    .select('*')
    .or('student_id.ilike.%test%,name.ilike.%test%');
    
  console.log('Found students:', students);
  if (err1) console.error('Error fetching students:', err1);
  
  if (students && students.length > 0) {
    const studentIds = students.map(s => s.id);
    
    // Delete viva scores
    const { data: scores, error: err2 } = await supabase.from('viva_scores').delete().in('student_id', studentIds).select();
    console.log(`Deleted ${scores?.length || 0} viva scores`);
    if (err2) console.error('Error deleting scores:', err2);

    // Delete student
    const { data: deletedStudents, error: err3 } = await supabase.from('students').delete().in('id', studentIds).select();
    console.log(`Deleted ${deletedStudents?.length || 0} students`);
    if (err3) console.error('Error deleting students:', err3);
  } else {
    // Maybe the scores are linked to a deleted student but still exist? Let's check viva_scores directly
    console.log("Checking viva_scores directly...");
    const { data: allScores, error: err4 } = await supabase.from('viva_scores').select('*, students(*)').limit(100);
    const testScores = allScores?.filter(s => s.remark === 'test' || (s.students && (s.students.name.includes('TEST') || s.students.student_id.includes('TEST'))));
    
    console.log(`Found ${testScores?.length || 0} test scores out of ${allScores?.length || 0} recent scores`);
    
    if (testScores && testScores.length > 0) {
      const scoreIds = testScores.map(s => s.id);
      const { data: deletedScores, error: err5 } = await supabase.from('viva_scores').delete().in('id', scoreIds).select();
      console.log(`Explicitly deleted ${deletedScores?.length || 0} test scores`);
    }
  }

  // Also check viva events
  const { data: vivas, error: err6 } = await supabase.from('viva_events').select('*').ilike('name', '%test%');
  console.log('Found test viva events:', vivas);
  if (vivas && vivas.length > 0) {
      const vivaIds = vivas.map(v => v.id);
      const { data: deletedVivas, error: err7 } = await supabase.from('viva_events').delete().in('id', vivaIds).select();
      console.log(`Deleted ${deletedVivas?.length || 0} viva events`);
  }
}

run();

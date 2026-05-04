const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDuplicates() {
  console.log("Fetching all scores...");
  const { data: scores, error: fetchError } = await supabase
    .from('viva_scores')
    .select('*');

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }

  console.log(`Found ${scores.length} score records.`);

  // Group by student and criteria
  const map = new Map();
  const toDelete = [];

  for (const score of scores) {
    const key = `${score.viva_id}_${score.student_id}_${score.criteria_id}`;
    if (!map.has(key)) {
      map.set(key, score);
    } else {
      const existing = map.get(key);
      // Prefer non-admin lecturer or later update
      // (Assuming 'Super Admin' or similar is the one we might want to merge into a 'real' lecturer entry)
      // Actually, just keeping the one with a non-zero score if possible, or the most recent.
      
      // For this specific fix, we'll just merge them:
      // If the existing one has no score (or is 0) and this one has a score, swap.
      if ((existing.score === 0 || isNaN(existing.score)) && score.score > 0) {
        toDelete.push(existing.id);
        map.set(key, score);
      } else {
        toDelete.push(score.id);
      }
    }
  }

  console.log(`Found ${toDelete.length} duplicate records to remove.`);

  if (toDelete.length > 0) {
    // Delete in chunks
    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from('viva_scores')
        .delete()
        .in('id', chunk);
      
      if (deleteError) {
        console.error("Delete error:", deleteError);
      } else {
        console.log(`Deleted chunk of ${chunk.length} duplicates.`);
      }
    }
  }

  console.log("Cleanup complete.");
}

fixDuplicates();

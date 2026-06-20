import { supabase } from './supabaseClient';

// Persists a generated report. Returns { ok, id }. For signed-in users a DB write
// is retried once on transient failure; the caller can warn + offer the PDF if it
// still fails so a paid-for report is never silently lost (RPT-005).
export async function saveIdea(userId, { form, meta, sections }) {
  if (!userId) {
    try {
      const prev = JSON.parse(localStorage.getItem('myIdeas') || '[]');
      prev.unshift({ id: `local_${Date.now()}`, title: form.name, category: form.category, date: new Date().toISOString(), score: meta?.overallScore ?? null, meta, sections, form });
      localStorage.setItem('myIdeas', JSON.stringify(prev.slice(0, 20)));
      return { ok: true, id: null };
    } catch { return { ok: false, id: null }; }
  }
  const row = {
    user_id: userId,
    title: form.name,
    category: form.category,
    score: meta?.overallScore ?? null,
    meta,
    sections,
    form,
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.from('ideas').insert(row).select('id').single();
    if (!error) return { ok: true, id: data?.id ?? null };
    console.error('saveIdea failed', error);
    if (attempt === 0) await new Promise(r => setTimeout(r, 1200));
  }
  return { ok: false, id: null };
}

export async function loadIdeas(userId) {
  if (!userId) {
    try { return JSON.parse(localStorage.getItem('myIdeas') || '[]'); } catch { return []; }
  }
  const { data, error } = await supabase
    .from('ideas')
    .select('id, title, category, score, meta, sections, form, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('loadIdeas failed', error); return []; }
  return (data || []).map(r => ({ ...r, date: r.created_at }));
}

export async function deleteIdea(userId, ideaId) {
  if (!userId || !ideaId) return;
  if (String(ideaId).startsWith('local_')) {
    try {
      const prev = JSON.parse(localStorage.getItem('myIdeas') || '[]');
      localStorage.setItem('myIdeas', JSON.stringify(prev.filter(i => i.id !== ideaId)));
    } catch { /* ignore */ }
    return;
  }
  const { error } = await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', userId);
  if (error) console.error('deleteIdea failed', error);
}

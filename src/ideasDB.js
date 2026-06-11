import { supabase } from './supabaseClient';

export async function saveIdea(userId, { form, meta, sections }) {
  if (!userId) {
    try {
      const prev = JSON.parse(localStorage.getItem('myIdeas') || '[]');
      prev.unshift({ id: `local_${Date.now()}`, title: form.name, category: form.category, date: new Date().toISOString(), score: meta?.overallScore ?? null, meta, sections, form });
      localStorage.setItem('myIdeas', JSON.stringify(prev.slice(0, 20)));
    } catch { /* ignore */ }
    return null;
  }
  const { data, error } = await supabase.from('ideas').insert({
    user_id: userId,
    title: form.name,
    category: form.category,
    score: meta?.overallScore ?? null,
    meta,
    sections,
    form,
  }).select('id').single();
  if (error) console.error('saveIdea failed', error);
  return data?.id ?? null;
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

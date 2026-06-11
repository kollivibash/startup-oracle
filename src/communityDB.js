import { supabase } from './supabaseClient';

export async function fetchPosts() {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, title, body, tags, created_at, user_id, author:profiles(id, name, avatar_url), ratings:community_ratings(user_id, value), sug:community_suggestions(count)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) { console.error('fetchPosts failed', error); return []; }
  return (data || []).map(p => ({ ...p, sugCount: p.sug?.[0]?.count ?? 0 }));
}

export async function createPost(userId, { title, body, tags }) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({ user_id: userId, title, body, tags })
    .select('id, created_at')
    .single();
  if (error) { console.error('createPost failed', error); throw error; }
  return data;
}

export async function deletePost(userId, postId) {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId).eq('user_id', userId);
  if (error) console.error('deletePost failed', error);
}

export async function ratePost(userId, postId, value) {
  const { error } = await supabase
    .from('community_ratings')
    .upsert({ post_id: postId, user_id: userId, value }, { onConflict: 'post_id,user_id' });
  if (error) console.error('ratePost failed', error);
}

export async function fetchSuggestions(postId) {
  const { data, error } = await supabase
    .from('community_suggestions')
    .select('id, text, created_at, user_id, author:profiles(name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchSuggestions failed', error); return []; }
  return data || [];
}

export async function addSuggestion(userId, postId, text) {
  const { data, error } = await supabase
    .from('community_suggestions')
    .insert({ post_id: postId, user_id: userId, text })
    .select('id, text, created_at, user_id')
    .single();
  if (error) { console.error('addSuggestion failed', error); throw error; }
  return data;
}

export async function fetchFollowingIds(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', userId);
  if (error) { console.error('fetchFollowingIds failed', error); return new Set(); }
  return new Set((data || []).map(r => r.followee_id));
}

export async function setFollow(userId, targetId, follow) {
  if (follow) {
    const { error } = await supabase.from('follows').insert({ follower_id: userId, followee_id: targetId });
    if (error && error.code !== '23505') console.error('follow failed', error);
  } else {
    const { error } = await supabase.from('follows').delete().eq('follower_id', userId).eq('followee_id', targetId);
    if (error) console.error('unfollow failed', error);
  }
}

export async function fetchFollowList(userId, type) {
  const col   = type === 'followers' ? 'followee_id' : 'follower_id';
  const join  = type === 'followers' ? 'follower_id' : 'followee_id';
  const { data, error } = await supabase
    .from('follows')
    .select(`person:profiles!follows_${join}_fkey(id, name, avatar_url)`)
    .eq(col, userId);
  if (error) { console.error('fetchFollowList failed', error); return []; }
  return (data || []).map(r => r.person).filter(Boolean);
}

export async function fetchFollowCounts(userId) {
  if (!userId) return { followers: 0, following: 0 };
  const [a, b] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}

export async function fetchRatingsReceived(userId) {
  const { data, error } = await supabase
    .from('community_ratings')
    .select('value, created_at, rater:profiles!community_ratings_user_id_fkey(name, avatar_url), post:community_posts!inner(title, user_id)')
    .eq('post.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('fetchRatingsReceived failed', error); return []; }
  return data || [];
}

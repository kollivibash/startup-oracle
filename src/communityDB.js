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

// ── Direct messages ──────────────────────────────────────────────────────────

export async function fetchProfile(id) {
  const { data } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', id).single();
  return data;
}

// Returns { [peerId]: { peer:{id,name,avatar_url}, messages:[...], unread:n } }
export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, text, read, created_at, sender:profiles!messages_sender_id_fkey(id, name, avatar_url), recipient:profiles!messages_recipient_id_fkey(id, name, avatar_url)')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) { console.error('fetchConversations failed', error); return {}; }
  const convs = {};
  for (const m of data || []) {
    const mine   = m.sender_id === userId;
    const peer   = mine ? m.recipient : m.sender;
    if (!peer) continue;
    if (!convs[peer.id]) convs[peer.id] = { peer, messages: [], unread: 0 };
    convs[peer.id].messages.push(m);
    if (!mine && !m.read) convs[peer.id].unread++;
  }
  return convs;
}

export async function sendMessage(senderId, recipientId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, text })
    .select('id, sender_id, recipient_id, text, read, created_at')
    .single();
  if (error) { console.error('sendMessage failed', error); throw error; }
  return data;
}

export async function markConversationRead(userId, peerId) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('sender_id', peerId)
    .eq('read', false);
  if (error) console.error('markConversationRead failed', error);
}

export function subscribeToMessages(userId, onMessage) {
  const channel = supabase
    .channel(`dm_${userId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
      payload => onMessage(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

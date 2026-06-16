import { supabase } from './supabaseClient';

const POST_CORE = 'id, title, body, tags, created_at, user_id, author:profiles!community_posts_user_id_fkey(id, name, avatar_url, bio), ratings:community_ratings(user_id, value), sug:community_suggestions(count)';
const POST_VARIANTS = [
  POST_CORE + ', media, meta, repost_of, kind, poll, link_preview, reactions:post_reactions(user_id, type), pollVotes:poll_votes(user_id, option_idx)',
  POST_CORE + ', media, meta, repost_of, reactions:post_reactions(user_id, type)',
  POST_CORE + ', media, meta, repost_of',
  POST_CORE + ', media, meta',
  POST_CORE + ', media',
  POST_CORE,
];
const POST_DEGRADE = /media|meta|repost|reaction|relationship|schema cache|column|does not exist|poll|kind|link/i;
const shapePost = p => ({ ...p, media: p.media || [], meta: p.meta || null, repost_of: p.repost_of || null, reactions: p.reactions || [], kind: p.kind || 'post', poll: p.poll || null, link_preview: p.link_preview || null, pollVotes: p.pollVotes || [], sugCount: p.sug?.[0]?.count ?? 0 });

// Attaches the embedded original onto each repost, resolving from the loaded set.
const linkReposts = list => {
  const byId = Object.fromEntries(list.map(p => [p.id, p]));
  list.forEach(p => { if (p.repost_of) p.original = byId[p.repost_of] || null; });
  return list;
};

export async function fetchPosts() {
  for (const cols of POST_VARIANTS) {
    const { data, error } = await supabase
      .from('community_posts').select(cols).order('created_at', { ascending: false }).limit(100);
    if (!error) return linkReposts((data || []).map(shapePost));
    if (!POST_DEGRADE.test(error.message || '')) { console.error('fetchPosts failed', error.message || error); return []; }
  }
  return [];
}

export async function fetchPostById(id) {
  for (const cols of POST_VARIANTS) {
    const { data, error } = await supabase.from('community_posts').select(cols).eq('id', id).single();
    if (!error) return shapePost(data);
    if (!POST_DEGRADE.test(error.message || '')) return null;
  }
  return null;
}

export async function reactToPost(userId, postId, type) {
  if (!type) {
    const { error } = await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) console.error('removeReaction failed', error);
    return;
  }
  const { error } = await supabase.from('post_reactions').upsert({ post_id: postId, user_id: userId, type }, { onConflict: 'post_id,user_id' });
  if (error) console.error('reactToPost failed', error);
}

export async function fetchSavedPosts(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase.from('saved_posts').select('post_id').eq('user_id', userId);
  if (error) { if (!/relation|does not exist|schema cache|saved_posts/i.test(error.message || '')) console.error('fetchSavedPosts failed', error); return new Set(); }
  return new Set((data || []).map(r => r.post_id));
}

export async function setSavedPost(userId, postId, saved) {
  if (saved) {
    const { error } = await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId });
    if (error && error.code !== '23505') console.error('savePost failed', error);
  } else {
    const { error } = await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', postId);
    if (error) console.error('unsavePost failed', error);
  }
}

export async function repost(userId, originalId, commentary = '') {
  const payload = { user_id: userId, title: '', body: commentary, tags: [], media: [], meta: null, repost_of: originalId };
  let res = await supabase.from('community_posts').insert(payload).select('id, created_at').single();
  if (res.error && /meta/i.test(res.error.message || '')) { delete payload.meta; res = await supabase.from('community_posts').insert(payload).select('id, created_at').single(); }
  if (res.error) { console.error('repost failed', res.error); throw res.error; }
  return res.data;
}

export async function createPost(userId, { title, body, tags, media = [], meta = null, kind = 'post', poll = null, link_preview = null }) {
  const payload = { user_id: userId, title, body, tags, media, meta, kind, poll, link_preview };
  const strip = keys => keys.forEach(k => delete payload[k]);
  const insert = () => supabase.from('community_posts').insert(payload).select('id, created_at').single();
  let res = await insert();
  if (res.error && /kind|poll|link/i.test(res.error.message || '')) { strip(['kind', 'poll', 'link_preview']); res = await insert(); }
  if (res.error && /meta/i.test(res.error.message || '')) { strip(['meta']); res = await insert(); }
  if (res.error && /media/i.test(res.error.message || '')) { strip(['media']); res = await insert(); }
  if (res.error) { console.error('createPost failed', res.error); throw res.error; }
  return res.data;
}

export async function votePoll(userId, postId, optionIdx) {
  const { error } = await supabase.from('poll_votes').upsert({ post_id: postId, user_id: userId, option_idx: optionIdx }, { onConflict: 'post_id,user_id' });
  if (error) console.error('votePoll failed', error);
}

// Calls the serverless /api/unfurl to get a link preview (server-side fetch).
export async function unfurlLink(url) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  try {
    const r = await fetch('/api/unfurl', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }) });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.title ? d : null;
  } catch { return null; }
}

// Uploads one photo/document to the post-media bucket, returns its public URL.
export async function uploadPostFile(userId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('post-media').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) { console.error('uploadPostFile failed', error); throw error; }
  const { data } = supabase.storage.from('post-media').getPublicUrl(path);
  return data.publicUrl;
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
    .select('id, text, created_at, user_id, parent_id, author:profiles!community_suggestions_user_id_fkey(name, avatar_url), likes:suggestion_likes(user_id)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) {
    const r2 = await supabase
      .from('community_suggestions')
      .select('id, text, created_at, user_id, author:profiles!community_suggestions_user_id_fkey(name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (r2.error) { console.error('fetchSuggestions failed', r2.error); return []; }
    return (r2.data || []).map(s => ({ ...s, parent_id: null, likes: [] }));
  }
  return (data || []).map(s => ({ ...s, likes: s.likes || [] }));
}

export async function addSuggestion(userId, postId, text, parentId = null) {
  const payload = { post_id: postId, user_id: userId, text, parent_id: parentId };
  let res = await supabase.from('community_suggestions').insert(payload).select('id, text, created_at, user_id, parent_id').single();
  if (res.error && /parent_id/i.test(res.error.message || '')) {
    delete payload.parent_id;
    res = await supabase.from('community_suggestions').insert(payload).select('id, text, created_at, user_id').single();
  }
  if (res.error) { console.error('addSuggestion failed', res.error); throw res.error; }
  return res.data;
}

export async function likeSuggestion(userId, suggestionId, like) {
  if (like) {
    const { error } = await supabase.from('suggestion_likes').insert({ suggestion_id: suggestionId, user_id: userId });
    if (error && error.code !== '23505') console.error('likeSuggestion failed', error);
  } else {
    const { error } = await supabase.from('suggestion_likes').delete().eq('suggestion_id', suggestionId).eq('user_id', userId);
    if (error) console.error('unlikeSuggestion failed', error);
  }
}

// Returns { accepted: Set<uid>, pending: Set<uid> } for people I follow / requested.
// Falls back to treating everything as accepted if the status column isn't migrated yet.
export async function fetchFollowState(userId) {
  const empty = { accepted: new Set(), pending: new Set() };
  if (!userId) return empty;
  let { data, error } = await supabase.from('follows').select('followee_id, status').eq('follower_id', userId);
  if (error && /status/i.test(error.message || '')) {
    ({ data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', userId));
    data = (data || []).map(r => ({ ...r, status: 'accepted' }));
  }
  if (error) { console.error('fetchFollowState failed', error); return empty; }
  const out = { accepted: new Set(), pending: new Set() };
  for (const r of data || []) (r.status === 'pending' ? out.pending : out.accepted).add(r.followee_id);
  return out;
}

export async function setFollow(userId, targetId, follow) {
  if (follow) {
    let { error } = await supabase.from('follows').insert({ follower_id: userId, followee_id: targetId, status: 'pending' });
    if (error && /status/i.test(error.message || '')) {
      ({ error } = await supabase.from('follows').insert({ follower_id: userId, followee_id: targetId }));
    }
    if (error && error.code !== '23505') console.error('follow failed', error);
  } else {
    const { error } = await supabase.from('follows').delete().eq('follower_id', userId).eq('followee_id', targetId);
    if (error) console.error('unfollow failed', error);
  }
}

export async function fetchFollowList(userId, type) {
  const col   = type === 'followers' ? 'followee_id' : 'follower_id';
  const join  = type === 'followers' ? 'follower_id' : 'followee_id';
  const sel   = `person:profiles!follows_${join}_fkey(id, name, avatar_url, bio)`;
  let { data, error } = await supabase.from('follows').select(sel).eq(col, userId).eq('status', 'accepted');
  if (error && /status/i.test(error.message || '')) {
    ({ data, error } = await supabase.from('follows').select(sel).eq(col, userId));
  }
  if (error) { console.error('fetchFollowList failed', error); return []; }
  return (data || []).map(r => r.person).filter(Boolean);
}

// "Followed by X and Y" — people the viewer follows who ALSO follow `uid`.
// myFollowingIds = the viewer's accepted following set. Returns { people, count }.
export async function fetchMutualFollowers(uid, myFollowingIds, max = 3) {
  const ids = [...(myFollowingIds || [])].filter(id => id && id !== uid);
  if (!uid || !ids.length) return { people: [], count: 0 };
  const sel = 'person:profiles!follows_follower_id_fkey(id, name, avatar_url)';
  let { data, error } = await supabase.from('follows').select(sel).eq('followee_id', uid).eq('status', 'accepted').in('follower_id', ids);
  if (error && /status/i.test(error.message || '')) {
    ({ data, error } = await supabase.from('follows').select(sel).eq('followee_id', uid).in('follower_id', ids));
  }
  if (error) { console.error('fetchMutualFollowers failed', error); return { people: [], count: 0 }; }
  const people = (data || []).map(r => r.person).filter(Boolean);
  return { people: people.slice(0, max), count: people.length };
}

// Batched version for a list of accounts → { [uid]: { people, count } }. One query.
export async function fetchMutualFollowersBatch(uids, myFollowingIds, max = 3) {
  const ids = [...(myFollowingIds || [])].filter(Boolean);
  const targets = [...new Set((uids || []).filter(Boolean))];
  const out = {};
  if (!ids.length || !targets.length) return out;
  const sel = 'followee_id, person:profiles!follows_follower_id_fkey(id, name, avatar_url)';
  let { data, error } = await supabase.from('follows').select(sel).in('followee_id', targets).eq('status', 'accepted').in('follower_id', ids);
  if (error && /status/i.test(error.message || '')) {
    ({ data, error } = await supabase.from('follows').select(sel).in('followee_id', targets).in('follower_id', ids));
  }
  if (error) { console.error('fetchMutualFollowersBatch failed', error); return out; }
  for (const r of data || []) {
    if (!r.person || r.followee_id === r.person.id) continue;
    const k = r.followee_id;
    if (!out[k]) out[k] = { people: [], count: 0 };
    out[k].count++;
    if (out[k].people.length < max) out[k].people.push(r.person);
  }
  return out;
}

export async function fetchFollowCounts(userId) {
  if (!userId) return { followers: 0, following: 0 };
  let [a, b] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId).eq('status', 'accepted'),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
  ]);
  if ((a.error && /status/i.test(a.error.message || '')) || (b.error && /status/i.test(b.error.message || ''))) {
    [a, b] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
  }
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}

// Incoming pending requests for me (people who asked to follow me).
export async function fetchFollowRequests(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('follows')
    .select('created_at, person:profiles!follows_follower_id_fkey(id, name, avatar_url, bio)')
    .eq('followee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) { if (!/status/i.test(error.message || '')) console.error('fetchFollowRequests failed', error); return []; }
  return (data || []).map(r => ({ ...r.person, requested_at: r.created_at })).filter(p => p?.id);
}

export async function respondFollowRequest(userId, followerId, accept) {
  const q = accept
    ? supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('followee_id', userId)
    : supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', userId);
  const { error } = await q;
  if (error) console.error('respondFollowRequest failed', error);
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
  let { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, bio, about, location, banner_url, experience, education, skills')
    .eq('id', id).single();
  if (error) ({ data } = await supabase.from('profiles').select('id, name, avatar_url, bio').eq('id', id).single());
  return data;
}

export async function updateProfile(userId, fields) {
  let { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
    const safe = {}; for (const k of ['name', 'bio', 'avatar_url']) if (k in fields) safe[k] = fields[k];
    ({ error } = await supabase.from('profiles').update(safe).eq('id', userId));
  }
  if (error) { console.error('updateProfile failed', error); throw error; }
}

// Keeps name/avatar in the auth session metadata so they show app-wide (header, composer…).
export async function syncAuthMeta(meta) {
  const { error } = await supabase.auth.updateUser({ data: meta });
  if (error) console.error('syncAuthMeta failed', error);
}

export async function uploadProfileImage(userId, file, kind) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${kind}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) { console.error('uploadProfileImage failed', error); throw error; }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// Rich-message columns (supabase_message_media.sql). Selects fall back to the base set
// until that migration runs, so DMs keep working with text-only.
const MSG_JOINS = 'sender:profiles!messages_sender_id_fkey(id, name, avatar_url), recipient:profiles!messages_recipient_id_fkey(id, name, avatar_url)';
const MSG_FULL  = `id, sender_id, recipient_id, text, media, reply_to, reactions, deleted_for, deleted, forwarded, read, created_at, ${MSG_JOINS}`;
const MSG_BASE  = `id, sender_id, recipient_id, text, read, created_at, ${MSG_JOINS}`;
const MSG_ROW   = 'id, sender_id, recipient_id, text, media, reply_to, reactions, deleted_for, deleted, forwarded, read, created_at';
const msgColMissing = e => /column|schema cache|does not exist/i.test(e?.message || '');

// Returns { [peerId]: { peer:{id,name,avatar_url}, messages:[...], unread:n } }
export async function fetchConversations(userId) {
  const q = sel => supabase.from('messages').select(sel)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true }).limit(500);
  let { data, error } = await q(MSG_FULL);
  if (error && msgColMissing(error)) ({ data, error } = await q(MSG_BASE));
  if (error) { console.error('fetchConversations failed', error); return {}; }
  const convs = {};
  for (const m of data || []) {
    if (Array.isArray(m.deleted_for) && m.deleted_for.includes(userId)) continue; // hidden for me
    const mine   = m.sender_id === userId;
    const peer   = mine ? m.recipient : m.sender;
    if (!peer) continue;
    if (!convs[peer.id]) convs[peer.id] = { peer, messages: [], unread: 0 };
    convs[peer.id].messages.push(m);
    if (!mine && !m.read) convs[peer.id].unread++;
  }
  return convs;
}

// opts: { text, media, replyTo, forwarded }
export async function sendMessage(senderId, recipientId, opts = {}) {
  const { text = '', media = null, replyTo = null, forwarded = false } =
    typeof opts === 'string' ? { text: opts } : (opts || {});
  const row = { sender_id: senderId, recipient_id: recipientId, text: text || null, media, reply_to: replyTo, forwarded };
  let res = await supabase.from('messages').insert(row).select(MSG_ROW).single();
  if (res.error && msgColMissing(res.error)) {
    // Pre-migration: store something non-null so the message still sends.
    const fallbackText = text || (media?.length ? '[attachment]' : '');
    res = await supabase.from('messages')
      .insert({ sender_id: senderId, recipient_id: recipientId, text: fallbackText })
      .select('id, sender_id, recipient_id, text, read, created_at').single();
  }
  if (res.error) { console.error('sendMessage failed', res.error); throw res.error; }
  return res.data;
}

// Toggle the current user's reaction emoji on a message; returns the new reactions map.
export async function toggleMessageReaction(messageId, emoji, userId, reactions = {}) {
  const next = { ...(reactions || {}) };
  const set = new Set(next[emoji] || []);
  set.has(userId) ? set.delete(userId) : set.add(userId);
  if (set.size) next[emoji] = [...set]; else delete next[emoji];
  const { error } = await supabase.from('messages').update({ reactions: next }).eq('id', messageId);
  if (error && !msgColMissing(error)) console.error('toggleMessageReaction failed', error);
  return next;
}

// Delete-for-me: hide a message from the listed user ids' own view.
export async function setMessageDeletedFor(messageId, deletedFor) {
  const { error } = await supabase.from('messages').update({ deleted_for: deletedFor }).eq('id', messageId);
  if (error && !msgColMissing(error)) console.error('setMessageDeletedFor failed', error);
}

// Delete-for-everyone: flip the tombstone flag (both parties then see "This message was deleted").
export async function setMessageDeleted(messageId, deleted) {
  const { error } = await supabase.from('messages').update({ deleted }).eq('id', messageId);
  if (error && !msgColMissing(error)) console.error('setMessageDeleted failed', error);
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

// ── Connections + network ───────────────────────────────────────────────────────
const connMissing = e => /relation|does not exist|schema cache|connections|profile_views/i.test(e?.message || '');

// Returns { accepted:Set<otherId>, outgoing:Set, incoming:Set } for the user.
export async function fetchConnectionState(userId) {
  const empty = { accepted: new Set(), outgoing: new Set(), incoming: new Set() };
  if (!userId) return empty;
  const { data, error } = await supabase
    .from('connections').select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) { if (!connMissing(error)) console.error('fetchConnectionState failed', error); return empty; }
  const out = { accepted: new Set(), outgoing: new Set(), incoming: new Set() };
  for (const r of data || []) {
    const other = r.requester_id === userId ? r.addressee_id : r.requester_id;
    if (r.status === 'accepted') out.accepted.add(other);
    else if (r.requester_id === userId) out.outgoing.add(other);
    else out.incoming.add(other);
  }
  return out;
}

export async function sendConnect(userId, targetId, note = '') {
  const { error } = await supabase.from('connections').insert({ requester_id: userId, addressee_id: targetId, status: 'pending', note });
  if (error && error.code !== '23505') console.error('sendConnect failed', error);
}

export async function respondConnection(userId, requesterId, accept) {
  const q = accept
    ? supabase.from('connections').update({ status: 'accepted' }).eq('requester_id', requesterId).eq('addressee_id', userId)
    : supabase.from('connections').delete().eq('requester_id', requesterId).eq('addressee_id', userId);
  const { error } = await q;
  if (error) console.error('respondConnection failed', error);
}

export async function removeConnection(userId, otherId) {
  const { error } = await supabase.from('connections')
    .delete().or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`);
  if (error) console.error('removeConnection failed', error);
}

export async function fetchConnectionRequests(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.from('connections')
    .select('note, created_at, person:profiles!connections_requester_id_fkey(id, name, avatar_url, bio)')
    .eq('addressee_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
  if (error) { if (!connMissing(error)) console.error('fetchConnectionRequests failed', error); return []; }
  return (data || []).map(r => ({ ...r.person, note: r.note, requested_at: r.created_at })).filter(p => p?.id);
}

export async function fetchConnectionCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase.from('connections')
    .select('*', { count: 'exact', head: true }).eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) return 0;
  return count ?? 0;
}

export async function fetchConnections(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.from('connections')
    .select('requester_id, addressee_id, requester:profiles!connections_requester_id_fkey(id, name, avatar_url, bio), addressee:profiles!connections_addressee_id_fkey(id, name, avatar_url, bio)')
    .eq('status', 'accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) { if (!connMissing(error)) console.error('fetchConnections failed', error); return []; }
  return (data || []).map(r => (r.requester_id === userId ? r.addressee : r.requester)).filter(Boolean);
}

export async function recordProfileView(viewerId, viewedId) {
  if (!viewerId || !viewedId || viewerId === viewedId) return;
  const { error } = await supabase.from('profile_views')
    .upsert({ viewer_id: viewerId, viewed_id: viewedId, created_at: new Date().toISOString() }, { onConflict: 'viewer_id,viewed_id' });
  if (error && !connMissing(error)) console.error('recordProfileView failed', error);
}

export async function fetchProfileViewers(userId) {
  if (!userId) return { count: 0, viewers: [] };
  const { data, error } = await supabase.from('profile_views')
    .select('created_at, viewer:profiles!profile_views_viewer_id_fkey(id, name, avatar_url, bio)')
    .eq('viewed_id', userId).order('created_at', { ascending: false }).limit(20);
  if (error) { if (!connMissing(error)) console.error('fetchProfileViewers failed', error); return { count: 0, viewers: [] }; }
  const viewers = (data || []).map(r => ({ ...r.viewer, viewed_at: r.created_at })).filter(v => v?.id);
  return { count: viewers.length, viewers };
}

export async function fetchPeopleYouMayKnow(userId, excludeIds = []) {
  if (!userId) return [];
  const { data, error } = await supabase.from('profiles').select('id, name, avatar_url, bio').neq('id', userId).limit(40);
  if (error) { console.error('fetchPeopleYouMayKnow failed', error); return []; }
  const ex = new Set([userId, ...excludeIds]);
  return (data || []).filter(p => !ex.has(p.id)).slice(0, 6);
}

// ── Notifications ──────────────────────────────────────────────────────────────
const notifMissing = e => /relation|does not exist|notifications|schema cache/i.test(e?.message || '');

export async function createNotification({ actorId, userId, type, postId = null, data = {} }) {
  if (!actorId || !userId || actorId === userId) return;
  const { error } = await supabase.from('notifications').insert({ actor_id: actorId, user_id: userId, type, post_id: postId, data });
  if (error && !notifMissing(error)) console.error('createNotification failed', error);
}

export async function fetchNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, post_id, data, read, created_at, actor:profiles!notifications_actor_id_fkey(id, name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) { if (!notifMissing(error)) console.error('fetchNotifications failed', error); return []; }
  return (data || []).map(n => ({ ...n, actor: n.actor || {} }));
}

export async function markNotificationsRead(userId) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error && !notifMissing(error)) console.error('markNotificationsRead failed', error);
}

// handlers: a function (legacy = onInsert only) or { onInsert, onUpdate }.
// onInsert fires for incoming messages; onUpdate fires when a message I sent OR received
// changes (read receipt, reaction, unsend/delete).
export function subscribeToMessages(userId, handlers) {
  const onInsert = typeof handlers === 'function' ? handlers : handlers?.onInsert;
  const onUpdate = typeof handlers === 'function' ? null      : handlers?.onUpdate;
  const t = 'messages', schema = 'public';
  const channel = supabase.channel(`dm_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema, table: t, filter: `recipient_id=eq.${userId}` }, p => onInsert?.(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema, table: t, filter: `recipient_id=eq.${userId}` }, p => onUpdate?.(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema, table: t, filter: `sender_id=eq.${userId}` },    p => onUpdate?.(p.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ── Realtime community streams (websockets) ──────────────────────────────────
// Feed-level changes: any new/edited/deleted post, rating, comment, or poll vote.
// Fires onChange(payload) so the caller can refresh — needs supabase_realtime_community.sql.
export function subscribeToCommunity(onChange) {
  const ch = supabase.channel('community_live');
  for (const table of ['community_posts', 'community_ratings', 'community_suggestions', 'poll_votes'])
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, p => onChange(p));
  ch.subscribe();
  return () => supabase.removeChannel(ch);
}

// Bell stream: my new notifications + any follow change (incoming requests / accepts).
// onChange('notif' | 'follow') tells the caller which to refresh.
export function subscribeToInbox(userId, onChange) {
  const ch = supabase.channel(`inbox_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => onChange('notif'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => onChange('follow'))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// Live comments for one open thread (new replies + like changes).
export function subscribeToThread(postId, onChange) {
  const ch = supabase.channel(`thread_${postId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_suggestions', filter: `post_id=eq.${postId}` }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestion_likes' }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// Lightweight typing indicator over a broadcast channel shared by the two users.
// Returns { send(typing:boolean), unsub() }.
export function subscribeTyping(userId, peerId, onTyping) {
  const key = ['dmtype', ...[userId, peerId].sort()].join('_');
  const channel = supabase.channel(key, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload?.from === peerId) onTyping(!!payload.typing); })
    .subscribe();
  return {
    send: typing => channel.send({ type: 'broadcast', event: 'typing', payload: { from: userId, typing } }),
    unsub: () => supabase.removeChannel(channel),
  };
}

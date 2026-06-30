import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchConversations, sendMessage, subscribeToMessages, markConversationRead } from './communityDB';

// A self-contained DM overlay so an investor can "Express Interest" / message a founder WITHOUT
// being routed into the founder community feed. Reuses the same `messages` table + realtime as
// Community's DM panel, but as a focused single-peer chat that floats over the investor surface
// (deal-flow or deal-page). Mirrors the BUG-007 "message request" rule (one message until the
// other side replies). Requires a signed-in user — App gates that before opening.

const F = 'var(--font)';
const FD = 'var(--font-display)';

const AV_COLORS = ['#0f172a', '#1f2937', '#334155', '#374151', '#475569', '#111827', '#1e293b', '#3f3f46'];
const avColor = id => AV_COLORS[(String(id || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AV_COLORS.length];
const initials = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const clockTime = d => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function Avatar({ name, id, url, sz = 38 }) {
  if (url) return <img src={url} alt="" style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div aria-hidden="true" style={{ width: sz, height: sz, borderRadius: '50%', background: avColor(id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: sz * 0.38, flexShrink: 0, fontFamily: F }}>
      {initials(name)}
    </div>
  );
}

export default function MessageModal({ user, peer, onClose }) {
  const peerId = peer?.id || null;
  const peerName = peer?.name || 'Founder';
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Load the existing thread with this peer (if any) + mark it read.
  useEffect(() => {
    if (!user || !peerId) return undefined;
    let on = true;
    fetchConversations(user.id)
      .then(convs => { if (on) { setMsgs(convs[peerId]?.messages || []); setLoading(false); } })
      .catch(() => { if (on) setLoading(false); });
    markConversationRead(user.id, peerId).catch(() => {});
    return () => { on = false; };
  }, [user, peerId]);

  // Realtime: append the founder's replies + reflect their edits/deletes.
  useEffect(() => {
    if (!user || !peerId) return undefined;
    const unsub = subscribeToMessages(user.id, {
      onInsert: m => {
        if (m.sender_id !== peerId) return;
        setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
        markConversationRead(user.id, peerId).catch(() => {});
      },
      onUpdate: m => setMsgs(prev => prev.map(x => (x.id === m.id ? { ...x, ...m } : x))),
    });
    return unsub;
  }, [user, peerId]);

  // Keep the latest message in view + focus the composer on open.
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, loading]);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);

  // Esc closes.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // BUG-007 message request: if the founder hasn't replied yet, the investor can send only one
  // message until they do (the DB trigger enforces it too — this just avoids a doomed send).
  const peerReplied = msgs.some(m => m.sender_id === peerId);
  const myCount = msgs.filter(m => m.sender_id === user?.id).length;
  const isRequest = !peerReplied;
  const requestLocked = isRequest && myCount >= 1;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || requestLocked || !user || !peerId) return;
    setSending(true); setErr('');
    try {
      const row = await sendMessage(user.id, peerId, { text });
      setMsgs(prev => [...prev, row]);
      setInput('');
    } catch (e) {
      const m = e?.message || '';
      if (/request|follow|one message|policy|denied|row-level/i.test(m)) setErr(`You can send one message until ${peerName} replies.`);
      else setErr('Could not send — please try again.');
    } finally {
      setSending(false);
    }
  }, [input, sending, requestLocked, user, peerId, peerName]);

  const onKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const visible = msgs.filter(m => !(Array.isArray(m.deleted_for) && m.deleted_for.includes(user?.id)));

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Message ${peerName}`}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 'clamp(0px,4vw,32px)', fontFamily: F }}
    >
      <style>{`@media (min-width:560px){ .dm-shell{ align-self:center } } @keyframes dmIn{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}`}</style>
      <div className="dm-shell" style={{ width: 'min(440px, 100%)', height: 'min(620px, 92vh)', background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'dmIn .18s var(--ease)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <Avatar name={peerName} id={peerId} url={peer?.avatar_url} sz={40} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peerName}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Direct message</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--ink-2)', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Messages */}
        <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 14px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ margin: 'auto', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 280, color: 'var(--ink-2)' }}>
              <div aria-hidden="true" style={{ fontSize: 30, marginBottom: 10 }}>✦</div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15, marginBottom: 6 }}>Express your interest</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>Introduce yourself to {peerName} and say what caught your eye about the pitch.</div>
            </div>
          ) : (
            visible.map(m => {
              const mine = m.sender_id === user?.id;
              const deleted = m.deleted;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '78%', padding: '9px 13px', borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, background: mine ? 'var(--ink)' : 'var(--surface)', color: mine ? '#fff' : 'var(--ink)', border: mine ? 'none' : '1px solid var(--line)', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {deleted
                      ? <span style={{ fontStyle: 'italic', opacity: .6 }}>This message was deleted</span>
                      : (m.text || (m.media?.length ? '[attachment]' : ''))}
                    <div style={{ fontSize: 10.5, marginTop: 4, textAlign: 'right', color: mine ? 'rgba(255,255,255,.55)' : 'var(--ink-3)' }}>
                      {clockTime(m.created_at)}{mine && m.read ? ' · Seen' : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Request note + composer */}
        {isRequest && (
          <div style={{ padding: '9px 14px', fontSize: 12, color: 'var(--ink-2)', background: 'var(--accent-weak)', borderTop: '1px solid var(--line)', lineHeight: 1.5, flexShrink: 0 }}>
            {requestLocked
              ? `Message request sent. You can send another once ${peerName} replies.`
              : `You're not connected — this sends as a message request. You can send one message until ${peerName} replies.`}
          </div>
        )}
        {err && <div style={{ padding: '8px 14px', fontSize: 12.5, color: '#b91c1c', background: '#fef2f2', borderTop: '1px solid var(--line)', flexShrink: 0 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '11px 12px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending || requestLocked}
            rows={1}
            maxLength={2000}
            placeholder={requestLocked ? 'Waiting for a reply…' : `Message ${peerName}…`}
            style={{ flex: 1, minWidth: 0, resize: 'none', maxHeight: 110, border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '10px 13px', fontSize: 14, fontFamily: F, outline: 'none', background: requestLocked ? 'var(--bg)' : 'var(--surface)', color: 'var(--ink)', lineHeight: 1.4, boxSizing: 'border-box' }}
          />
          <button
            onClick={send}
            disabled={sending || requestLocked || !input.trim()}
            aria-label="Send message"
            style={{ height: 42, padding: '0 18px', borderRadius: 'var(--r)', border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: (sending || requestLocked || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (sending || requestLocked || !input.trim()) ? .45 : 1, flexShrink: 0 }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
